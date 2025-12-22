import { Page, expect } from "@playwright/test";
import { ERROR_OCCURRED_EVENT, ERROR_CLEARED_EVENT } from "../../../lib/auth/authEvents";
import { DEFAULT_EVENT_TIMEOUT } from "./constants";
import { waitForSimpleEvent, isVisibleSafely, isHiddenSafely } from "./utils";
import { closeModalIfOpen } from "./modals";

/**
 * Wait for an error to occur using transition events.
 * Returns the error message when the error appears.
 * 
 * @param page - Playwright page object
 * @param expectedMessage - Optional partial message to match (if not provided, waits for any error)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns The error message that occurred
 */
export async function waitForError(
  page: Page,
  expectedMessage?: string,
  timeout: number = DEFAULT_EVENT_TIMEOUT
): Promise<string> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ timeout, eventName, expectedMessage }) => {
      return new Promise<string>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const errorMessage = (customEvent.detail?.message || "").trim();
          
          // If expectedMessage is provided, check if it's contained in the error message
          // Otherwise, accept any error
          if (errorMessage && (!expectedMessage || errorMessage.toLowerCase().includes(expectedMessage.toLowerCase())) && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve(errorMessage);
          }
        };

        window.addEventListener(eventName, handler);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for error${expectedMessage ? ` containing "${expectedMessage}"` : ""} after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { timeout, eventName: ERROR_OCCURRED_EVENT, expectedMessage }
  );

  // Fallback: Wait for error message element to appear in DOM
  const domPromise = (async () => {
    const errorElement = page.getByTestId("error-message");
    await expect(errorElement).toBeVisible({ timeout });
    const errorText = await errorElement.textContent();
    return errorText?.trim() || "";
  })();

  // Wait for EITHER the event OR the DOM element
  return await Promise.race([
    eventPromise,
    domPromise
  ]).catch(async (error) => {
    // If both failed, check if error element exists anyway
    const errorElement = page.getByTestId("error-message");
    const isVisible = await isVisibleSafely(errorElement);
    if (isVisible) {
      const errorText = await errorElement.textContent();
      const message = errorText?.trim() || "";
      if (!expectedMessage || message.toLowerCase().includes(expectedMessage.toLowerCase())) {
        return message; // Error is visible and matches, that's good enough
      }
    }
    throw error; // Neither event nor DOM, rethrow
  });
}

/**
 * Wait for an error to be cleared using transition events.
 * 
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForErrorCleared(
  page: Page,
  timeout: number = DEFAULT_EVENT_TIMEOUT
): Promise<void> {
  await waitForSimpleEvent(
    page,
    ERROR_CLEARED_EVENT,
    timeout,
    async () => {
      // Fallback: Wait for error message element to be hidden
      const errorElement = page.getByTestId("error-message");
      await expect(errorElement).toBeHidden({ timeout });
    }
  ).catch(async (error) => {
    // If both failed, check if error element is hidden anyway
    const errorElement = page.getByTestId("error-message");
    const isHidden = await isHiddenSafely(errorElement);
    if (isHidden) {
      return; // Error is hidden, that's good enough
    }
    throw error; // Neither event nor DOM, rethrow
  });
}

/**
 * Handle "already exists" errors by closing the modal and returning.
 * Throws if the error is not an "already exists" error.
 * 
 * @param page - Playwright page object
 * @param errorText - The error message text
 * @param modalType - Type of modal to close (e.g., "world", "campaign")
 * @param dialogName - Optional dialog name pattern
 * @throws Error if the error is not an "already exists" error
 */
export async function handleAlreadyExistsError(
  page: Page,
  errorText: string | null,
  modalType: string,
  dialogName?: string | RegExp
): Promise<void> {
  if (!errorText) {
    throw new Error("No error text provided");
  }
  
  const isAlreadyExists = 
    errorText.includes("already exists") || 
    errorText.includes("duplicate") ||
    errorText.includes("409");
  
  if (isAlreadyExists) {
    // Close the modal - entity already exists, that's fine
    await closeModalIfOpen(page, modalType, dialogName);
    return; // Return successfully - entity exists
  }
  
  // Not an "already exists" error - throw
  throw new Error(`Operation failed: ${errorText}`);
}

/**
 * Check if an error message is currently visible in the UI.
 * 
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 * @returns True if error message is visible, false otherwise
 */
export async function hasErrorMessage(
  page: Page,
  timeout: number = 1000
): Promise<boolean> {
  const errorElement = page.getByTestId("error-message");
  return await isVisibleSafely(errorElement, timeout);
}

/**
 * Get the error message text if it's visible in the UI.
 * 
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 * @returns The error message text, or null if no error is visible
 */
export async function getErrorMessage(
  page: Page,
  timeout: number = 1000
): Promise<string | null> {
  const hasError = await hasErrorMessage(page, timeout);
  if (!hasError) {
    return null;
  }
  
  const errorElement = page.getByTestId("error-message");
  const errorText = await errorElement.textContent().catch(() => null);
  return errorText?.trim() || null;
}

/**
 * Check for error message after an operation and throw if found.
 * Useful for form submissions and other operations that may fail.
 * 
 * @param page - Playwright page object
 * @param operationName - Name of the operation (for error message)
 * @param timeout - Maximum time to wait for error in milliseconds (default: 3000)
 * @throws Error if an error message is found
 */
export async function checkForErrorAndThrow(
  page: Page,
  operationName: string,
  timeout: number = 3000
): Promise<void> {
  const errorText = await getErrorMessage(page, timeout);
  if (errorText) {
    throw new Error(`${operationName} failed: ${errorText}`);
  }
}
