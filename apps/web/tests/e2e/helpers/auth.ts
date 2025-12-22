import { Page, expect } from "@playwright/test";
import { waitForModalOpen, waitForModalClose } from "./modals";
import { isVisibleSafely, isHiddenSafely, waitForLoadStateSafely, createTimeoutPromise, awaitSafely, safeWait, isPageClosedSafely, waitForSimpleEvent, navigateAndWaitForReady } from "./utils";
import { STABILITY_WAIT_SHORT, STABILITY_WAIT_MEDIUM, STABILITY_WAIT_LONG, STABILITY_WAIT_EXTRA, STABILITY_WAIT_MAX, VISIBILITY_TIMEOUT_SHORT, VISIBILITY_TIMEOUT_MEDIUM, VISIBILITY_TIMEOUT_LONG, VISIBILITY_TIMEOUT_EXTRA } from "./constants";
import { GUEST_VIEW_READY_EVENT, BANNER_READY_EVENT } from "../../../lib/auth/authEvents";

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
 * Ensure user is logged out before attempting login.
 * This is a strategic check - if already logged in, log out first.
 */
async function ensureLoggedOut(page: Page): Promise<void> {
  await logoutIfLoggedIn(page);
  
  // Strategic check: if still logged in after logout attempt, return early
  if (await isLoggedIn(page)) {
    return; // Already logged in, no need to proceed
  }
}

/**
 * Open the login modal and verify it's ready for input.
 * Returns the dialog and form field locators if successful.
 */
async function openLoginModal(page: Page): Promise<{
  dialog: ReturnType<Page['getByRole']>;
  usernameInput: ReturnType<Page['getByTestId']>;
  passwordInput: ReturnType<Page['getByTestId']>;
}> {
  const loginButton = page.getByRole("button", { name: "Login" });
  
  // Wait for button to be visible and enabled
  await expect(loginButton).toBeVisible({ timeout: VISIBILITY_TIMEOUT_LONG });
  await expect(loginButton).toBeEnabled({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  await safeWait(page, STABILITY_WAIT_LONG);
  
  // Strategic check: if logged in after waiting for button, return early
  if (await isLoggedIn(page)) {
    throw new Error("Already logged in - cannot open login modal");
  }
  
  // Set up listener BEFORE clicking to avoid race conditions
  const modalOpenPromise = waitForModalOpen(page, "login", 5000);
  
  // Click the login button
  await loginButton.click();
  await safeWait(page, STABILITY_WAIT_MEDIUM);
  
  // Wait for modal to open
  try {
    await modalOpenPromise;
  } catch (error) {
    // Modal might not have opened - check if we're logged in (maybe auto-login happened)
    if (await isLoggedIn(page)) {
      throw new Error("Already logged in - login modal not needed");
    }
    
    // Check if login button is still visible (maybe click didn't work)
    const loginButtonStillVisible = await isVisibleSafely(page.getByRole("button", { name: "Login" }));
    if (loginButtonStillVisible) {
      // Button is still there - click might not have worked, try again
      await page.getByRole("button", { name: "Login" }).click();
      await safeWait(page, STABILITY_WAIT_MAX);
      // Try waiting for modal again
      await waitForModalOpen(page, "login", 5000);
    } else {
      // Button is gone but modal didn't open - this is unexpected
      throw error;
    }
  }
  
  // Get form fields - waitForModalOpen already verified they're visible and enabled
  const loginDialog = page.getByRole("dialog", { name: "Login" });
  const usernameInput = page.getByTestId("login-username");
  const passwordInput = page.getByTestId("login-password");
  
  // Strategic check: verify modal is open and fields are accessible
  // This is the main check - if modal closed immediately, we'll catch it here
  const [dialogVisible, usernameVisible, passwordVisible] = await Promise.all([
    isVisibleSafely(loginDialog, VISIBILITY_TIMEOUT_MEDIUM),
    usernameInput.isVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM }).catch(() => false),
    passwordInput.isVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM }).catch(() => false)
  ]);
  
  if (!dialogVisible || !usernameVisible || !passwordVisible) {
    // Modal closed or fields not accessible - check if we're logged in (race condition)
    await safeWait(page, STABILITY_WAIT_MEDIUM);
    if (await isLoggedIn(page)) {
      throw new Error("Already logged in - login modal not needed");
    }
    throw new Error("Login modal closed before form fields could be accessed. This may indicate a race condition or login failure.");
  }
  
  await safeWait(page, STABILITY_WAIT_MEDIUM);
  
  return { dialog: loginDialog, usernameInput, passwordInput };
}

/**
 * Fill the login form with username and password.
 */
async function fillLoginForm(
  page: Page,
  username: string,
  password: string,
  usernameInput: ReturnType<Page['getByTestId']>,
  passwordInput: ReturnType<Page['getByTestId']>
): Promise<void> {
  // Verify fields are still accessible before filling
  const usernameStillVisible = await usernameInput.isVisible({ timeout: VISIBILITY_TIMEOUT_SHORT }).catch(() => false);
  const passwordStillVisible = await passwordInput.isVisible({ timeout: VISIBILITY_TIMEOUT_SHORT }).catch(() => false);
  
  if (!usernameStillVisible || !passwordStillVisible) {
    // Fields not accessible - check if we're logged in (race condition)
    await safeWait(page, STABILITY_WAIT_SHORT);
    if (await isLoggedIn(page)) {
      throw new Error("Already logged in - form filling not needed");
    }
    throw new Error("Login form fields became inaccessible. This may indicate a race condition or login failure.");
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
}

/**
 * Wait for login to complete and verify success.
 */
async function waitForLoginSuccess(page: Page, username: string): Promise<void> {
  // Submit login form via keyboard (triggers form onSubmit reliably)
  const passwordInput = page.getByTestId("login-password");
  await passwordInput.press("Enter");
  
  // Wait for login modal to close using transition event
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
        `Please verify the user "${username}" was created successfully with the provided password.`
      );
    }
  }
  
  // Wait for banner to be ready after login (it should fire with isAuthenticated=true)
  // This ensures the logout button is rendered
  try {
    await waitForSimpleEvent(
      page,
      BANNER_READY_EVENT,
      VISIBILITY_TIMEOUT_MEDIUM,
      async () => {
        // Fallback: check if logout button is visible
        const logoutButton = page.getByRole("button", { name: "Log out" });
        await expect(logoutButton).toBeVisible({ timeout: VISIBILITY_TIMEOUT_SHORT });
      }
    );
  } catch {
    // Event might have already fired or not needed - continue
  }
  
  // Verify we're logged in by checking for logout button
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
}

/**
 * Helper function to log in a user before accessing the application.
 * This should be called at the start of any test that needs authentication.
 * 
 * Simplified version that extracts sub-functions and reduces redundant checks.
 */
export async function loginAs(page: Page, username: string, password: string) {
  // Check if page is closed before attempting navigation
  if (await isPageClosedSafely(page)) {
    throw new Error("Page was closed before login attempt");
  }
  
  // Navigate to home page and wait for it to be ready
  // Use navigateAndWaitForReady which handles navigation and page readiness
  await navigateAndWaitForReady(page, "/", {
    stabilityWait: STABILITY_WAIT_LONG
  });
  
  // Wait for the guest view and banner to be ready (new state transition events)
  // These events ensure the UI components are fully mounted and ready
  try {
    await waitForSimpleEvent(
      page, 
      GUEST_VIEW_READY_EVENT, 
      VISIBILITY_TIMEOUT_MEDIUM,
      async () => {
        // Fallback: check if guest view is rendered
        const guestView = page.locator('[data-component="GuestView"]').or(page.locator('section:has-text("Welcome")'));
        await expect(guestView.first()).toBeVisible({ timeout: VISIBILITY_TIMEOUT_SHORT });
      }
    );
  } catch {
    // Event might have already fired or not needed - continue
  }
  try {
    await waitForSimpleEvent(
      page, 
      BANNER_READY_EVENT, 
      VISIBILITY_TIMEOUT_MEDIUM,
      async () => {
        // Fallback: check if banner/auth controls are rendered
        const bannerAuth = page.locator('[data-component="HeaderAuth"]');
        await expect(bannerAuth).toBeVisible({ timeout: VISIBILITY_TIMEOUT_SHORT });
      }
    );
  } catch {
    // Event might have already fired or not needed - continue
  }
  
  // Ensure logged out (strategic check #1)
  await ensureLoggedOut(page);
  
  // Strategic check #2: if still logged in after logout, return early
  if (await isLoggedIn(page)) {
    return;
  }
  
  // Open login modal and get form fields
  const { usernameInput, passwordInput } = await openLoginModal(page);
  
  // Fill the login form
  await fillLoginForm(page, username, password, usernameInput, passwordInput);
  
  // Wait for login to complete and verify success
  await waitForLoginSuccess(page, username);
}

/**
 * Helper function to log in as admin (default test user).
 * Relies on seeded admin/admin123 user.
 */
export async function loginAsAdmin(page: Page) {
  await loginAs(page, "admin", "admin123");
}
