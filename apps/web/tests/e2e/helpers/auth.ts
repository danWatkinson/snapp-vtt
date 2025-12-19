import { Page, expect } from "@playwright/test";
import { waitForModalOpen, waitForModalClose } from "./modals";
import { isVisibleSafely, isHiddenSafely, waitForLoadStateSafely, createTimeoutPromise, awaitSafely } from "./utils";
import { STABILITY_WAIT_MEDIUM, STABILITY_WAIT_LONG } from "./constants";

/**
 * Safely wait for a timeout, checking if page is closed.
 * Simplified version that just checks if page is closed before waiting.
 * 
 * @param page - Playwright page object
 * @param ms - Milliseconds to wait (capped at 2000ms to avoid test timeouts)
 */
async function safeWait(page: Page, ms: number) {
  // Quick check if page is closed - if so, don't wait
  try {
    if (page.isClosed()) {
      return;
    }
  } catch {
    // Can't check if closed - assume it's in a bad state, just return
    return;
  }
  
  // Cap the wait to avoid test timeout issues
  const cappedMs = Math.min(ms, 2000);
  
  try {
    await page.waitForTimeout(cappedMs);
  } catch (error) {
    // If wait fails (e.g., page closed during wait), just return silently
    // The calling code will handle any issues that arise
    return;
  }
}

/**
 * Helper to ensure login dialog is closed (it blocks clicks if open)
 */
export async function ensureLoginDialogClosed(page: Page) {
  const loginDialog = page.getByRole("dialog", { name: "Login" });
  const loginDialogVisible = await isVisibleSafely(loginDialog);
  
  if (loginDialogVisible) {
    // Dialog is open - try to close it
    try {
      const closeButton = loginDialog.getByRole("button", { name: "Close login" });
      const closeButtonVisible = await isVisibleSafely(closeButton);
      if (closeButtonVisible) {
        await closeButton.click();
      } else {
        // Try Escape key
        await page.keyboard.press("Escape");
      }
      // Wait for dialog to close
      // Wait for dialog to be hidden, but don't fail if it doesn't happen
      try {
        await loginDialog.waitFor({ state: "hidden", timeout: 3000 });
      } catch {
        // Dialog might already be hidden or might not hide - that's okay
      }
    } catch {
      // If closing fails, that's okay - continue anyway
    }
  }
}

/**
 * Helper function to log in a user before accessing the application.
 * This should be called at the start of any test that needs authentication.
 */
export async function loginAs(page: Page, username: string, password: string) {
  // Check if page is closed before attempting navigation
  if (page.isClosed()) {
    throw new Error("Page was closed before login attempt");
  }
  
  // Check if we're already on the home page before navigating
  let currentUrl: string;
  try {
    currentUrl = page.url();
  } catch {
    // Can't get URL - page might be in bad state, try navigation anyway
    currentUrl = "";
  }
  
  const isOnHomePage = currentUrl.endsWith("/") || currentUrl.endsWith("localhost:3000/") || currentUrl.includes("localhost:3000/");
  
  if (!isOnHomePage) {
    // Only navigate if we're not already on the home page
    try {
      await page.goto("/", { waitUntil: "domcontentloaded", timeout: 3000 });
    } catch (error: any) {
      // If navigation times out, check if we're already on the page or if page is usable
      if (page.isClosed()) {
        throw new Error("Page was closed during navigation");
      }
      
      try {
        const urlAfterTimeout = page.url();
        if (urlAfterTimeout.includes("localhost:3000")) {
          // We're on the page, continue
        } else {
          // Not on the page and navigation failed - this is an error
          throw new Error(`Navigation to "/" timed out. Current URL: ${urlAfterTimeout}`);
        }
      } catch (urlError: any) {
        // Can't get URL - page might be in bad state
        if (urlError.message?.includes("closed") || page.isClosed()) {
          throw new Error("Page was closed or is in bad state during navigation");
        }
        // If we can't get URL but page isn't closed, try to continue
        // The page might still be usable
      }
    }
  }
  
  // Always wait for page to be fully interactive before trying to click login button
  // This is especially important after clearing cookies/storage (like in auth-roles test)
  // The page might need time to re-render and make the Login button available
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: 3000 });
    // Small additional wait to ensure React has rendered and buttons are interactive
    await page.waitForTimeout(STABILITY_WAIT_LONG);
  } catch {
    // If wait fails, that's okay - page might already be loaded
    // But still add a small wait for React to render
    await page.waitForTimeout(STABILITY_WAIT_LONG);
  }
  
  // Check if already logged in - if so, log out first using the logout button
  // The logout button clears the token and dispatches AUTH_EVENT (no page reload)
  const logoutButton = page.getByRole("button", { name: "Log out" });
  const isLoggedIn = await isVisibleSafely(logoutButton);
  if (isLoggedIn) {
    // Click logout button - this clears localStorage and dispatches AUTH_EVENT
    // No navigation happens, just state updates
    await logoutButton.click();
    // Wait for the UI to update (Login button should appear, logout button should disappear)
    // Use a longer timeout and be more defensive
    try {
      await Promise.race([
        page.getByRole("button", { name: "Login" }).waitFor({ state: "visible", timeout: 3000 }),
        createTimeoutPromise(5000) // Fallback timeout
      ]);
    } catch {
      // If wait fails, that's okay - continue anyway
    }
  }
  
  // Check if we're already logged in BEFORE trying to open login dialog
  const checkLogoutButtonBefore = page.getByRole("button", { name: "Log out" });
  const alreadyLoggedInBefore = await isVisibleSafely(checkLogoutButtonBefore);
  if (alreadyLoggedInBefore) {
    // Already logged in, no need to show login dialog
    return;
  }
  
  // Open login modal via banner Login button
  // After clearing cookies/storage (like in auth-roles test), the page needs time to render
  // Wait for Login button to be visible, enabled, and stable before clicking
  const loginButton = page.getByRole("button", { name: "Login" });
  
  // Wait for button to be visible and enabled - this is critical after page navigation/refresh
  await expect(loginButton).toBeVisible({ timeout: 5000 });
  await expect(loginButton).toBeEnabled({ timeout: 3000 });
  
  // Small stability wait to ensure button is fully interactive
  // This is especially important after clearing cookies/storage
  await page.waitForTimeout(STABILITY_WAIT_LONG);
  
  // Check if we're already logged in (button might have changed)
  const checkLogoutButtonBeforeClick = page.getByRole("button", { name: "Log out" });
  const alreadyLoggedInBeforeClick = await isVisibleSafely(checkLogoutButtonBeforeClick, 500);
  if (alreadyLoggedInBeforeClick) {
    // Already logged in, no need to show login dialog
    return;
  }
  
  // Set up the listener BEFORE clicking to avoid race conditions
  const modalOpenPromise = waitForModalOpen(page, "login", 8000).catch(() => null);
  
  // Click the login button
  await loginButton.click();
  
    // Wait for login modal to open using transition event
    // Double-check if we're already logged in after clicking login button
    const logoutButtonAfterClick = page.getByRole("button", { name: "Log out" });
    const stillLoggedIn = await isVisibleSafely(logoutButtonAfterClick);
  
  if (stillLoggedIn) {
    // Already logged in, no need to show login dialog
    return;
  }
  
  // Wait for the modal to open
  try {
    await modalOpenPromise;
  } catch (error) {
      // If modal doesn't open, check if we somehow got logged in
      const checkLogoutAgain = page.getByRole("button", { name: "Log out" });
      const gotLoggedIn = await isVisibleSafely(checkLogoutAgain);
    if (gotLoggedIn) {
      // Somehow we're logged in now, that's fine
      return;
    }
    
      // Check if login button is still visible (maybe click didn't work)
      const loginButtonStillVisible = await isVisibleSafely(page.getByRole("button", { name: "Login" }));
    if (loginButtonStillVisible) {
      // Button is still there - click might not have worked, try again
      await page.getByRole("button", { name: "Login" }).click();
      await safeWait(page, 500);
      // Try waiting for modal again
      try {
        await waitForModalOpen(page, "login", 5000);
      } catch (retryError) {
        // Still failed - throw original error
        throw error;
      }
    } else {
      // Button is gone but modal didn't open - this is unexpected
      throw error;
    }
  }
  
    // waitForModalOpen already waits for the dialog AND the form field to be visible
    // Check if we somehow got logged in during the modal open process (this can happen)
    const checkLogoutButtonAfterModal = page.getByRole("button", { name: "Log out" });
    const isLoggedInAfterModal = await isVisibleSafely(checkLogoutButtonAfterModal);
  if (isLoggedInAfterModal) {
    // We're logged in somehow - that's fine, no need for login dialog
    return;
  }
  
  // waitForModalOpen should have ensured the dialog and form fields are visible
  // However, after clearing cookies/storage (like in auth-roles test), fields might need extra time
  // First verify the modal is still open (it might have closed)
  const loginDialog = page.getByRole("dialog", { name: "Login" });
  const dialogStillOpen = await isVisibleSafely(loginDialog, 2000);
  if (!dialogStillOpen) {
    // Modal closed - check if we're logged in
    const logoutButtonCheck = page.getByRole("button", { name: "Log out" });
    const isLoggedIn = await isVisibleSafely(logoutButtonCheck, 1000);
    if (isLoggedIn) {
      return; // We're logged in, no need to fill form
    }
    throw new Error("Login modal closed before form fields could be accessed. This may indicate a race condition or login failure.");
  }
  
  // Add explicit checks to ensure fields are ready for interaction
  const usernameInput = page.getByTestId("login-username");
  const passwordInput = page.getByTestId("login-password");
  
  // Explicitly wait for fields to be visible and enabled before interacting
  // Use longer timeouts since this is after navigation/state clearing
  await expect(usernameInput).toBeVisible({ timeout: 8000 });
  await expect(passwordInput).toBeVisible({ timeout: 8000 });
  await expect(usernameInput).toBeEnabled({ timeout: 5000 });
  await expect(passwordInput).toBeEnabled({ timeout: 5000 });
  
  // Small stability wait to ensure form is fully ready for interaction
  await page.waitForTimeout(STABILITY_WAIT_MEDIUM);
  
  await usernameInput.clear();
  await usernameInput.fill(username);
  
  await passwordInput.clear();
  await passwordInput.fill(password);
  
  // Verify the values were filled correctly (defensive check)
  const filledUsername = await usernameInput.inputValue();
  const filledPassword = await passwordInput.inputValue();
  
  if (filledUsername !== username) {
    throw new Error(`Username mismatch: expected "${username}", but form has "${filledUsername}"`);
  }
  if (filledPassword !== password) {
    throw new Error(`Password mismatch: expected password, but form value differs`);
  }
  
  // Submit login form via keyboard (triggers form onSubmit reliably)
  await passwordInput.press("Enter");
  
  // Wait for login modal to close using transition event
  // This indicates the login process completed (success or failure)
  try {
    await waitForModalClose(page, "login", 5000);
  } catch (error) {
    // If modal doesn't close, check if there's an error message
    const errorMessage = page.getByTestId("error-message");
    const hasError = await isVisibleSafely(errorMessage);
    
    if (hasError) {
      const errorText = await errorMessage.textContent().catch(() => "Unknown error");
      throw new Error(`Login failed: ${errorText}`);
    }
    
    // Modal didn't close and no error - might be a timeout
    // Check if we're logged in anyway
    const logoutButton = page.getByRole("button", { name: "Log out" });
    const isLoggedIn = await isVisibleSafely(logoutButton);
    
    if (!isLoggedIn) {
      throw new Error(
        `Login did not complete for user "${username}". Modal did not close and logout button did not appear. ` +
        `This may indicate: 1) The user does not exist, 2) The password is incorrect, 3) There was a network/auth service error. ` +
        `Please verify the user "${username}" was created successfully with password "${password.substring(0, 3)}...".`
      );
    }
  }
  
  // Verify we're logged in by checking for logout button
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible({ timeout: 3000 });
}

/**
 * Helper function to log in as admin (default test user).
 * Relies on seeded admin/admin123 user.
 */
export async function loginAsAdmin(page: Page) {
  await loginAs(page, "admin", "admin123");
}
