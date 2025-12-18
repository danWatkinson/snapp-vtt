import { Page, expect } from "@playwright/test";

/**
 * Generate a unique campaign name per worker to avoid conflicts when tests run in parallel.
 * Uses TEST_PARALLEL_INDEX to ensure each worker gets a unique name.
 */
export function getUniqueCampaignName(baseName: string): string {
  const workerIndex = process.env.TEST_PARALLEL_INDEX;
  if (workerIndex !== undefined) {
    return `${baseName} [Worker ${workerIndex}]`;
  }
  // When running sequentially (no worker index), use timestamp to ensure uniqueness
  // This prevents test isolation issues when tests run one after another
  return `${baseName}-${Date.now()}`;
}

/**
 * Generate a unique username per worker to avoid conflicts when tests run in parallel.
 * Uses TEST_PARALLEL_INDEX to ensure each worker gets a unique username.
 */
export function getUniqueUsername(baseName: string): string {
  const workerIndex = process.env.TEST_PARALLEL_INDEX;
  if (workerIndex !== undefined) {
    return `${baseName}-${workerIndex}`;
  }
  // If no worker index, use timestamp to ensure uniqueness
  return `${baseName}-${Date.now()}`;
}

/**
 * Get the unique campaign name that was stored in the page context.
 * This is used to retrieve the actual campaign name when tests need to reference it.
 */
export async function getStoredCampaignName(page: Page, baseName: string): Promise<string> {
  try {
    const storedName = await page.evaluate(() => {
      return (window as any).__testCampaignName;
    });
    if (storedName) {
      return storedName;
    }
  } catch {
    // Can't retrieve - fall back to unique name generation
  }
  // Fall back to generating unique name if not stored
  return getUniqueCampaignName(baseName);
}

/**
 * Get the unique world name that was stored in the page context.
 * This is used to retrieve the actual world name when tests need to reference it.
 */
export async function getStoredWorldName(
  page: Page,
  baseName: string = "Eldoria"
): Promise<string> {
  try {
    const storedName = await page.evaluate(() => {
      return (window as any).__testWorldName;
    });
    if (storedName) {
      return storedName;
    }
  } catch {
    // If we can't retrieve it, fall back to generating it
  }
  // Fall back to generating the unique name
  return getUniqueCampaignName(baseName);
}

/**
 * Helper to ensure login dialog is closed (it blocks clicks if open)
 */
export async function ensureLoginDialogClosed(page: Page) {
  const loginDialog = page.getByRole("dialog", { name: "Login" });
  const loginDialogVisible = await loginDialog.isVisible().catch(() => false);
  
  if (loginDialogVisible) {
    // Dialog is open - try to close it
    try {
      const closeButton = loginDialog.getByRole("button", { name: "Close login" });
      const closeButtonVisible = await closeButton.isVisible({ timeout: 1000 }).catch(() => false);
      if (closeButtonVisible) {
        await closeButton.click();
      } else {
        // Try Escape key
        await page.keyboard.press("Escape");
      }
      // Wait for dialog to close
      await loginDialog.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(200);
    } catch {
      // If closing fails, that's okay - continue anyway
    }
  }
}

/**
 * Safely wait for a timeout, checking if page is closed
 * Only checks at the start to avoid false positives during transitions
 */
async function safeWait(page: Page, ms: number) {
  // Don't check if closed at start - page might be in transition
  // Only check if we get an error
  try {
    // Check if page is closed before waiting
    try {
      if (page.isClosed()) {
        return; // Page is closed, can't wait - just return silently
      }
    } catch {
      // Can't check if closed - assume it's in a bad state
      return; // Just return, don't throw
    }
    
    // Use a shorter timeout to avoid hitting test timeout
    // Cap the wait at 1000ms to avoid test timeout issues
    const cappedMs = Math.min(ms, 1000);
    
    // Use Promise.race to handle timeouts gracefully
    await Promise.race([
      page.waitForTimeout(cappedMs),
      new Promise((resolve) => setTimeout(resolve, cappedMs + 100)) // Slightly longer fallback
    ]);
  } catch (error) {
    // Check if page is actually closed
    let actuallyClosed = false;
    try {
      actuallyClosed = page.isClosed();
    } catch {
      // Can't check if closed - assume it's in a bad state
      return; // Just return, don't throw
    }
    
    // Only throw if page is actually closed AND error message confirms it
    if (actuallyClosed && error.message?.includes("closed")) {
      throw new Error("Page was closed during wait");
    }
    
    // If error mentions "closed" but page isn't actually closed, it might be a false positive
    // Just return - the wait might have completed anyway
    if (error.message?.includes("closed") && !actuallyClosed) {
      return; // False positive, continue
    }
    
    // For timeout errors, just return - don't throw
    // The test timeout will catch it if needed
    if (error.message?.includes("timeout") || error.message?.includes("Timeout")) {
      return; // Timeout occurred, just return
    }
    
    // For other errors, just return - don't throw
    // We want to be resilient to errors
    return;
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
  } else {
    // Already on home page, just wait for it to be ready
    try {
      await page.waitForLoadState("domcontentloaded", { timeout: 3000 });
    } catch {
      // If wait fails, that's okay - page might already be loaded
    }
  }
  
  // Check if already logged in - if so, log out first using the logout button
  // The logout button clears the token and dispatches AUTH_EVENT (no page reload)
  const logoutButton = page.getByRole("button", { name: "Log out" });
  const isLoggedIn = await logoutButton.isVisible().catch(() => false);
  if (isLoggedIn) {
    // Click logout button - this clears localStorage and dispatches AUTH_EVENT
    // No navigation happens, just state updates
    await logoutButton.click();
    // Wait for the UI to update (Login button should appear, logout button should disappear)
    // Use a longer timeout and be more defensive
    try {
      await Promise.race([
        page.getByRole("button", { name: "Login" }).waitFor({ state: "visible", timeout: 3000 }),
        page.waitForTimeout(5000) // Fallback timeout
      ]);
    } catch {
      // If wait fails, that's okay - continue anyway
    }
  }
  
  // Check if we're already logged in BEFORE trying to open login dialog
  const checkLogoutButtonBefore = page.getByRole("button", { name: "Log out" });
  const alreadyLoggedInBefore = await checkLogoutButtonBefore.isVisible({ timeout: 1000 }).catch(() => false);
  if (alreadyLoggedInBefore) {
    // Already logged in, no need to show login dialog
    return;
  }
  
  // Open login modal via banner Login button
  const loginButton = page.getByRole("button", { name: "Login" });
  const loginButtonVisible = await loginButton.isVisible({ timeout: 3000 }).catch(() => false);
  
  if (!loginButtonVisible) {
    // Login button not visible - might already be logged in
    // Check if we're actually logged in by looking for logout button
    const checkLogoutButton = page.getByRole("button", { name: "Log out" });
    const isActuallyLoggedIn = await checkLogoutButton.isVisible({ timeout: 1000 }).catch(() => false);
    if (isActuallyLoggedIn) {
      // Already logged in, no need to login again
      return;
    } else {
      // Not logged in but login button not visible - might be a page state issue
      // Wait a bit and check again
      await page.waitForTimeout(500);
      const retryLoginButton = page.getByRole("button", { name: "Login" });
      const retryVisible = await retryLoginButton.isVisible({ timeout: 3000 }).catch(() => false);
      if (retryVisible) {
        await retryLoginButton.click();
      } else {
        // Still not visible - might need a refresh
        await page.reload({ waitUntil: "domcontentloaded" });
        const finalLoginButton = page.getByRole("button", { name: "Login" });
        await expect(finalLoginButton).toBeVisible({ timeout: 3000 });
        await finalLoginButton.click();
      }
    }
  } else {
    // Wait for button to be enabled and actionable before clicking
    await expect(loginButton).toBeEnabled({ timeout: 3000 });
    // Ensure page is interactive - wait for any pending navigations/loads
    try {
      await page.waitForLoadState("domcontentloaded", { timeout: 2000 });
    } catch {
      // If already loaded, that's fine
    }
    await loginButton.click();
  }

  // Wait for the event to be dispatched and modal to start opening
  // Use a longer wait to ensure the event has time to propagate
  await page.waitForTimeout(500);

  // Wait for login dialog to appear (unless already logged in)
  // Double-check if we're already logged in after clicking login button
  const logoutButtonAfterClick = page.getByRole("button", { name: "Log out" });
  const stillLoggedIn = await logoutButtonAfterClick.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (stillLoggedIn) {
    // Already logged in, no need to show login dialog
    return;
  }
  
  // Wait for login dialog to appear - it might take a moment for the modal to open
  // The OPEN_LOGIN_EVENT is dispatched, which triggers the modal to open
  const loginDialog = page.getByRole("dialog", { name: "Login" });
  try {
    await expect(loginDialog).toBeVisible({ timeout: 5000 });
  } catch (error) {
    // If dialog doesn't appear, check if we somehow got logged in
    const checkLogoutAgain = page.getByRole("button", { name: "Log out" });
    const gotLoggedIn = await checkLogoutAgain.isVisible({ timeout: 1000 }).catch(() => false);
    if (gotLoggedIn) {
      // Somehow we're logged in now, that's fine
      return;
    }
    
    // Check if login button is still visible (maybe click didn't work)
    const loginButtonStillVisible = await page.getByRole("button", { name: "Login" }).isVisible({ timeout: 1000 }).catch(() => false);
    if (loginButtonStillVisible) {
      // Login button still visible - try clicking again
      // Check for page errors first
      const errorMessages = page.getByTestId("error-message");
      const hasError = await errorMessages.isVisible().catch(() => false);
      if (hasError) {
        const errorText = await errorMessages.textContent().catch(() => "Unknown error");
        throw new Error(`Page has error before login: ${errorText}`);
      }
      await page.getByRole("button", { name: "Login" }).click();
      await page.waitForTimeout(500);
      
      // Check again if we're logged in (might have happened during the click)
      const checkLogoutAfterRetry = page.getByRole("button", { name: "Log out" });
      const loggedInAfterRetry = await checkLogoutAfterRetry.isVisible({ timeout: 1000 }).catch(() => false);
      if (loggedInAfterRetry) {
        // We're logged in now, that's fine
        return;
      }
      
      // Still not logged in, wait for dialog
      const retryDialog = page.getByRole("dialog", { name: "Login" });
      await expect(retryDialog).toBeVisible({ timeout: 5000 });
      return;
    }
    
    // Check one more time if we're logged in (race condition)
    const finalCheckLogout = page.getByRole("button", { name: "Log out" });
    const finalLoggedIn = await finalCheckLogout.isVisible({ timeout: 1000 }).catch(() => false);
    if (finalLoggedIn) {
      // We're logged in, that's fine
      return;
    }
    
    // Otherwise, rethrow the error
    throw error;
  }
  
  // Wait for login form to be visible in the modal
  await expect(page.getByTestId("login-username")).toBeVisible({ timeout: 3000 });
  
  // Fill in credentials - clear first to ensure clean state
  const usernameInput = page.getByTestId("login-username");
  const passwordInput = page.getByTestId("login-password");
  
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
  
  // Wait for login to complete - the dialog should close
  // Also wait for logout button to appear (indicates successful login)
  // Use a longer timeout to allow for user creation and login processing
  try {
    await Promise.race([
      loginDialog.waitFor({ state: "hidden", timeout: 5000 }),
      page.getByRole("button", { name: "Log out" }).waitFor({ state: "visible", timeout: 5000 })
    ]);
  } catch (raceError) {
    // Check if there's an error message in the login dialog
    const errorMessage = page.getByTestId("error-message");
    const hasError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (hasError) {
      const errorText = await errorMessage.textContent().catch(() => "Unknown error");
      throw new Error(`Login failed: ${errorText}`);
    }
    
    // If no error message, check if we're logged in anyway
    const logoutButton = page.getByRole("button", { name: "Log out" });
    const isLoggedIn = await logoutButton.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (!isLoggedIn) {
      // Check if dialog is still visible (might be blocking the UI)
      const dialogStillOpen = await loginDialog.isVisible({ timeout: 500 }).catch(() => false);
      
      if (dialogStillOpen) {
        // Dialog is still open - check for error message again (it might have appeared)
        const errorMessage = page.getByTestId("error-message");
        const hasErrorNow = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);
        
        if (hasErrorNow) {
          const errorText = await errorMessage.textContent().catch(() => "Unknown error");
          throw new Error(`Login failed: ${errorText}`);
        }
        
        // Dialog still open but no error - login might be in progress
        // Wait a bit longer for login to complete
        await page.waitForTimeout(1000);
        const loggedInAfterWait = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (!loggedInAfterWait) {
          throw new Error(
            `Login did not complete for user "${username}". Dialog remained open and logout button did not appear. ` +
            `This may indicate: 1) The user does not exist, 2) The password is incorrect, 3) There was a network/auth service error. ` +
            `Please verify the user "${username}" was created successfully with password "${password.substring(0, 3)}...".`
          );
        }
      } else {
        // Dialog closed but not logged in - this is unexpected
        throw new Error(
          `Login did not complete for user "${username}". Dialog closed but logout button did not appear. ` +
          `This may indicate an authentication failure or UI state issue.`
        );
      }
    }
    // If we're logged in, the race just timed out - that's okay
  }
  
  // Ensure dialog is actually closed (it might still be in DOM but hidden)
  const dialogStillVisible = await loginDialog.isVisible().catch(() => false);
  if (dialogStillVisible) {
    // Dialog still visible - try to close it manually
    const closeButton = loginDialog.getByRole("button", { name: "Close login" });
    const closeButtonVisible = await closeButton.isVisible({ timeout: 1000 }).catch(() => false);
    if (closeButtonVisible) {
      await closeButton.click();
    } else {
      // Try Escape key
      await page.keyboard.press("Escape");
    }
    // Wait for it to close
    await loginDialog.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
  }
  
  // Verify we're logged in by checking for logout button
  // Wait a bit first to allow the UI to update after login
  await page.waitForTimeout(500);
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible({ timeout: 3000 });
  
  // Wait a bit more for UI to fully stabilize after login
  await page.waitForTimeout(300);
}

/**
 * Helper function to log in as admin (default test user).
 * Relies on seeded admin/admin123 user.
 */
export async function loginAsAdmin(page: Page) {
  await loginAs(page, "admin", "admin123");
}

/**
 * Helper function to select a world and enter planning mode.
 * Ensures a world exists (creates "Eldoria" if needed), selects it,
 * and optionally navigates to a specific planning sub-tab.
 */
/**
 * Ensures the ModeSelector (world context tablist) is visible.
 * If a world is currently selected, leaves it first.
 */
export async function ensureModeSelectorVisible(page: Page) {
  const modeSelectorVisible = await page
    .getByRole("tablist", { name: "World context" })
    .isVisible()
    .catch(() => false);

  if (modeSelectorVisible) {
    // Already visible, nothing to do
    return;
  }

  // Check if login dialog is still open - if so, close it first (it blocks clicks)
  await ensureLoginDialogClosed(page);
  
  // Mode selector not visible - check if a world is selected
  // Check if menu is already open by looking for overlay
  const menuOverlay = page.locator('div.fixed.inset-0.z-10');
  const isMenuOpen = await menuOverlay.isVisible().catch(() => false);
  
  // If menu is not open, open it to check for "Leave World"
  if (!isMenuOpen) {
    await page.getByRole("button", { name: /^Snapp/i }).click();
    // Wait a bit for menu to open
    await safeWait(page, 200);
  }
  
  // Check if a world is actually selected by looking for "Leave World" button
  const leaveWorldButton = page.getByRole("button", { name: "Leave World" });
  const hasLeaveWorld = await leaveWorldButton.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (hasLeaveWorld) {
    // A world is currently selected, so we need to leave it first
    await leaveWorldButton.click();
    // Wait for menu to close and state to update
    await safeWait(page, 500);
    // Wait for ModeSelector to appear
    await expect(
      page.getByRole("tablist", { name: "World context" })
    ).toBeVisible({ timeout: 5000 });
  } else {
    // No world is selected - menu is open, close it by clicking outside or the button again
    // Click outside the menu (on the overlay) to close it
    if (isMenuOpen || await menuOverlay.isVisible().catch(() => false)) {
      // Click on the overlay to close the menu
      await menuOverlay.click({ position: { x: 10, y: 10 } });
      await safeWait(page, 200);
    }
    
    // Mode selector should be visible when no world is selected
    // Wait for it to appear (it might show "No worlds" message or world list)
    // First, ensure we're actually logged in - if not, this will fail with a clear error
    const logoutButton = page.getByRole("button", { name: "Log out" });
    const isLoggedIn = await logoutButton.isVisible({ timeout: 1000 }).catch(() => false);
    if (!isLoggedIn) {
      throw new Error("Cannot ensure mode selector visible: user is not logged in. Logout button not found.");
    }
    
    try {
      await expect(
        page.getByRole("tablist", { name: "World context" })
      ).toBeVisible({ timeout: 3000 });
    } catch {
      // If not visible, check for "No worlds" message instead
      const noWorldsMessage = await page
        .getByText("No worlds have been created yet")
        .isVisible()
        .catch(() => false);
      
      if (!noWorldsMessage) {
        // Neither mode selector nor "No worlds" message - check if we're on guest view
        const guestView = await page.getByText("Welcome to Snapp").isVisible().catch(() => false);
        if (guestView) {
          throw new Error("Mode selector not visible: appears to be on guest view instead of authenticated view. User may not be logged in.");
        }
        // Otherwise, this is unexpected - but let calling code handle it
      }
    }
  }
}

export async function selectWorldAndEnterPlanningMode(
  page: Page,
  subTab: "World Entities" | "Campaigns" | "Story Arcs" | "Users" = "World Entities"
) {
  // First verify we're logged in and authenticated view is ready
  // Wait for logout button to be visible (indicates authenticated state)
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible({ timeout: 3000 });
  
  // Also verify we're not on guest view (AuthenticatedView should be rendering)
  // Wait a moment for the view to switch from GuestView to AuthenticatedView
  await page.waitForTimeout(300);
  const guestView = await page.getByText("Welcome to Snapp").isVisible().catch(() => false);
  if (guestView) {
    throw new Error("Cannot navigate to planning screen: still on guest view after login. AuthenticatedView may not have rendered.");
  }
  
  // Now ensure mode selector is visible
  await ensureModeSelectorVisible(page);

  // For Users tab, we can navigate directly without requiring a world
  // The Users tab doesn't logically need a world, even though the UI currently requires it
  if (subTab === "Users") {
    // Try to find any world first, but if none exists, we'll still try to navigate to Users
    const worldContextTablist = page.getByRole("tablist", { name: "World context" });
    const hasAnyWorld = await worldContextTablist
      .getByRole("tab")
      .first()
      .isVisible()
      .catch(() => false);
    
    if (hasAnyWorld) {
      // Select the first available world
      const firstWorldTab = worldContextTablist.getByRole("tab").first();
      await firstWorldTab.click();
      await safeWait(page, 300);
    }
    // Navigate to Users tab directly
    const usersTab = page.getByRole("tab", { name: "Users" });
    const usersTabVisible = await usersTab.isVisible({ timeout: 2000 }).catch(() => false);
    if (usersTabVisible) {
      await usersTab.click();
    } else {
      // If Users tab isn't visible (no world selected), try setting activeTab directly via page context
      // This is a fallback if the UI structure allows it
      await page.evaluate(() => {
        // Try to trigger the Users tab via custom event or direct state
        window.dispatchEvent(new CustomEvent("setActiveTab", { detail: { tab: "Users" } }));
      });
      // Wait a bit and check if Users tab content appeared
      await safeWait(page, 500);
    }
    return;
  }

  // For other tabs, world selection is required
  // Check if any world exists in the World context selector
  const worldContextTablist = page.getByRole("tablist", { name: "World context" });
  
  // First, check if the unique world name already exists
  const uniqueWorldName = getUniqueCampaignName("Eldoria");
  let hasUniqueWorld = await worldContextTablist
    .getByRole("tab", { name: uniqueWorldName })
    .isVisible()
    .catch(() => false);
  
  // If unique world exists, store it and skip creation
  if (hasUniqueWorld) {
    await page.evaluate((name) => {
      (window as any).__testWorldName = name;
    }, uniqueWorldName);
  } else {
    // Check if any world exists (might be base "Eldoria" or another world)
    const hasWorld = await worldContextTablist
      .getByRole("tab")
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasWorld) {
      // Check if we see the "No worlds" message - if so, create one
      const noWorldsMessage = await page
        .getByText("No worlds have been created yet")
        .isVisible()
        .catch(() => false);
      
      if (noWorldsMessage) {
        // Create a world via the Snapp menu in the banner
        await page.getByRole("button", { name: /Snapp/i }).click();
        await page.getByRole("button", { name: "Create world" }).click();
        
        // Wait for the create world modal to be visible
        const createWorldDialog = page.getByRole("dialog", { name: /create world/i });
        await expect(createWorldDialog).toBeVisible({ timeout: 3000 });
        
        // uniqueWorldName already defined above
        await page.getByLabel("World name").fill(uniqueWorldName);
        await page.getByLabel("Description").fill("A high-fantasy realm.");
        await page.getByRole("button", { name: "Save world" }).click();
        
        // Wait for either: modal to close, error message, or world to appear
        await Promise.race([
          createWorldDialog.waitFor({ state: "hidden", timeout: 3000 }).catch(() => null),
          page.getByTestId("error-message").waitFor({ timeout: 2000 }).catch(() => null),
          worldContextTablist.getByRole("tab", { name: uniqueWorldName }).waitFor({ timeout: 3000 }).catch(() => null)
        ]);
        
        // Check if world already appeared (creation succeeded)
        let worldExists = await worldContextTablist
          .getByRole("tab", { name: uniqueWorldName })
          .isVisible()
          .catch(() => false);
        
        // If not visible yet, wait a bit more and check again
        if (!worldExists) {
          await safeWait(page, 500);
          worldExists = await worldContextTablist
            .getByRole("tab", { name: uniqueWorldName })
            .isVisible()
            .catch(() => false);
        }
        
        if (worldExists) {
          // World was created successfully, modal should be closed or will close
          // Force close if still open
          const stillOpen = await createWorldDialog.isVisible().catch(() => false);
          if (stillOpen) {
            const cancelButton = createWorldDialog.getByRole("button", { name: "Cancel" });
            if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
              await cancelButton.click();
            }
          }
          // Store the unique world name in page context for other steps to use
          await page.evaluate((name) => {
            (window as any).__testWorldName = name;
          }, uniqueWorldName);
          // Mark that we now have the unique world
          hasUniqueWorld = true;
          // Wait a bit for the world tab to be fully ready
          await safeWait(page, 200);
        } else {
          // Check if there's an error message
          const errorVisible = await page.getByTestId("error-message").isVisible({ timeout: 1000 }).catch(() => false);
          if (errorVisible) {
            const errorText = await page.getByTestId("error-message").textContent();
            // If error says world already exists, that's okay - close the modal and continue
            if (errorText?.includes("already exists") || errorText?.includes("duplicate")) {
              // Close the modal by clicking cancel
              const cancelButton = createWorldDialog.getByRole("button", { name: "Cancel" });
              if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
                await cancelButton.click();
              }
              // Wait a bit for the world to appear
              await safeWait(page, 500);
              // World should already exist, wait for it (try unique name first, then fall back to base name)
              const worldTab = worldContextTablist.getByRole("tab", { name: uniqueWorldName });
              const worldTabExists = await worldTab.isVisible().catch(() => false);
              if (worldTabExists) {
                await expect(worldTab).toBeVisible({ timeout: 3000 });
                // Store the unique world name in page context
                await page.evaluate((name) => {
                  (window as any).__testWorldName = name;
                }, uniqueWorldName);
                hasUniqueWorld = true;
              } else {
                // Fall back to base name for backwards compatibility
                await expect(
                  worldContextTablist.getByRole("tab", { name: "Eldoria" })
                ).toBeVisible({ timeout: 3000 });
              }
            } else {
              // Some other error - close modal and throw
              const cancelButton = createWorldDialog.getByRole("button", { name: "Cancel" });
              if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
                await cancelButton.click();
              }
              throw new Error(`World creation failed: ${errorText}`);
            }
          } else {
            // No error and world doesn't exist - modal might still be open
            // Check if modal is still open and close it
            const modalStillOpen = await createWorldDialog.isVisible().catch(() => false);
            if (modalStillOpen) {
              // Modal didn't close - something went wrong, but try to close it
              const cancelButton = createWorldDialog.getByRole("button", { name: "Cancel" });
              if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
                await cancelButton.click();
              }
            }
            // Wait a bit more and check again
            await safeWait(page, 500);
            const worldTab = worldContextTablist.getByRole("tab", { name: uniqueWorldName });
            const worldTabExists = await worldTab.isVisible().catch(() => false);
            if (worldTabExists) {
              await expect(worldTab).toBeVisible({ timeout: 3000 });
              // Store the unique world name in page context
              await page.evaluate((name) => {
                (window as any).__testWorldName = name;
              }, uniqueWorldName);
              hasUniqueWorld = true;
            } else {
              // Fall back to base name for backwards compatibility
              const baseWorldTab = worldContextTablist.getByRole("tab", { name: "Eldoria" });
              const baseWorldExists = await baseWorldTab.isVisible().catch(() => false);
              if (baseWorldExists) {
                await expect(baseWorldTab).toBeVisible({ timeout: 3000 });
              } else {
                throw new Error(`World "${uniqueWorldName}" was not created and no fallback world found`);
              }
            }
          }
        }
      }
    }
  }

  // Ensure page is still valid before proceeding
  // Use a try-catch to handle cases where isClosed() might throw
  try {
    if (page.isClosed()) {
      throw new Error("Page was closed unexpectedly");
    }
  } catch (error) {
    // If checking isClosed() itself throws, the page is likely in a bad state
    // But don't throw here - let the next operation fail naturally
    // This handles cases where the page is in transition
  }

  // Select the first available world
  // Try to find the unique world name first (for "Eldoria"), then fall back to any world
  // uniqueWorldName already defined above
  let worldTab;
  let worldTabExists = false;
  
  // If we already found the unique world, use it
  if (hasUniqueWorld) {
    worldTab = worldContextTablist.getByRole("tab", { name: uniqueWorldName });
    worldTabExists = true;
  } else {
    // First, try to find the unique world name
    try {
      worldTab = worldContextTablist.getByRole("tab", { name: uniqueWorldName });
      worldTabExists = await worldTab.isVisible().catch(() => false);
    } catch {
      // Can't check, continue
    }
  }
  
  // If unique world not found, try base name "Eldoria"
  if (!worldTabExists) {
    try {
      worldTab = worldContextTablist.getByRole("tab", { name: "Eldoria" });
      worldTabExists = await worldTab.isVisible().catch(() => false);
    } catch {
      // Can't check, continue
    }
  }
  
  // If still not found, just get the first available world
  if (!worldTabExists) {
    try {
      worldTab = worldContextTablist.getByRole("tab").first();
      // Verify it exists
      worldTabExists = await worldTab.isVisible().catch(() => false);
    } catch (error) {
      if (error.message?.includes("closed") || page.isClosed()) {
        throw new Error("Page or browser context was closed while trying to find world tab");
      }
      throw error;
    }
  }
  
  // If we still don't have a world tab, wait a bit more and retry (for concurrent execution)
  if (!worldTabExists) {
    // Wait for worlds to be loaded - check if the tablist is visible first
    await expect(worldContextTablist).toBeVisible({ timeout: 3000 });
    
    // Wait a bit for worlds to appear (may be delayed during concurrent execution or data loading)
    await safeWait(page, 2000);
    
    // Try one more time to find any world
    try {
      // Check if "No worlds" message is visible - if so, we need to create one
      const noWorldsMessage = await page
        .getByText("No worlds have been created yet")
        .isVisible()
        .catch(() => false);
      
      if (noWorldsMessage) {
        // No worlds exist - create one
        await page.getByRole("button", { name: /Snapp/i }).click();
        await page.getByRole("button", { name: "Create world" }).click();
        
        const createWorldDialog = page.getByRole("dialog", { name: /create world/i });
        await expect(createWorldDialog).toBeVisible({ timeout: 3000 });
        
        const worldName = getUniqueCampaignName("Eldoria");
        await page.getByLabel("World name").fill(worldName);
        await page.getByLabel("Description").fill("A high-fantasy realm.");
        await page.getByRole("button", { name: "Save world" }).click();
        
        // Wait for world to be created and appear in the tablist
        await expect(
          worldContextTablist.getByRole("tab", { name: worldName })
        ).toBeVisible({ timeout: 3000 });
        
        worldTab = worldContextTablist.getByRole("tab", { name: worldName });
        worldTabExists = true;
      } else {
        // Try to find any world tab
        worldTab = worldContextTablist.getByRole("tab").first();
        worldTabExists = await worldTab.isVisible().catch(() => false);
      }
    } catch (error) {
      // Still can't find it - check if page is closed
      if (error.message?.includes("closed") || page.isClosed()) {
        throw new Error("Page or browser context was closed while trying to find world tab");
      }
    }
    
    if (!worldTabExists) {
      throw new Error("No world found to select. This may indicate a race condition during concurrent test execution or that worlds aren't being loaded properly.");
    }
  }
  
  // Ensure the tab is visible and clickable
  try {
    await expect(worldTab).toBeVisible({ timeout: 3000 });
  } catch (error) {
    // Check if page is actually closed - be defensive about this check
    let actuallyClosed = false;
    try {
      // Only check if page is closed if we can safely do so
      if (!page.isClosed()) {
        actuallyClosed = false;
      } else {
        actuallyClosed = true;
      }
    } catch {
      // Can't check page state - might be in transition, don't assume it's closed
      // Just rethrow the original error
      throw error;
    }
    
    // Only throw page closed error if we're certain the page is closed
    if (actuallyClosed) {
      throw new Error("Page or browser context was closed while waiting for world tab to be visible");
    }
    // If error mentions "closed" but page isn't actually closed, it might be a false positive
    // Just rethrow the original error
    throw error;
  }
  
  // Get the world name for debugging
  const worldName = await worldTab.textContent().catch(() => "unknown");
  
  // Click the tab - it's a button element, so clicking should work
  // Try clicking at a specific position (center) to avoid nested elements
  try {
    const box = await worldTab.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      // Fallback to regular click if bounding box isn't available
      await worldTab.click({ force: true });
    }
  } catch (error) {
    if (error.message?.includes("closed") || page.isClosed()) {
      throw new Error("Page or browser context was closed while clicking world tab");
    }
    throw error;
  }
  
  // Wait for the world to be selected - the most reliable indicator is planning tabs appearing
  // The PlanningTabs component renders when both activeMode === "plan" and selectedIds.worldId is set
  // During concurrent execution, state updates may take longer, so wait a bit first
  await safeWait(page, 500);
  
  // Wait for any pending network requests to complete (but don't wait too long)
  try {
    await page.waitForLoadState("networkidle", { timeout: 3000 });
  } catch {
    // If networkidle times out quickly, that's okay - just continue
  }
  
  // Ensure page is still valid before waiting for planning tabs
  if (page.isClosed()) {
    throw new Error("Page was closed unexpectedly after world selection");
  }
  
  // Wait for planning mode to be active and planning sub-tabs to appear
  // This is the most reliable indicator that a world is selected
  // During concurrent execution, React state updates may be delayed
  // Retry a few times with increasing waits
  let planningTabsVisible = false;
  let retries = 0;
  const maxRetries = 5;
  
  while (!planningTabsVisible && retries < maxRetries) {
    planningTabsVisible = await page
      .getByRole("tablist", { name: "World planning views" })
      .isVisible()
      .catch(() => false);
    
    if (!planningTabsVisible) {
      retries++;
      if (retries < maxRetries) {
        // Wait a bit longer each retry (exponential backoff)
        await safeWait(page, 300 * retries);
        
        // Check if page is still valid
        if (page.isClosed()) {
          throw new Error("Page was closed while waiting for planning tabs to appear");
        }
      }
    }
  }
  
  if (!planningTabsVisible) {
    // Check if we're actually in a world (world context should be hidden)
    const worldContextVisible = await page
      .getByRole("tablist", { name: "World context" })
      .isVisible()
      .catch(() => false);
    
    // If world context is visible, we're not in a world - the click might not have worked
    if (worldContextVisible) {
      // Try clicking the world tab again
      await safeWait(page, 500);
      try {
        await worldTab.click({ force: true });
        await safeWait(page, 500);
        // Check again for planning tabs
        planningTabsVisible = await page
          .getByRole("tablist", { name: "World planning views" })
          .isVisible()
          .catch(() => false);
      } catch (clickError) {
        // Click failed, continue to error
      }
    }
    
    // Final attempt with explicit wait
    if (!planningTabsVisible) {
      try {
        await expect(
          page.getByRole("tablist", { name: "World planning views" })
        ).toBeVisible({ timeout: 5000 });
      } catch (error) {
        // If page closed, throw a more helpful error
        if (page.isClosed()) {
          throw new Error("Page was closed while waiting for planning tabs to appear");
        }
        // Otherwise, check if we're still on the page and provide more context
        const currentUrl = page.url();
        const worldContextStillVisible = await page
          .getByRole("tablist", { name: "World context" })
          .isVisible()
          .catch(() => false);
        
        // Check if world tab is still visible/selected
        const worldTabStillVisible = await worldTab.isVisible().catch(() => false);
        const worldTabSelected = worldTabStillVisible 
          ? await worldTab.getAttribute("aria-selected") === "true"
          : false;
        
        throw new Error(
          `Planning tabs did not appear after selecting world after ${maxRetries} retries. ` +
          `URL: ${currentUrl}, World context visible: ${worldContextStillVisible}, ` +
          `World tab visible: ${worldTabStillVisible}, World tab selected: ${worldTabSelected}`
        );
      }
    }
  }

  // Navigate to the requested sub-tab if not already on it
  if (subTab !== "World Entities") {
    // Ensure page is still valid
    if (page.isClosed()) {
      throw new Error("Page was closed before navigating to sub-tab");
    }
    
    // Wait for the planning tablist to be visible before accessing it
    const planningTablist = page.getByRole("tablist", { name: "World planning views" });
    await expect(planningTablist).toBeVisible({ timeout: 3000 });
    
    const subTabButton = planningTablist.getByRole("tab", { name: subTab });
    
    // Check if already on the requested tab
    const isActive = await subTabButton.getAttribute("aria-selected").catch(() => null);
    if (isActive === "true") {
      return; // Already on the correct tab
    }
    
    await expect(subTabButton).toBeVisible({ timeout: 3000 });
    await subTabButton.click();
    
    // Wait a moment for the tab switch to complete
    await safeWait(page, 300);
  }
}

/**
 * Helper function to ensure a campaign exists, creating it if needed.
 * Handles the case where the campaign might already exist (e.g., from a previous test run).
 */
export async function ensureCampaignExists(
  page: Page,
  campaignName: string,
  summary: string
) {
  // Ensure page is still valid
  if (page.isClosed()) {
    throw new Error("Page was closed unexpectedly");
  }

  // Ensure we're in planning mode with a world selected
  // Check if planning tabs are visible (indicates world is selected)
  const planningTabsVisible = await page
    .getByRole("tablist", { name: "World planning views" })
    .isVisible()
    .catch(() => false);

  if (!planningTabsVisible) {
    // Need to select a world first
    await selectWorldAndEnterPlanningMode(page, "Campaigns");
  }

  // Ensure we're on the Campaigns tab
  const campaignsTab = page
    .getByRole("tablist", { name: "World planning views" })
    .getByRole("tab", { name: "Campaigns" });
  const isOnCampaignsTab = await campaignsTab.isVisible().catch(() => false);
  if (!isOnCampaignsTab) {
    await campaignsTab.click();
    await safeWait(page, 300); // Wait for tab switch
  }

  // Check if campaign is already selected (campaign views visible means campaign is selected)
  const campaignViewsVisible = await page
    .getByRole("tablist", { name: "Campaign views" })
    .isVisible()
    .catch(() => false);

  // If a campaign is selected, check if it's the one we want
  if (campaignViewsVisible) {
    // Check if the selected campaign is the one we want by looking for its name in the heading
    const selectedCampaignHeading = page
      .locator('h3.snapp-heading')
      .filter({ hasText: campaignName })
      .first();
    
    const isCorrectCampaign = await selectedCampaignHeading.isVisible().catch(() => false);
    
    if (isCorrectCampaign) {
      // The campaign we want is already selected, we're done
      return;
    }
    
    // A different campaign is selected - we need to deselect it
    // Navigate to a different planning tab and back to reset the selection
    const worldEntitiesTab = page
      .getByRole("tablist", { name: "World planning views" })
      .getByRole("tab", { name: "World Entities" });
    
    if (await worldEntitiesTab.isVisible().catch(() => false)) {
      await worldEntitiesTab.click();
      await page.waitForTimeout(500);
      
      // Now navigate back to Campaigns
      await campaignsTab.click();
      await page.waitForTimeout(500);
      
      // Re-check if campaign views are still visible (they shouldn't be after navigation)
      const stillSelected = await page
        .getByRole("tablist", { name: "Campaign views" })
        .isVisible()
        .catch(() => false);
      
      if (stillSelected) {
        // Still selected - try clicking the Campaigns tab again to force reset
        await campaignsTab.click();
        await page.waitForTimeout(500);
      }
    }
  }

  // Wait a bit for UI to settle after any navigation
  await safeWait(page, 200);
  
  // Re-check campaign views visibility after potential deselection
  const campaignViewsStillVisible = await page
    .getByRole("tablist", { name: "Campaign views" })
    .isVisible()
    .catch(() => false);
  
  // Check if we can create a campaign (no campaign views means no campaign selected)
  const createButtonVisible = !campaignViewsStillVisible;

  // If campaign views are still visible, check if it's the campaign we want
  // OR if create button is visible, no campaign is selected (even if views are visible from previous state)
  if (campaignViewsStillVisible && !createButtonVisible) {
    const selectedCampaignHeading = page
      .locator('h3.snapp-heading')
      .filter({ hasText: campaignName })
      .first();
    
    const isCorrectCampaign = await selectedCampaignHeading.isVisible().catch(() => false);
    if (isCorrectCampaign) {
      return; // Already have the correct campaign selected
    }
    // Different campaign selected - use the "Leave Campaign" button from Snapp menu to deselect
    // First, ensure we're actually viewing a campaign (campaign views should be visible)
    const campaignViewsCurrentlyVisible = await page
      .getByRole("tablist", { name: "Campaign views" })
      .isVisible()
      .catch(() => false);
    
    let deselectionSucceeded = false;
    
    if (campaignViewsCurrentlyVisible) {
      // Campaign is selected - try to deselect it, but if it fails, we'll work around it
      // Only try once to avoid causing issues - if deselection fails, we'll try to work with the existing selection
      try {
        // Check page state before attempting deselection
        if (page.isClosed()) {
          // Page is closed, can't deselect - skip deselection and continue
          deselectionSucceeded = false;
        } else {
          // Open Snapp menu
          await page.getByRole("button", { name: /^Snapp/i }).click();
          
          // Check page state after opening menu
          if (page.isClosed()) {
            // Page closed, skip deselection
            deselectionSucceeded = false;
          } else {
            // Wait for menu to be visible and "Leave Campaign" button to appear
            const leaveCampaignButton = page.getByRole("button", { name: "Leave Campaign" });
            const buttonVisible = await leaveCampaignButton.isVisible({ timeout: 2000 }).catch(() => false);
            
            if (buttonVisible && !page.isClosed()) {
              // Click to deselect the campaign
              await leaveCampaignButton.click();
              // Wait for state to update
              await safeWait(page, 300);
              
              // Check if campaign views disappeared (indicates deselection worked)
              if (!page.isClosed()) {
                const campaignViewsGone = !(await page
                  .getByRole("tablist", { name: "Campaign views" })
                  .isVisible()
                  .catch(() => false));
                
                if (campaignViewsGone) {
                  // Successfully deselected! Campaign views are gone
                  deselectionSucceeded = true;
                }
              }
            }
          }
        }
      } catch (error) {
        // Deselection failed - that's okay, we'll try to work around it
        // Check if page is closed - if so, we can't continue
        let pageClosed = false;
        try {
          pageClosed = page.isClosed();
        } catch {
          // Can't check - assume page is in bad state, skip deselection
          pageClosed = true;
        }
        
        if (pageClosed) {
          // Page is closed, can't continue with this approach
          // But don't throw - let the function try alternative approaches
          deselectionSucceeded = false;
        } else {
          // Page is still open, deselection just failed - that's okay
          // We'll try to work with the existing selection or try alternative approaches
          deselectionSucceeded = false;
        }
      }
    } else {
      // Campaign views not visible - might mean no campaign is selected after all
      // This is fine, continue to normal flow
      deselectionSucceeded = true; // No need to deselect if nothing is selected
    }
    
    // If deselection succeeded, continue with normal flow (skip error handling)
    if (deselectionSucceeded) {
      // Wait a bit more for UI to fully settle
      await safeWait(page, 200);
      // Continue to normal campaign creation/selection logic below
    } else {
      // Deselection didn't work - check if campaign is still selected and handle error
      const finalCampaignViewsVisible = await page
        .getByRole("tablist", { name: "Campaign views" })
        .isVisible()
        .catch(() => false);
      
      if (finalCampaignViewsVisible) {
      // Still can't deselect - check if the campaign we want already exists
      // Look for it in the heading (if it's selected) or anywhere in the UI
      const campaignNameVisible = await page
        .getByText(campaignName)
        .first()
        .isVisible()
        .catch(() => false);
      
      if (campaignNameVisible) {
        // Campaign exists - check if it's currently selected
        const selectedCampaignHeading = page
          .locator('h3.snapp-heading')
          .filter({ hasText: campaignName })
          .first();
        
        const isCorrectCampaign = await selectedCampaignHeading.isVisible().catch(() => false);
        if (isCorrectCampaign) {
          return; // Already have the correct campaign selected
        }
        
        // Campaign exists but not selected - try to deselect first, then select it
        // Try using "Leave Campaign" from Snapp menu to deselect
        try {
          if (!page.isClosed()) {
            await page.getByRole("button", { name: /^Snapp/i }).click();
            const leaveCampaignButton = page.getByRole("button", { name: "Leave Campaign" });
            const buttonVisible = await leaveCampaignButton.isVisible({ timeout: 2000 }).catch(() => false);
            if (buttonVisible && !page.isClosed()) {
              await leaveCampaignButton.click();
              await safeWait(page, 300);
            }
          }
        } catch {
          // Deselection failed - that's okay, try to select anyway
        }
        
        // Now try to find and select the campaign tab
        // Even if tabs are not visible, they might exist in the DOM
        const hiddenCampaignTab = page
          .getByRole("tab", { name: campaignName })
          .first();
        
        const tabExists = await hiddenCampaignTab.count().catch(() => 0) > 0;
        if (tabExists) {
          // Try to click it even if not visible
          try {
            if (!page.isClosed()) {
              await hiddenCampaignTab.click({ force: true, timeout: 2000 });
              await safeWait(page, 300);
              // Check if it worked
              const nowSelected = await selectedCampaignHeading.isVisible().catch(() => false);
              if (nowSelected) {
                return; // Successfully selected the campaign
              }
            }
          } catch {
            // Force click didn't work, continue with error
          }
        }
        
        // Campaign exists but we can't select it after trying to deselect
        // This might happen if deselection failed - throw a helpful error
        throw new Error(`Campaign "${campaignName}" exists but cannot be selected. Attempted to deselect current campaign but selection still failed.`);
      }
      
      // Campaign doesn't exist and we can't create it because another is selected
      // Try using the Snapp menu "New Campaign" button as a last resort
      try {
        // Open Snapp menu
        await page.getByRole("button", { name: /^Snapp/i }).click();
        // Try to click New Campaign button
        const newCampaignButton = page.getByRole("button", { name: "New Campaign" });
        if (await newCampaignButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await newCampaignButton.click();
          // If that worked, continue with creation flow
          const dialog = page.getByRole("dialog", { name: /create campaign/i });
          const dialogVisible = await dialog.isVisible({ timeout: 2000 }).catch(() => false);
          if (dialogVisible) {
            // Success! Continue with creation
            await page.getByLabel("Campaign name").fill(campaignName);
            await page.getByLabel("Summary").fill(summary);
            await page.getByRole("button", { name: "Save campaign" }).click();
            
            // Wait for creation to complete
            await Promise.race([
              dialog.waitFor({ state: "hidden", timeout: 3000 }).catch(() => null),
              page.getByTestId("error-message").waitFor({ timeout: 3000 }).catch(() => null),
              page.getByRole("tab", { name: campaignName }).waitFor({ timeout: 3000 }).catch(() => null)
            ]);
            
            // Check if campaign was created
            const campaignTab = await page.getByRole("tab", { name: campaignName }).first().isVisible().catch(() => false);
            if (campaignTab) {
              // Campaign created, select it
              await page.getByRole("tab", { name: campaignName }).first().click();
              await expect(
                page.getByRole("tablist", { name: "Campaign views" })
              ).toBeVisible({ timeout: 3000 });
              return; // Success!
            }
          }
        }
      } catch {
        // Menu button didn't work, fall through to error
      }
      
        // Campaign doesn't exist and we still can't deselect after trying Leave Campaign button
        // This shouldn't happen with the Leave Campaign button, but handle it gracefully
        throw new Error(
          `Cannot create campaign "${campaignName}" because another campaign is selected and could not be deselected using the Leave Campaign button. ` +
          `This may indicate a UI state issue.`
        );
      }
    }
  }

  // Check if campaign tab exists (only visible when no campaign is selected)
  // Wait a moment for UI to settle after navigation
  await safeWait(page, 200);
  
  const hasCampaignTab = await page
    .getByRole("tab", { name: campaignName })
    .first()
    .isVisible()
    .catch(() => false);

  // Also check if campaign exists by looking for it in any visible form (heading, tab, etc.)
  const campaignExistsAnywhere = hasCampaignTab || 
    (await page.getByText(campaignName).first().isVisible().catch(() => false));

  // If no campaign is selected, we can create a campaign via Snapp menu
  // If campaign tab exists, we can select it
  // If campaign views are visible and it's the correct campaign, we're done (handled above)
  if (!campaignExistsAnywhere && createButtonVisible) {
    // Campaign doesn't exist and we can create it
    // Use the Snapp menu "New Campaign" button
    // First check if a campaign was auto-selected while we were checking
    await safeWait(page, 300);
    const newCampaignViewsVisible = await page
      .getByRole("tablist", { name: "Campaign views" })
      .isVisible()
      .catch(() => false);
    
    if (newCampaignViewsVisible) {
      // A campaign was selected - check if it's the one we want
      const selectedCampaignHeading = page
        .locator('h3.snapp-heading')
        .filter({ hasText: campaignName })
        .first();
      
      const isCorrectCampaign = await selectedCampaignHeading.isVisible().catch(() => false);
      if (isCorrectCampaign) {
        return; // Already have the correct campaign selected
      }
      // Wrong campaign selected - use "Leave Campaign" from Snapp menu to deselect
      await page.getByRole("button", { name: /^Snapp/i }).click();
      const leaveCampaignButton = page.getByRole("button", { name: "Leave Campaign" });
      if (await leaveCampaignButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await leaveCampaignButton.click();
        await safeWait(page, 300);
      }
    }
    
    // Open Snapp menu and click "New Campaign"
    // Check page state before interacting
    try {
      if (page.isClosed()) {
        throw new Error("Page was closed before opening Snapp menu");
      }
      await page.getByRole("button", { name: /^Snapp/i }).click();
      const newCampaignButton = page.getByRole("button", { name: "New Campaign" });
      await expect(newCampaignButton).toBeVisible({ timeout: 3000 });
      
      // Check page state again before clicking
      if (page.isClosed()) {
        throw new Error("Page was closed before clicking New Campaign");
      }
      await newCampaignButton.click();
    } catch (error) {
      // Check if page is actually closed - be defensive
      let actuallyClosed = false;
      try {
        actuallyClosed = page.isClosed();
      } catch {
        // Can't check - might be in transition, rethrow original error
        throw error;
      }
      
      // Only throw page closed error if we're certain the page is closed
      if (actuallyClosed) {
        throw new Error("Page was closed while trying to create campaign via Snapp menu");
      }
      // Otherwise, rethrow the original error
      throw error;
    }
    const createCampaignDialog = page.getByRole("dialog", { name: /create campaign/i });
    await expect(createCampaignDialog).toBeVisible({ timeout: 3000 });
    
    await page.getByLabel("Campaign name").fill(campaignName);
    await page.getByLabel("Summary").fill(summary);
    await page.getByRole("button", { name: "Save campaign" }).click();

    // Wait for either the modal to close, an error message, or the campaign tab to appear
    await Promise.race([
      createCampaignDialog.waitFor({ state: "hidden", timeout: 3000 }).catch(() => null),
      page.getByTestId("error-message").waitFor({ timeout: 3000 }).catch(() => null),
      page.getByRole("tab", { name: campaignName }).waitFor({ timeout: 3000 }).catch(() => null)
    ]);

    // Check for errors first
    const errorMessage = await page.getByTestId("error-message").isVisible().catch(() => false);
    if (errorMessage) {
      // Campaign might already exist, close the modal manually
      const cancelButton = createCampaignDialog.getByRole("button", { name: "Cancel" });
      if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();
      }
    } else {
      // No error - modal should be closed, but if it's still open, wait a bit more
      const stillOpen = await createCampaignDialog.isVisible().catch(() => false);
      if (stillOpen) {
        // Give it a moment, then check if campaign tab appeared (success)
        await page.waitForTimeout(1000);
        const campaignTabVisible = await page.getByRole("tab", { name: campaignName }).isVisible().catch(() => false);
        if (campaignTabVisible) {
          // Success - close modal manually if still open
          const cancelButton = createCampaignDialog.getByRole("button", { name: "Cancel" });
          if (await cancelButton.isVisible().catch(() => false)) {
            await cancelButton.click();
          }
        }
      }
    }

    // After creation, wait for UI to update
    await safeWait(page, 500);
    
    // Check if campaign was auto-selected (campaign views visible)
    const campaignViewsVisible = await page
      .getByRole("tablist", { name: "Campaign views" })
      .isVisible()
      .catch(() => false);
    
    if (campaignViewsVisible) {
      // Campaign was auto-selected - check if it's the one we want
      const selectedCampaignHeading = page
        .locator('h3.snapp-heading')
        .filter({ hasText: campaignName })
        .first();
      
      const isCorrectCampaign = await selectedCampaignHeading.isVisible().catch(() => false);
      if (isCorrectCampaign) {
        // Campaign is already selected, we're done
        return;
      }
      // Wrong campaign selected - use "Leave Campaign" from Snapp menu to deselect
      await page.getByRole("button", { name: /^Snapp/i }).click();
      const leaveCampaignButton = page.getByRole("button", { name: "Leave Campaign" });
      if (await leaveCampaignButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await leaveCampaignButton.click();
        await safeWait(page, 300);
      }
    }
    
    // Campaign tab should be visible (campaign not yet selected)
    // Click it to select the campaign
    // Check page state before interacting
    try {
      if (page.isClosed()) {
        throw new Error("Page was closed before selecting campaign tab");
      }
      const campaignTab = page.getByRole("tab", { name: campaignName }).first();
      await expect(campaignTab).toBeVisible({ timeout: 3000 });
      
      // Check page state again before clicking
      if (page.isClosed()) {
        throw new Error("Page was closed before clicking campaign tab");
      }
      await campaignTab.click();
    } catch (error) {
      // Check if page is actually closed - be defensive
      let actuallyClosed = false;
      try {
        actuallyClosed = page.isClosed();
      } catch {
        // Can't check - might be in transition, rethrow original error
        throw error;
      }
      
      // Only throw page closed error if we're certain the page is closed
      if (actuallyClosed) {
        throw new Error("Page was closed while trying to select campaign");
      }
      // Otherwise, rethrow the original error
      throw error;
    }
    // Wait for campaign views to appear (indicating campaign is selected)
    await expect(
      page.getByRole("tablist", { name: "Campaign views" })
    ).toBeVisible({ timeout: 3000 });
  } else if (hasCampaignTab && !campaignViewsStillVisible) {
    // Campaign exists but not selected - select it
    try {
      if (page.isClosed()) {
        throw new Error("Page was closed before selecting existing campaign");
      }
      const campaignTab = page.getByRole("tab", { name: campaignName }).first();
      await expect(campaignTab).toBeVisible({ timeout: 3000 });
      
      if (page.isClosed()) {
        throw new Error("Page was closed before clicking existing campaign tab");
      }
      await campaignTab.click();
      await expect(
        page.getByRole("tablist", { name: "Campaign views" })
      ).toBeVisible({ timeout: 3000 });
    } catch (error) {
      if (page.isClosed() || error.message?.includes("closed") || error.message?.includes("Target page")) {
        throw new Error("Page was closed while trying to select existing campaign");
      }
      throw error;
    }
  } else if (campaignExistsAnywhere && !hasCampaignTab && !campaignViewsStillVisible) {
    // Campaign exists somewhere but we can't see the tab
    // This might mean it was just created or is in a weird state
    // Try waiting a bit more and checking again
    await safeWait(page, 500);
    const campaignTabAfterWait = await page
      .getByRole("tab", { name: campaignName })
      .first()
      .isVisible()
      .catch(() => false);
    
    if (campaignTabAfterWait) {
      await page.getByRole("tab", { name: campaignName }).first().click();
      await expect(
        page.getByRole("tablist", { name: "Campaign views" })
      ).toBeVisible({ timeout: 3000 });
    } else {
      // Campaign might be selected but we can't see it - try to find it via heading
      const campaignHeading = page
        .locator('h3.snapp-heading')
        .filter({ hasText: campaignName })
        .first();
      
      const headingVisible = await campaignHeading.isVisible().catch(() => false);
      if (headingVisible) {
        // Campaign is already selected, we're done
        return;
      }
      
      // If we get here, something is wrong - campaign exists but we can't find it
      throw new Error(`Campaign "${campaignName}" appears to exist but cannot be found or selected in the UI`);
    }
  }
  // If campaignViewsStillVisible is true and it's the correct campaign, we already returned earlier
  
  // Final check - ensure page is still open before returning
  // This helps catch cases where the page closes asynchronously
  try {
    if (page.isClosed()) {
      throw new Error("Page was closed during ensureCampaignExists");
    }
  } catch (error) {
    // If checking isClosed() throws, the page is likely in a bad state
    // But don't throw here - let the next operation fail naturally
  }
}
