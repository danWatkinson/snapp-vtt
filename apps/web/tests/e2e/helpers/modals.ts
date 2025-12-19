import { Page, expect } from "@playwright/test";
import { MODAL_OPENED_EVENT, MODAL_CLOSED_EVENT } from "../../../lib/auth/authEvents";
import { MODAL_DIALOG_NAMES, DEFAULT_EVENT_TIMEOUT, STABILITY_WAIT_MEDIUM, VISIBILITY_TIMEOUT_SHORT, VISIBILITY_TIMEOUT_MEDIUM, VISIBILITY_TIMEOUT_LONG, VISIBILITY_TIMEOUT_EXTRA } from "./constants";
import { isVisibleSafely, isHiddenSafely, awaitSafely, safeWait } from "./utils";

/**
 * Wait for a modal to open using transition events.
 * This is more reliable than polling for element visibility.
 * 
 * @param page - Playwright page object
 * @param modalType - Type of modal to wait for (e.g., "login", "world", "campaign")
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForModalOpen(
  page: Page,
  modalType: string,
  timeout: number = DEFAULT_EVENT_TIMEOUT
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ type, timeout }) => {
      return new Promise<void>((resolve, reject) => {
        // Set up listener first, before checking if modal is already open
        // This ensures we don't miss the event if it fires immediately
        let resolved = false;
        
        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          if (customEvent.detail?.modalType === type && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener("snapp:modal-opened", handler);
            resolve();
          }
        };

        window.addEventListener("snapp:modal-opened", handler);

        // Check if modal is already open (might have opened before listener was set up)
        // Use a small delay to let any pending events fire
        setTimeout(() => {
          if (resolved) return;
          
          const dialogs = document.querySelectorAll('[role="dialog"]');
          for (const dialog of dialogs) {
            const isVisible = dialog instanceof HTMLElement && 
              (dialog.offsetParent !== null || dialog.style.display !== "none");
            if (isVisible) {
              // Modal appears to be open - check if it matches our type
              const ariaLabel = dialog.getAttribute("aria-label")?.toLowerCase() || "";
              const textContent = dialog.textContent?.toLowerCase() || "";
              if (ariaLabel.includes(type) || textContent.includes(type) || type === "login") {
                resolved = true;
                clearTimeout(timer);
                window.removeEventListener("snapp:modal-opened", handler);
                resolve();
                return;
              }
            }
          }
        }, 50);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener("snapp:modal-opened", handler);
            reject(new Error(`Timeout waiting for modal "${type}" to open after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { type: modalType, timeout }
  );

  // Also wait for the dialog to actually be visible (fallback)
  const dialogPromise = (async () => {
    const dialogName = MODAL_DIALOG_NAMES[modalType] || "dialog";
    const dialog = page.getByRole("dialog", { name: new RegExp(dialogName, "i") });
    await expect(dialog).toBeVisible({ timeout });
  })();

  // Wait for the dialog to be visible (required)
  // Also wait for the event if it fires (optional - event might fire before listener is set up)
  // The dialog visibility is the most important check
  try {
    // Wait for dialog first (required), and event if available (optional)
    await Promise.all([
      dialogPromise, // Dialog visibility is required - this must succeed
      eventPromise.catch(() => {
        // Event might not fire, but dialog might be visible - that's okay
        return Promise.resolve();
      })
    ]);
  } catch (error) {
    // If dialog check failed, try waiting just for the dialog again
    // (event might have fired before listener was set up, but dialog should still appear)
    try {
      await dialogPromise;
    } catch (dialogError) {
      // Dialog didn't appear - check if we're logged in (for login modal)
      if (modalType === "login") {
        const logoutButton = page.getByRole("button", { name: "Log out" });
        const isLoggedIn = await isVisibleSafely(logoutButton);
        if (isLoggedIn) {
          // We're logged in - that's fine, modal doesn't need to open
          return;
        }
      }
      // Dialog didn't appear and we're not logged in - throw error
      throw error; // Throw the original error which has more context
    }
  }
  
  // For login modal specifically, also wait for the form field to be available
  // This ensures the form content is fully rendered
  // Use a longer timeout since form content might take time to render
  if (modalType === "login") {
    const usernameInput = page.getByTestId("login-username");
    const passwordInput = page.getByTestId("login-password");
    
    try {
      // Wait for both form fields to be visible and enabled
      // Parallelize checks for better performance
      await Promise.all([
        expect(usernameInput).toBeVisible({ timeout: VISIBILITY_TIMEOUT_LONG }),
        expect(passwordInput).toBeVisible({ timeout: VISIBILITY_TIMEOUT_LONG }),
        expect(usernameInput).toBeEnabled({ timeout: VISIBILITY_TIMEOUT_SHORT }),
        expect(passwordInput).toBeEnabled({ timeout: VISIBILITY_TIMEOUT_SHORT })
      ]);
      
      // Small stability wait to ensure form is fully ready
      await safeWait(page, STABILITY_WAIT_MEDIUM);
    } catch (error) {
      // Form field didn't appear - check if dialog is still visible
      const loginDialog = page.getByRole("dialog", { name: "Login" });
      const dialogVisible = await isVisibleSafely(loginDialog);
      if (!dialogVisible) {
        // Dialog closed - might have logged in automatically or something else happened
        throw error;
      }
      // Dialog is visible but form field isn't - wait for it to appear with retry
      // Use longer timeout for retry since form might be slow to render
      // Parallelize checks for better performance
      try {
        await Promise.all([
          expect(usernameInput).toBeVisible({ timeout: VISIBILITY_TIMEOUT_EXTRA }),
          expect(passwordInput).toBeVisible({ timeout: VISIBILITY_TIMEOUT_EXTRA }),
          expect(usernameInput).toBeEnabled({ timeout: VISIBILITY_TIMEOUT_MEDIUM }),
          expect(passwordInput).toBeEnabled({ timeout: VISIBILITY_TIMEOUT_MEDIUM })
        ]);
      } catch (retryError) {
        // Form fields still didn't appear - this is a real error
        throw new Error(
          `Login modal opened but form fields did not appear. Dialog visible: ${dialogVisible}. ` +
          `Original error: ${error instanceof Error ? error.message : String(error)}. ` +
          `Retry error: ${retryError instanceof Error ? retryError.message : String(retryError)}`
        );
      }
    }
  }
}

/**
 * Wait for a modal to close using transition events.
 * This is more reliable than polling for element visibility.
 * 
 * @param page - Playwright page object
 * @param modalType - Type of modal to wait for (e.g., "login", "world", "campaign")
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForModalClose(
  page: Page,
  modalType: string,
  timeout: number = DEFAULT_EVENT_TIMEOUT
): Promise<void> {
  // Set up event listener
  const eventPromise = page.evaluate(
    ({ type, timeout }) => {
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          window.removeEventListener("snapp:modal-closed", handler);
          reject(new Error(`Timeout waiting for modal "${type}" to close after ${timeout}ms`));
        }, timeout);

        const handler = (e: CustomEvent) => {
          if (e.detail.modalType === type) {
            clearTimeout(timer);
            window.removeEventListener("snapp:modal-closed", handler);
            resolve();
          }
        };

        window.addEventListener("snapp:modal-closed", handler);
      });
    },
    { type: modalType, timeout }
  );

  // Also wait for the dialog to actually be hidden (fallback)
  const dialogPromise = (async () => {
    const dialogName = MODAL_DIALOG_NAMES[modalType] || "dialog";
    const dialog = page.getByRole("dialog", { name: new RegExp(dialogName, "i") });
    // Use the full timeout for the dialog check since we're racing with the event
    // The event might not fire, so we need to give the dialog check enough time
    await dialog.waitFor({ state: "hidden", timeout });
  })();

  // Wait for EITHER the event OR the dialog to be hidden
  // If the event fires, great. If not, check if dialog is hidden anyway
  try {
    await Promise.race([
      eventPromise,
      dialogPromise
    ]);
  } catch (error) {
    // If both timed out, check if dialog is hidden anyway
    // This handles cases where the dialog is closing but took longer than expected
    const dialogName = MODAL_DIALOG_NAMES[modalType] || "dialog";
    const dialog = page.getByRole("dialog", { name: new RegExp(dialogName, "i") });
    const isHidden = await isHiddenSafely(dialog, 1000); // Give it a moment to check
    if (isHidden) {
      return; // Dialog is hidden, that's good enough
    }
    throw error; // Neither event nor dialog hidden, rethrow
  }
}

/**
 * Close a modal dialog if it's open.
 * This is a utility to safely close modals after errors or when they should be closed.
 * 
 * @param page - Playwright page object
 * @param modalType - Type of modal (e.g., "world", "campaign", "entity")
 * @param dialogName - Optional dialog name pattern (defaults to modal type mapping)
 * @param timeout - Maximum time to wait for modal close (default: 2000)
 */
export async function closeModalIfOpen(
  page: Page,
  modalType: string,
  dialogName?: string | RegExp,
  timeout: number = 2000
): Promise<void> {
  // Map modal type to dialog name if not provided
  const dialogNamePattern = dialogName || MODAL_DIALOG_NAMES[modalType] || "dialog";
  const dialog = typeof dialogNamePattern === "string" 
    ? page.getByRole("dialog", { name: new RegExp(dialogNamePattern, "i") })
    : page.getByRole("dialog", { name: dialogNamePattern });
  
  const isOpen = await isVisibleSafely(dialog);
  if (!isOpen) {
    return; // Modal is already closed
  }
  
  // Try to find and click cancel button
  const cancelButton = dialog.getByRole("button", { name: "Cancel" });
  const cancelVisible = await isVisibleSafely(cancelButton);
  
  if (cancelVisible) {
    await cancelButton.click();
    await awaitSafely(waitForModalClose(page, modalType, timeout));
  } else {
    // Fallback: try Escape key
    await page.keyboard.press("Escape");
    await awaitSafely(waitForModalClose(page, modalType, timeout));
  }
}
