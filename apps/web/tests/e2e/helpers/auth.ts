import { Page, expect } from "@playwright/test";
import { waitForModalOpen, waitForModalClose } from "./modals";
import { isVisibleSafely, isHiddenSafely, waitForLoadStateSafely, createTimeoutPromise, awaitSafely, safeWait, isPageClosedSafely } from "./utils";
import { STABILITY_WAIT_SHORT, STABILITY_WAIT_MEDIUM, STABILITY_WAIT_LONG, STABILITY_WAIT_EXTRA, STABILITY_WAIT_MAX, VISIBILITY_TIMEOUT_SHORT, VISIBILITY_TIMEOUT_MEDIUM, VISIBILITY_TIMEOUT_LONG, VISIBILITY_TIMEOUT_EXTRA } from "./constants";

/**
 * Check if user is currently logged in by checking for logout button.
 */
async function isLoggedIn(page: Page): Promise<boolean> {
  const logoutButton = page.getByRole("button", { name: "Log out" });
  return await isVisibleSafely(logoutButton);
}

/**
 * Log out the current user if logged in.
 */
async function logoutIfLoggedIn(page: Page): Promise<void> {
  if (await isLoggedIn(page)) {
    const logoutButton = page.getByRole("button", { name: "Log out" });
    await logoutButton.click();
    // Wait for the UI to update (Login button should appear, logout button should disappear)
    try {
      await Promise.race([
        page.getByRole("button", { name: "Login" }).waitFor({ state: "visible", timeout: VISIBILITY_TIMEOUT_MEDIUM }),
        createTimeoutPromise(5000) // Fallback timeout
      ]);
    } catch {
      // If wait fails, that's okay - continue anyway
    }
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
        await loginDialog.waitFor({ state: "hidden", timeout: VISIBILITY_TIMEOUT_MEDIUM });
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
  if (await isPageClosedSafely(page)) {
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
      await page.goto("/", { waitUntil: "domcontentloaded", timeout: VISIBILITY_TIMEOUT_MEDIUM });
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
        if (urlError.message?.includes("closed") || (await isPageClosedSafely(page))) {
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
    await waitForLoadStateSafely(page, "domcontentloaded", VISIBILITY_TIMEOUT_MEDIUM);
    // Small additional wait to ensure React has rendered and buttons are interactive
    await safeWait(page, STABILITY_WAIT_LONG);
  } catch {
    // If wait fails, that's okay - page might already be loaded
    // But still add a small wait for React to render
    await safeWait(page, STABILITY_WAIT_LONG);
  }
  
  // Check if already logged in - if so, log out first
  await logoutIfLoggedIn(page);
  
  // Check if we're already logged in BEFORE trying to open login dialog
  if (await isLoggedIn(page)) {
    // Already logged in, no need to show login dialog
    return;
  }
  
  // Open login modal via banner Login button
  // After clearing cookies/storage (like in auth-roles test), the page needs time to render
  // Wait for Login button to be visible, enabled, and stable before clicking
  const loginButton = page.getByRole("button", { name: "Login" });
  
  // Wait for button to be visible and enabled - this is critical after page navigation/refresh
  await expect(loginButton).toBeVisible({ timeout: VISIBILITY_TIMEOUT_LONG });
  await expect(loginButton).toBeEnabled({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  
  // Small stability wait to ensure button is fully interactive
  // This is especially important after clearing cookies/storage
  await safeWait(page, STABILITY_WAIT_LONG);
  
  // Check if we're already logged in (button might have changed)
  if (await isLoggedIn(page)) {
    // Already logged in, no need to show login dialog
    return;
  }
  
  // Set up the listener BEFORE clicking to avoid race conditions
  // Reduced timeout from 8000ms to 5000ms for better performance
  const modalOpenPromise = waitForModalOpen(page, "login", 5000).catch(() => null);
  
  // Click the login button
  await loginButton.click();
  
  // Wait for login modal to open using transition event
  // Double-check if we're already logged in after clicking login button
  if (await isLoggedIn(page)) {
    // Already logged in, no need to show login dialog
    return;
  }
  
  // Wait for the modal to open
  try {
    await modalOpenPromise;
  } catch (error) {
    // If modal doesn't open, check if we somehow got logged in
    if (await isLoggedIn(page)) {
      // Somehow we're logged in now, that's fine
      return;
    }
    
      // Check if login button is still visible (maybe click didn't work)
      const loginButtonStillVisible = await isVisibleSafely(page.getByRole("button", { name: "Login" }));
    if (loginButtonStillVisible) {
      // Button is still there - click might not have worked, try again
      await page.getByRole("button", { name: "Login" }).click();
      await safeWait(page, STABILITY_WAIT_MAX);
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
  
  // waitForModalOpen already waits for the dialog AND the form fields to be visible and enabled
  // It also adds a stability wait. So we can trust that the modal is open and fields are ready.
  // Add a small stability wait to ensure the modal is fully settled
  await safeWait(page, STABILITY_WAIT_MEDIUM);
  
  // Check if we're already logged in (might have happened during modal open)
  // Do this check multiple times with small delays to catch race conditions
  for (let i = 0; i < 3; i++) {
    if (await isLoggedIn(page)) {
      // We're logged in somehow - that's fine, no need for login dialog
      return;
    }
    if (i < 2) {
      await safeWait(page, STABILITY_WAIT_SHORT);
    }
  }
  
  // Get form fields - waitForModalOpen already verified they're visible and enabled
  const loginDialog = page.getByRole("dialog", { name: "Login" });
  const usernameInput = page.getByTestId("login-username");
  const passwordInput = page.getByTestId("login-password");
  
  // Verify that dialog and fields are still accessible (with longer timeout for robustness)
  // Check login status in parallel for efficiency
  try {
    const [dialogVisible, usernameVisible, passwordVisible, isLoggedInCheck] = await Promise.all([
      isVisibleSafely(loginDialog, VISIBILITY_TIMEOUT_LONG),
      usernameInput.isVisible({ timeout: VISIBILITY_TIMEOUT_LONG }).catch(() => false),
      passwordInput.isVisible({ timeout: VISIBILITY_TIMEOUT_LONG }).catch(() => false),
      isLoggedIn(page)
    ]);
    
    if (isLoggedInCheck) {
      // We're logged in - no need to fill form
      return;
    }
    
    if (!dialogVisible || !usernameVisible || !passwordVisible) {
      // Dialog or fields not accessible - check login one more time with a small wait
      await safeWait(page, STABILITY_WAIT_SHORT);
      const finalLoginCheck = await isLoggedIn(page);
      if (finalLoginCheck) {
        return; // We're logged in, no need to fill form
      }
      throw new Error("Login modal closed before form fields could be accessed. This may indicate a race condition or login failure.");
    }
  } catch (fieldError) {
    // Fields or modal not accessible - check if we're logged in (with retry)
    await safeWait(page, STABILITY_WAIT_SHORT);
    const isLoggedInNow = await isLoggedIn(page);
    if (isLoggedInNow) {
      return; // We're logged in, no need to fill form
    }
    throw new Error("Login modal closed before form fields could be accessed. This may indicate a race condition or login failure.");
  }
  
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
    if (!(await isLoggedIn(page))) {
      throw new Error(
        `Login did not complete for user "${username}". Modal did not close and logout button did not appear. ` +
        `This may indicate: 1) The user does not exist, 2) The password is incorrect, 3) There was a network/auth service error. ` +
        `Please verify the user "${username}" was created successfully with password "${password.substring(0, 3)}...".`
      );
    }
  }
  
  // Verify we're logged in by checking for logout button
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
}

/**
 * Helper function to log in as admin (default test user).
 * Relies on seeded admin/admin123 user.
 */
export async function loginAsAdmin(page: Page) {
  await loginAs(page, "admin", "admin123");
}
