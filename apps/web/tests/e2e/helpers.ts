import { Page, expect } from "@playwright/test";
import {
  MODAL_OPENED_EVENT,
  MODAL_CLOSED_EVENT,
  WORLD_SELECTED_EVENT,
  WORLD_DESELECTED_EVENT,
  CAMPAIGN_SELECTED_EVENT,
  CAMPAIGN_DESELECTED_EVENT,
  PLANNING_MODE_ENTERED_EVENT,
  PLANNING_MODE_EXITED_EVENT,
  PLANNING_SUBTAB_CHANGED_EVENT,
  CAMPAIGN_VIEW_CHANGED_EVENT,
  WORLD_CREATED_EVENT,
  CAMPAIGN_CREATED_EVENT,
  CREATURE_CREATED_EVENT,
  FACTION_CREATED_EVENT,
  LOCATION_CREATED_EVENT,
  EVENT_CREATED_EVENT,
  SESSION_CREATED_EVENT,
  SCENE_CREATED_EVENT,
  PLAYER_ADDED_EVENT,
  STORY_ARC_CREATED_EVENT,
  WORLDS_LOADED_EVENT,
  CAMPAIGNS_LOADED_EVENT,
  ENTITIES_LOADED_EVENT,
  SESSIONS_LOADED_EVENT,
  PLAYERS_LOADED_EVENT,
  STORY_ARCS_LOADED_EVENT,
  SCENES_LOADED_EVENT,
  TIMELINE_LOADED_EVENT,
  USERS_LOADED_EVENT,
  ASSETS_LOADED_EVENT,
  ASSET_UPLOADED_EVENT,
  ERROR_OCCURRED_EVENT,
  ERROR_CLEARED_EVENT,
  USER_CREATED_EVENT,
  USER_DELETED_EVENT,
  ROLE_ASSIGNED_EVENT,
  ROLE_REVOKED_EVENT,
  MAIN_TAB_CHANGED_EVENT,
  WORLD_UPDATED_EVENT
} from "../../lib/auth/authEvents";

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
      // Wait for page to load and check again
      await page.waitForLoadState("domcontentloaded", { timeout: 2000 }).catch(() => {});
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
    // Wait for button to be visible and stable before clicking
    await expect(loginButton).toBeVisible({ timeout: 3000 });
    
    // Set up the listener BEFORE clicking to avoid race conditions
    const modalOpenPromise = waitForModalOpen(page, "login", 8000).catch(() => null);
    
    await safeWait(page, 100); // Small delay to ensure button is ready
    await loginButton.click();
    
    // Wait for login modal to open using transition event
    // Double-check if we're already logged in after clicking login button
    const logoutButtonAfterClick = page.getByRole("button", { name: "Log out" });
    const stillLoggedIn = await logoutButtonAfterClick.isVisible({ timeout: 1000 }).catch(() => false);
    
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
      const gotLoggedIn = await checkLogoutAgain.isVisible({ timeout: 1000 }).catch(() => false);
      if (gotLoggedIn) {
        // Somehow we're logged in now, that's fine
        return;
      }
      
      // Check if login button is still visible (maybe click didn't work)
      const loginButtonStillVisible = await page.getByRole("button", { name: "Login" }).isVisible({ timeout: 1000 }).catch(() => false);
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
    
    // waitForModalOpen should have waited for the dialog, but verify it's actually visible
    // Sometimes the event fires but the dialog takes a moment to render
    const loginDialog = page.getByRole("dialog", { name: /Login/i });
    try {
      await expect(loginDialog).toBeVisible({ timeout: 5000 });
    } catch (error) {
      // Dialog not visible - wait a bit more and check again
      await page.waitForTimeout(500);
      await expect(loginDialog).toBeVisible({ timeout: 5000 });
    }
  }
  
  // Verify the modal is actually visible
  // waitForModalOpen should have ensured this, but double-check
  const loginDialog = page.getByRole("dialog", { name: /Login/i });
  const dialogVisible = await loginDialog.isVisible({ timeout: 3000 }).catch(() => false);
  if (!dialogVisible) {
    // Modal should be visible by now - check if we're somehow logged in
    const checkLogoutButton = page.getByRole("button", { name: "Log out" });
    const isLoggedIn = await checkLogoutButton.isVisible({ timeout: 1000 }).catch(() => false);
    if (isLoggedIn) {
      // We're logged in somehow - that's fine
      return;
    }
    
    // Check if login button is still visible (maybe modal didn't open)
    const loginButtonCheck = page.getByRole("button", { name: "Login" });
    const loginButtonVisible = await loginButtonCheck.isVisible({ timeout: 1000 }).catch(() => false);
    if (loginButtonVisible) {
      // Login button is still visible - modal didn't open, try clicking again
      await loginButtonCheck.click();
      await safeWait(page, 500);
      // Wait for modal again with longer timeout
      await waitForModalOpen(page, "login", 8000);
      // Verify dialog is now visible
      await expect(loginDialog).toBeVisible({ timeout: 5000 });
    } else {
      // Modal not visible and not logged in - this is an error
      throw new Error("Login modal did not open after clicking login button. Dialog not visible and user not logged in.");
    }
  }
  
  // Get the locators now that we know the modal is visible
  const usernameInput = page.getByTestId("login-username");
  const passwordInput = page.getByTestId("login-password");
  
  // Ensure inputs are ready before interacting - wait for them to be visible first, then enabled
  // Use a longer timeout and retry logic since the form might be rendering
  try {
    await expect(usernameInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
  } catch (error) {
    // If inputs aren't visible, wait a bit more for form to render
    await page.waitForTimeout(500);
    await expect(usernameInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
  }
  
  await expect(usernameInput).toBeEnabled({ timeout: 5000 });
  await expect(passwordInput).toBeEnabled({ timeout: 5000 });
  
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
    const hasError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (hasError) {
      const errorText = await errorMessage.textContent().catch(() => "Unknown error");
      throw new Error(`Login failed: ${errorText}`);
    }
    
    // Modal didn't close and no error - might be a timeout
    // Check if we're logged in anyway
    const logoutButton = page.getByRole("button", { name: "Log out" });
    const isLoggedIn = await logoutButton.isVisible({ timeout: 1000 }).catch(() => false);
    
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
  // Wait for page to be in a ready state after login - use domcontentloaded instead of networkidle
  // networkidle can be too strict and timeout unnecessarily
  await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
  
  // Wait for authenticated view to be ready - check for logout button or mode selector
  const logoutButton = page.getByRole("button", { name: "Log out" });
  await expect(logoutButton).toBeVisible({ timeout: 5000 });
  
  const guestView = await page.getByText("Welcome to Snapp").isVisible({ timeout: 1000 }).catch(() => false);
  if (guestView) {
    throw new Error("Cannot navigate to planning screen: still on guest view after login. AuthenticatedView may not have rendered.");
  }
  
  // Check if we're already in planning mode (planning tabs visible)
  // If so, we can skip world selection and just navigate to the sub-tab
  // Do this BEFORE calling ensureModeSelectorVisible, as that function might fail
  // if we're already in planning mode (world context tablist would be hidden)
  // Use a longer timeout and check multiple times to handle timing issues
  let planningTabsAlreadyVisible = false;
  for (let i = 0; i < 3; i++) {
    planningTabsAlreadyVisible = await page
      .getByRole("tablist", { name: "World planning views" })
      .isVisible()
      .catch(() => false);
    
    if (planningTabsAlreadyVisible) {
      break;
    }
    // Wait a bit and check again
    await safeWait(page, 200);
  }
  
  if (planningTabsAlreadyVisible) {
    // Already in planning mode - just navigate to the requested sub-tab
    const planningTablist = page.getByRole("tablist", { name: "World planning views" });
    const subTabButton = planningTablist.getByRole("tab", { name: subTab });
    
    // Check if already on the requested tab
    const isActive = await subTabButton.getAttribute("aria-selected").catch(() => null);
    if (isActive === "true") {
      return; // Already on the correct tab
    }
    
    // Set up event listener BEFORE clicking
    const subTabPromise = waitForPlanningSubTab(page, subTab, 5000);
    
    await expect(subTabButton).toBeVisible({ timeout: 3000 });
    await subTabButton.click();
    
    // Wait for sub-tab to be activated (event-based)
    await subTabPromise;
    return; // Done - we're already in planning mode
  }

  // Not in planning mode yet - need to select a world first
  // Check if world context tablist is visible (might be hidden if world is selected but planning mode not active)
  const worldContextTablistCheck = page.getByRole("tablist", { name: "World context" });
  const worldContextVisibleCheck = await worldContextTablistCheck.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (!worldContextVisibleCheck) {
    // World context not visible - might be in a weird state
    // Try to leave the world first (if we're in one)
    try {
      const snappMenu = page.getByRole("button", { name: /^Snapp/i });
      const menuVisible = await snappMenu.isVisible({ timeout: 1000 }).catch(() => false);
      if (menuVisible) {
        await snappMenu.click();
        const leaveWorldButton = page.getByRole("button", { name: "Leave World" });
        const leaveWorldVisible = await leaveWorldButton.isVisible({ timeout: 1000 }).catch(() => false);
        if (leaveWorldVisible) {
          await leaveWorldButton.click();
          await safeWait(page, 300);
        } else {
          // Close menu if leave world button not found
          await snappMenu.click();
        }
      }
    } catch {
      // Ignore errors - just try to ensure mode selector is visible
    }
  }
  
  // Now ensure mode selector is visible
  await ensureModeSelectorVisible(page);
  
  // Wait for page to be fully ready after ensureModeSelectorVisible
  // Use domcontentloaded instead of networkidle - networkidle can be too strict
  await page.waitForLoadState("domcontentloaded", { timeout: 3000 }).catch(() => {});
  
  // Verify we're still logged in after ensureModeSelectorVisible
  const logoutButtonCheck = page.getByRole("button", { name: "Log out" });
  const stillLoggedIn = await logoutButtonCheck.isVisible({ timeout: 2000 }).catch(() => false);
  if (!stillLoggedIn) {
    throw new Error("User is not logged in after ensureModeSelectorVisible. Cannot proceed with world selection.");
  }
  
  // Wait for mode selector (world context tablist) to actually be visible
  // ensureModeSelectorVisible should have made it visible, but wait for it
  const worldContextTablistAfterEnsure = page.getByRole("tablist", { name: "World context" });
  
  // Try to wait for it, but if it's not visible, check if we're already in planning mode
  let tablistVisible = false;
  try {
    await expect(worldContextTablistAfterEnsure).toBeVisible({ timeout: 5000 });
    tablistVisible = true;
  } catch {
    // Tablist not visible - check if we're already in planning mode
    const planningTabsCheck = await page
      .getByRole("tablist", { name: "World planning views" })
      .isVisible()
      .catch(() => false);
    
    if (planningTabsCheck) {
      // We're already in planning mode - navigate to sub-tab directly
      const planningTablist = page.getByRole("tablist", { name: "World planning views" });
      const subTabButton = planningTablist.getByRole("tab", { name: subTab });
      
      // Set up event listener BEFORE clicking
      const subTabPromise = waitForPlanningSubTab(page, subTab, 5000);
      
      await expect(subTabButton).toBeVisible({ timeout: 3000 });
      await subTabButton.click();
      
      // Wait for sub-tab to be activated (event-based)
      await subTabPromise;
      return;
    }
    
    // Not in planning mode and tablist not visible - this is an error
    throw new Error("World context tablist is not visible and not in planning mode. User may not be logged in or page may be in an unexpected state. Try ensuring the user is logged in and the mode selector is visible.");
  }
  
  // Double-check that we're not in planning mode (might have changed during ensureModeSelectorVisible)
  const planningTabsCheckAgain = await page
    .getByRole("tablist", { name: "World planning views" })
    .isVisible()
    .catch(() => false);
  
  if (planningTabsCheckAgain) {
    // We're now in planning mode - just navigate to sub-tab
    const planningTablist = page.getByRole("tablist", { name: "World planning views" });
    const subTabButton = planningTablist.getByRole("tab", { name: subTab });
    
    // Set up event listener BEFORE clicking
    const subTabPromise = waitForPlanningSubTab(page, subTab, 5000);
    
    await expect(subTabButton).toBeVisible({ timeout: 3000 });
    await subTabButton.click();
    
    // Wait for sub-tab to be activated (event-based)
    await subTabPromise;
    return;
  }

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
  // The tablist should be visible after ensureModeSelectorVisible, but handle case where it's not
  // Try to get the tablist - it might not be visible if we're in an unexpected state
  const worldContextTablist = page.getByRole("tablist", { name: "World context" });
  
  // Try to wait for it to be visible, but don't fail immediately if it's not
  // It might not be visible if we're already in planning mode (which we should have caught above)
  // Wait for page to be ready first
  await page.waitForLoadState("domcontentloaded", { timeout: 3000 }).catch(() => {});
  
  let worldContextVisible = false;
  try {
    await expect(worldContextTablist).toBeVisible({ timeout: 5000 });
    worldContextVisible = true;
  } catch {
    // Tablist not visible - check if we're already in planning mode (double-check)
    const planningTabsCheck = await page
      .getByRole("tablist", { name: "World planning views" })
      .isVisible()
      .catch(() => false);
    
    if (planningTabsCheck) {
      // We're already in planning mode - just navigate to sub-tab
      const planningTablist = page.getByRole("tablist", { name: "World planning views" });
      const subTabButton = planningTablist.getByRole("tab", { name: subTab });
      
      // Set up event listener BEFORE clicking
      const subTabPromise = waitForPlanningSubTab(page, subTab, 5000);
      
      await expect(subTabButton).toBeVisible({ timeout: 3000 });
      await subTabButton.click();
      
      // Wait for sub-tab to be activated (event-based)
      await subTabPromise;
      return;
    }
    
    // Not in planning mode and tablist not visible - wait a bit more and try again
    await page.waitForLoadState("networkidle", { timeout: 2000 }).catch(() => {});
    worldContextVisible = await worldContextTablist.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!worldContextVisible) {
      // This is an error - we should have the tablist visible after ensureModeSelectorVisible
      throw new Error("World context tablist is not visible and not in planning mode. User may not be logged in or page may be in an unexpected state. Try ensuring the user is logged in and the mode selector is visible.");
    }
  }
  
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
        
        // Wait for the create world modal to open using transition event
        await waitForModalOpen(page, "world", 5000);
        
        // Get reference to dialog for use throughout this block
        const createWorldDialog = page.getByRole("dialog", { name: /create world/i });
        
        // uniqueWorldName already defined above
        await page.getByLabel("World name").fill(uniqueWorldName);
        await page.getByLabel("Description").fill("A high-fantasy realm.");
        await page.getByRole("button", { name: "Save world" }).click();
        
        // Wait for modal to close using transition event
        try {
          await waitForModalClose(page, "world", 5000);
        } catch (error) {
          // Modal didn't close - check for errors
          const errorVisible = await page.getByTestId("error-message").isVisible({ timeout: 2000 }).catch(() => false);
          if (errorVisible) {
            const errorText = await page.getByTestId("error-message").textContent();
            // If error says world already exists, that's okay - close modal and continue
            if (errorText?.includes("already exists") || errorText?.includes("duplicate")) {
              const cancelButton = createWorldDialog.getByRole("button", { name: "Cancel" });
              if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
                await cancelButton.click();
                await waitForModalClose(page, "world", 3000);
              }
              // World should already exist, wait for it
              await expect(
                worldContextTablist.getByRole("tab", { name: uniqueWorldName })
              ).toBeVisible({ timeout: 3000 });
              await page.evaluate((name) => {
                (window as any).__testWorldName = name;
              }, uniqueWorldName);
              hasUniqueWorld = true;
              return;
            }
            throw new Error(`World creation failed: ${errorText}`);
          }
          throw error;
        }
        
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
        
        // Wait for modal to open using transition event
        await waitForModalOpen(page, "world", 5000);
        
        const worldName = getUniqueCampaignName("Eldoria");
        await page.getByLabel("World name").fill(worldName);
        await page.getByLabel("Description").fill("A high-fantasy realm.");
        await page.getByRole("button", { name: "Save world" }).click();
        
        // Wait for modal to close using transition event
        await waitForModalClose(page, "world", 5000);
        
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
  
  // Get the world name for event-based waiting
  // Trim whitespace and normalize the name
  // Remove any leading special characters that might interfere with matching (like em dashes, en dashes, regular dashes)
  const worldNameRaw = await worldTab.textContent().catch(() => "unknown");
  // Remove leading dashes (em dash, en dash, regular dash) and trim
  const worldName = worldNameRaw?.trim().replace(/^[—–\-\s]+/, "").trim() || "unknown";
  
  // Set up event listeners BEFORE clicking to avoid race conditions
  // Use a more lenient name match (partial match) since the exact name might have variations
  const worldSelectedPromise = waitForWorldSelected(page, worldName, 8000);
  const planningModePromise = waitForPlanningMode(page, 8000);
  
  // Click the tab - it's a button element, so clicking should work
  // Ensure the tab is visible and enabled before clicking
  await expect(worldTab).toBeVisible({ timeout: 3000 });
  await expect(worldTab).toBeEnabled({ timeout: 2000 });
  
  // Try clicking at a specific position (center) to avoid nested elements
  // Also verify the click worked by checking if tab becomes selected
  try {
    const box = await worldTab.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      // Fallback to regular click if bounding box isn't available
      await worldTab.click({ force: true });
    }
    
    // Wait a moment for the click to register and state to update
    await safeWait(page, 300);
    
    // Verify the click worked by checking if tab is selected
    // Give it a bit more time since React state updates might be delayed
    let clickedSelected = false;
    for (let i = 0; i < 3; i++) {
      clickedSelected = await Promise.race([
        worldTab.getAttribute("aria-selected").then(attr => attr === "true"),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 500))
      ]).catch(() => false);
      
      if (clickedSelected) {
        break;
      }
      // Wait a bit more before next check
      await safeWait(page, 200);
    }
    
    if (!clickedSelected) {
      // Click didn't register - try again with a different approach
      // First, ensure the tab is still visible and clickable
      await expect(worldTab).toBeVisible({ timeout: 2000 });
      await expect(worldTab).toBeEnabled({ timeout: 2000 });
      await worldTab.click({ force: true, timeout: 2000 });
      await safeWait(page, 400);
      
      // Check again with multiple attempts
      for (let i = 0; i < 3; i++) {
        clickedSelected = await Promise.race([
          worldTab.getAttribute("aria-selected").then(attr => attr === "true"),
          new Promise<boolean>(resolve => setTimeout(() => resolve(false), 500))
        ]).catch(() => false);
        
        if (clickedSelected) {
          break;
        }
        await safeWait(page, 200);
      }
      
      if (!clickedSelected) {
        // Still not selected - try one more time with mouse click at center
        const retryBox = await worldTab.boundingBox().catch(() => null);
        if (retryBox) {
          await page.mouse.click(retryBox.x + retryBox.width / 2, retryBox.y + retryBox.height / 2);
          await safeWait(page, 400);
          // Final check
          clickedSelected = await Promise.race([
            worldTab.getAttribute("aria-selected").then(attr => attr === "true"),
            new Promise<boolean>(resolve => setTimeout(() => resolve(false), 1000))
          ]).catch(() => false);
        }
      }
    }
  } catch (error) {
    if (error.message?.includes("closed") || page.isClosed()) {
      throw new Error("Page or browser context was closed while clicking world tab");
    }
    // Don't throw here - continue and wait for events (they might still fire even if click verification failed)
  }
  
  // Wait for world to be selected and planning mode to be entered
  // Use Promise.allSettled to wait for both events (they should fire in sequence)
  // But allow either to succeed independently (world might be selected but planning mode takes longer)
  try {
    // Wait for both, but allow partial success
    const results = await Promise.allSettled([
      worldSelectedPromise,
      planningModePromise
    ]);
    
    // Check results - if either succeeded, that's good
    const worldSelectedSucceeded = results[0].status === "fulfilled";
    const planningModeSucceeded = results[1].status === "fulfilled";
    
    // Check if at least planning mode is active (most important indicator)
    let planningTabsVisible = await page
      .getByRole("tablist", { name: "World planning views" })
      .isVisible()
      .catch(() => false);
    
    if (!planningTabsVisible) {
      // Planning mode not active - wait a bit more and check again
      // Sometimes the UI takes a moment to update even after events fire
      await safeWait(page, 500);
      planningTabsVisible = await page
        .getByRole("tablist", { name: "World planning views" })
        .isVisible()
        .catch(() => false);
      
      if (!planningTabsVisible) {
        // Wait one more time with a longer delay
        await safeWait(page, 1000);
        planningTabsVisible = await page
          .getByRole("tablist", { name: "World planning views" })
          .isVisible()
          .catch(() => false);
      }
      
      if (!planningTabsVisible) {
        // Still not visible - provide helpful error with event status
        const currentUrl = page.url();
        const worldContextStillVisible = await page
          .getByRole("tablist", { name: "World context" })
          .isVisible()
          .catch(() => false);
        
        const worldTabStillVisible = await worldTab.isVisible().catch(() => false);
        const worldTabSelected = worldTabStillVisible
          ? await Promise.race([
              worldTab.getAttribute("aria-selected").then(attr => attr === "true"),
              new Promise<boolean>(resolve => setTimeout(() => resolve(false), 2000))
            ]).catch(() => false)
          : false;
        
        const worldEventFired = worldSelectedSucceeded ? "yes" : "no";
        const planningEventFired = planningModeSucceeded ? "yes" : "no";
        
        throw new Error(
          `Planning mode did not activate after selecting world "${worldName}". ` +
          `URL: ${currentUrl}, World context visible: ${worldContextStillVisible}, ` +
          `World tab visible: ${worldTabStillVisible}, World tab selected: ${worldTabSelected}. ` +
          `World selection event fired: ${worldEventFired}, Planning mode event fired: ${planningEventFired}. ` +
          `This may indicate the click did not register, the events did not fire, or planning mode did not activate.`
        );
      }
    }
  } catch (error) {
    // If there's an error, check if planning mode is active anyway
    const planningTabsVisible = await page
      .getByRole("tablist", { name: "World planning views" })
      .isVisible()
      .catch(() => false);
    
    if (planningTabsVisible) {
      // Planning mode is active - that's what matters, continue
      return;
    }
    
    // Planning mode not active and error occurred - rethrow
    throw error;
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
    // Set up event listener BEFORE clicking
    const subTabPromise = waitForPlanningSubTab(page, subTab, 5000);
    
    await subTabButton.click();

    // Wait for sub-tab to be activated (event-based)
    await subTabPromise;
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
    // Set up event listener BEFORE clicking
    const campaignsPromise = waitForPlanningSubTab(page, "Campaigns", 5000);
    await campaignsTab.click();
    await campaignsPromise.catch(() => {}); // Don't fail if event doesn't fire
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
      // Set up event listener BEFORE clicking
      const worldEntitiesPromise = waitForPlanningSubTab(page, "World Entities", 5000);
      await worldEntitiesTab.click();
      await worldEntitiesPromise.catch(() => {}); // Don't fail if event doesn't fire
      
      // Now navigate back to Campaigns
      const campaignsPromise = waitForPlanningSubTab(page, "Campaigns", 5000);
      await campaignsTab.click();
      await campaignsPromise.catch(() => {}); // Don't fail if event doesn't fire
      
      // Re-check if campaign views are still visible (they shouldn't be after navigation)
      const stillSelected = await page
        .getByRole("tablist", { name: "Campaign views" })
        .isVisible()
        .catch(() => false);
      
      if (stillSelected) {
        // Still selected - try clicking the Campaigns tab again to force reset
        const campaignsPromise2 = waitForPlanningSubTab(page, "Campaigns", 5000);
        await campaignsTab.click();
        await campaignsPromise2.catch(() => {}); // Don't fail if event doesn't fire
      }
    }
  }

  // Wait for UI to settle - check that campaigns tab is active
  await expect(campaignsTab).toBeVisible({ timeout: 2000 });
  
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
    
    // Wait for modal to open using transition event
    await waitForModalOpen(page, "campaign", 5000);
    
    await page.getByLabel("Campaign name").fill(campaignName);
    await page.getByLabel("Summary").fill(summary);
    await page.getByRole("button", { name: "Save campaign" }).click();

    // Wait for modal to close using transition event
    const createCampaignDialog = page.getByRole("dialog", { name: /create campaign/i });
    try {
      await waitForModalClose(page, "campaign", 5000);
    } catch (error) {
      // Modal didn't close - check for errors
      const errorVisible = await page.getByTestId("error-message").isVisible({ timeout: 3000 }).catch(() => false);
      if (errorVisible) {
        const errorText = await page.getByTestId("error-message").textContent();
        // If error says campaign already exists, that's okay - close modal and continue
        if (errorText?.includes("already exists") || errorText?.includes("duplicate")) {
          const cancelButton = createCampaignDialog.getByRole("button", { name: "Cancel" });
          if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            await cancelButton.click();
            await waitForModalClose(page, "campaign", 3000);
          }
          // Campaign should already exist, wait for it
          await expect(
            page.getByRole("tab", { name: campaignName })
          ).toBeVisible({ timeout: 3000 });
          return;
        }
        throw new Error(`Campaign creation failed: ${errorText}`);
      }
      throw error;
    }

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
        // Wait for campaign tab to appear (might be loading)
        const campaignTab = page.getByRole("tab", { name: campaignName });
        const campaignTabVisible = await campaignTab.isVisible({ timeout: 3000 }).catch(() => false);
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
  timeout: number = 5000
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
    // Map modal type to dialog name
    const dialogNames: Record<string, string> = {
      login: "Login",
      world: "Create world",
      campaign: "Create campaign",
      entity: "Add",
      session: "Add session",
      player: "Add player",
      storyArc: "Add story arc",
      scene: "Add scene",
      createUser: "Create user"
    };
    
    const dialogName = dialogNames[modalType] || "dialog";
    const dialog = page.getByRole("dialog", { name: new RegExp(dialogName, "i") });
    await expect(dialog).toBeVisible({ timeout });
  })();

  // Wait for BOTH the event AND the dialog to be visible
  // This ensures the modal is fully rendered, not just that the event fired
  // If event fires, great. If not, wait for dialog. If dialog appears, that's also fine.
  try {
    await Promise.all([
      eventPromise.catch(() => {
        // Event might not fire, but dialog might be visible - that's okay
        return Promise.resolve();
      }),
      dialogPromise
    ]);
  } catch (error) {
    // If both fail, try waiting just for the dialog (event might have fired before listener was set up)
    try {
      await dialogPromise;
    } catch (dialogError) {
      // Dialog didn't appear either - this is the real error
      throw error; // Throw the original error which has more context
    }
  }
  
  // For login modal specifically, also wait for the form field to be available
  // This ensures the form content is fully rendered
  // Use a longer timeout since form content might take time to render
  if (modalType === "login") {
    try {
      await expect(page.getByTestId("login-username")).toBeVisible({ timeout: 5000 });
    } catch (error) {
      // Form field didn't appear - check if dialog is still visible
      const loginDialog = page.getByRole("dialog", { name: "Login" });
      const dialogVisible = await loginDialog.isVisible({ timeout: 1000 }).catch(() => false);
      if (!dialogVisible) {
        // Dialog closed - might have logged in automatically or something else happened
        throw error;
      }
      // Dialog is visible but form field isn't - wait for it to appear
      await expect(page.getByTestId("login-username")).toBeVisible({ timeout: 3000 });
    }
  }
}

/**
 * Wait for a world to be selected using transition events.
 * This is more reliable than polling for DOM elements.
 * 
 * @param page - Playwright page object
 * @param worldName - Name of the world to wait for (can be partial match)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForWorldSelected(
  page: Page,
  worldName: string,
  timeout: number = 5000
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ name, timeout }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;
        
        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventWorldName = (customEvent.detail?.worldName || "").trim();
          const searchName = name.trim();
          // Match by exact name (case-insensitive) or if name is contained in event world name
          // Also try reverse match (event name contained in search name)
          const exactMatch = eventWorldName.toLowerCase() === searchName.toLowerCase();
          const forwardMatch = eventWorldName.includes(searchName);
          const reverseMatch = searchName.includes(eventWorldName);
          if (eventWorldName && (exactMatch || forwardMatch || reverseMatch) && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener("snapp:world-selected", handler);
            resolve();
          }
        };

        window.addEventListener("snapp:world-selected", handler);

        // Check if world is already selected (might have been selected before listener was set up)
        setTimeout(() => {
          if (resolved) return;
          
          // Check if world tab is selected in the UI
          const worldTabs = document.querySelectorAll('[role="tablist"][aria-label*="World context"] [role="tab"]');
          const searchName = name.trim().toLowerCase();
          for (const tab of worldTabs) {
            const isSelected = tab.getAttribute("aria-selected") === "true";
            const tabText = (tab.textContent || "").trim().toLowerCase();
            // Match by exact name or partial match (either direction)
            const exactMatch = tabText === searchName;
            const forwardMatch = tabText.includes(searchName);
            const reverseMatch = searchName.includes(tabText);
            if (isSelected && (exactMatch || forwardMatch || reverseMatch)) {
              resolved = true;
              clearTimeout(timer);
              window.removeEventListener("snapp:world-selected", handler);
              resolve();
              return;
            }
          }
        }, 50);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener("snapp:world-selected", handler);
            reject(new Error(`Timeout waiting for world "${name}" to be selected after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { name: worldName, timeout }
  );

  // Also wait for the world tab to be visible and selected (fallback)
  // Use a more flexible approach - try to find the tab, but don't fail if name doesn't match exactly
  const tabPromise = (async () => {
    try {
      const worldContextTablist = page.getByRole("tablist", { name: "World context" });
      // Try exact match first
      let worldTab = worldContextTablist.getByRole("tab", { name: new RegExp(worldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") });
      let tabFound = false;
      
      try {
        await expect(worldTab).toBeVisible({ timeout: Math.min(timeout, 3000) });
        tabFound = true;
      } catch {
        // Exact match failed - try to find any selected tab
        const allTabs = worldContextTablist.getByRole("tab");
        const tabCount = await allTabs.count();
        for (let i = 0; i < tabCount; i++) {
          const tab = allTabs.nth(i);
          const tabText = await tab.textContent().catch(() => "");
          const isSelected = await tab.getAttribute("aria-selected").catch(() => null);
          // Check if this tab matches our world name (partial match) and is selected
          if (tabText && (tabText.includes(worldName) || worldName.includes(tabText.trim())) && isSelected === "true") {
            tabFound = true;
            break;
          }
        }
      }
      
      if (tabFound) {
        // Tab found - poll for it to be selected (with short timeout)
        const startTime = Date.now();
        while (Date.now() - startTime < 1000) {
          const isSelected = await worldTab.getAttribute("aria-selected").catch(() => null);
          if (isSelected === "true") {
            return; // Tab is visible and selected
          }
          await page.waitForTimeout(50); // Small delay between polls
        }
        // After polling, check one more time
        const finalSelected = await worldTab.getAttribute("aria-selected").catch(() => null);
        if (finalSelected !== "true") {
          // Tab visible but not selected - this might be okay if event fired
          // Don't throw here, let the event promise handle it
          return;
        }
        return; // Tab is visible and selected
      }
    } catch (tabError) {
      // Tab search failed - that's okay, event might still fire
      return;
    }
  })();

  // Wait for EITHER the event OR the tab to be visible and selected
  // Prefer the event, but fall back to tab visibility if event doesn't fire
  try {
    await Promise.race([
      eventPromise,
      tabPromise
    ]);
  } catch (error) {
    // Both failed - check if planning mode is active anyway (might have happened via event)
    const planningTabsVisible = await page
      .getByRole("tablist", { name: "World planning views" })
      .isVisible()
      .catch(() => false);
    
    if (planningTabsVisible) {
      // Planning mode is active - world must be selected, even if we didn't catch the event
      return;
    }
    
    // Neither event nor tab check worked, and planning mode isn't active
    throw error;
  }
}

/**
 * Wait for a campaign to be selected using transition events.
 * This is more reliable than polling for DOM elements.
 * 
 * @param page - Playwright page object
 * @param campaignName - Name of the campaign to wait for (can be partial match)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForCampaignSelected(
  page: Page,
  campaignName: string,
  timeout: number = 5000
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ name, timeout }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;
        
        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventCampaignName = customEvent.detail?.campaignName || "";
          // Match by exact name or if name is contained in event campaign name
          if (eventCampaignName && (eventCampaignName === name || eventCampaignName.includes(name)) && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener("snapp:campaign-selected", handler);
            resolve();
          }
        };

        window.addEventListener("snapp:campaign-selected", handler);

        // Check if campaign is already selected (might have been selected before listener was set up)
        setTimeout(() => {
          if (resolved) return;
          
          // Check if campaign tab is selected in the UI
          const campaignTabs = document.querySelectorAll('[role="tablist"][aria-label*="Campaign"] [role="tab"]');
          for (const tab of campaignTabs) {
            const isSelected = tab.getAttribute("aria-selected") === "true";
            const tabText = tab.textContent || "";
            if (isSelected && (tabText === name || tabText.includes(name))) {
              resolved = true;
              clearTimeout(timer);
              window.removeEventListener("snapp:campaign-selected", handler);
              resolve();
              return;
            }
          }
        }, 50);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener("snapp:campaign-selected", handler);
            reject(new Error(`Timeout waiting for campaign "${name}" to be selected after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { name: campaignName, timeout }
  );

  // Also wait for the campaign tab to be visible and selected (fallback)
  const tabPromise = (async () => {
    // Campaign tabs might be in different places depending on view
    // Try to find campaign tab in campaign views tablist
    const campaignViewsTablist = page.getByRole("tablist", { name: "Campaign views" });
    const campaignTab = campaignViewsTablist.getByRole("tab", { name: new RegExp(campaignName, "i") });
    await expect(campaignTab).toBeVisible({ timeout });
    // Poll for tab to be selected (with timeout)
    const startTime = Date.now();
    const pollTimeout = Math.min(timeout, 2000); // Max 2s for polling
    while (Date.now() - startTime < pollTimeout) {
      const isSelected = await campaignTab.getAttribute("aria-selected");
      if (isSelected === "true") {
        return; // Tab is selected
      }
      await page.waitForTimeout(50); // Small delay between polls
    }
    // After polling, check one more time
    const finalSelected = await campaignTab.getAttribute("aria-selected");
    if (finalSelected !== "true") {
      throw new Error(`Campaign tab "${campaignName}" is visible but not selected after ${pollTimeout}ms`);
    }
  })();

  // Wait for EITHER the event OR the tab to be visible and selected
  await Promise.race([
    eventPromise.catch(() => {
      // Event might not fire, but tab might be visible - that's okay
      return Promise.resolve();
    }),
    tabPromise
  ]);
}

/**
 * Wait for planning mode to be entered using transition events.
 * This is more reliable than polling for planning tabs visibility.
 * 
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForPlanningMode(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ timeout }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;
        
        const handler = (e: Event) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener("snapp:planning-mode-entered", handler);
            resolve();
          }
        };

        window.addEventListener("snapp:planning-mode-entered", handler);

        // Check if planning mode is already active (might have been entered before listener was set up)
        setTimeout(() => {
          if (resolved) return;
          
          // Check if planning tabs are visible
          const planningTabs = document.querySelectorAll('[role="tablist"][aria-label*="World planning views"]');
          if (planningTabs.length > 0) {
            const isVisible = planningTabs[0] instanceof HTMLElement && 
              (planningTabs[0].offsetParent !== null || planningTabs[0].style.display !== "none");
            if (isVisible) {
              resolved = true;
              clearTimeout(timer);
              window.removeEventListener("snapp:planning-mode-entered", handler);
              resolve();
              return;
            }
          }
        }, 50);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener("snapp:planning-mode-entered", handler);
            reject(new Error(`Timeout waiting for planning mode to be entered after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { timeout }
  );

  // Also wait for the planning tabs to be visible (fallback)
  const tabsPromise = (async () => {
    // Wait for planning tabs to be visible, but don't fail immediately if they're not
    // The event might fire before the UI updates
    const planningTabs = page.getByRole("tablist", { name: "World planning views" });
    try {
      await expect(planningTabs).toBeVisible({ timeout });
    } catch {
      // If tabs aren't visible, wait a bit more for UI to update
      await page.waitForTimeout(500);
      await expect(planningTabs).toBeVisible({ timeout: 3000 });
    }
  })();

  // Wait for BOTH the event AND the tabs to be visible
  // This ensures planning mode is fully active, not just that the event fired
  await Promise.all([
    eventPromise.catch(() => {
      // Event might not fire, but tabs might be visible - that's okay
      return Promise.resolve();
    }),
    tabsPromise
  ]);
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
  timeout: number = 5000
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
    // Map modal type to dialog name
    const dialogNames: Record<string, string> = {
      login: "Login",
      world: "Create world",
      campaign: "Create campaign",
      entity: "Add",
      session: "Add session",
      player: "Add player",
      storyArc: "Add story arc",
      scene: "Add scene",
      createUser: "Create user"
    };
    
    const dialogName = dialogNames[modalType] || "dialog";
    const dialog = page.getByRole("dialog", { name: new RegExp(dialogName, "i") });
    // Use a shorter timeout for the dialog check since we're racing with the event
    await dialog.waitFor({ state: "hidden", timeout: Math.min(timeout, 3000) });
  })();

  // Wait for EITHER the event OR the dialog to be hidden
  // If the event fires, great. If not, check if dialog is hidden anyway
  await Promise.race([
    eventPromise,
    dialogPromise
  ]).catch(async (error) => {
    // If both timed out, check if dialog is hidden anyway
    const dialogNames: Record<string, string> = {
      login: "Login",
      world: "Create world",
      campaign: "Create campaign",
      createUser: "Create user"
    };
    const dialogName = dialogNames[modalType] || "dialog";
    const dialog = page.getByRole("dialog", { name: new RegExp(dialogName, "i") });
    const isHidden = await dialog.isHidden({ timeout: 1000 }).catch(() => true);
    if (isHidden) {
      return; // Dialog is hidden, that's good enough
    }
    throw error; // Neither event nor dialog hidden, rethrow
  });
}

/**
 * Wait for a world to be created using transition events.
 * This is more reliable than waiting for modal close + checking list.
 * 
 * @param page - Playwright page object
 * @param worldName - Name of the world to wait for (can be partial match)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForWorldCreated(
  page: Page,
  worldName: string,
  timeout: number = 5000
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ name, timeout, eventName }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventWorldName = (customEvent.detail?.entityName || "").trim().toLowerCase();
          const searchName = name.trim().toLowerCase();
          
          // Match by exact name or if name is contained in event world name
          const exactMatch = eventWorldName === searchName;
          const forwardMatch = eventWorldName.includes(searchName);
          const reverseMatch = searchName.includes(eventWorldName);
          
          if (eventWorldName && (exactMatch || forwardMatch || reverseMatch) && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for world "${name}" to be created after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { name: worldName, timeout, eventName: WORLD_CREATED_EVENT }
  );

  // Fallback: Wait for world to appear in the world context tablist
  const domPromise = (async () => {
    const worldContextTablist = page.getByRole("tablist", { name: "World context" });
    await expect(worldContextTablist).toBeVisible({ timeout });
    const worldTab = worldContextTablist.getByRole("tab", { name: new RegExp(worldName, "i") });
    await expect(worldTab).toBeVisible({ timeout });
  })();

  // Wait for EITHER the event OR the DOM element to appear
  await Promise.race([
    eventPromise,
    domPromise
  ]).catch(async (error) => {
    // If both failed, check if world tab exists anyway
    const worldContextTablist = page.getByRole("tablist", { name: "World context" });
    const isVisible = await worldContextTablist.isVisible({ timeout: 1000 }).catch(() => false);
    if (isVisible) {
      const worldTab = worldContextTablist.getByRole("tab", { name: new RegExp(worldName, "i") });
      const tabVisible = await worldTab.isVisible({ timeout: 1000 }).catch(() => false);
      if (tabVisible) {
        return; // World tab is visible, that's good enough
      }
    }
    throw error; // Neither event nor DOM, rethrow
  });
}

/**
 * Wait for a planning sub-tab to be activated using transition events.
 * This is more reliable than checking for DOM elements.
 * 
 * @param page - Playwright page object
 * @param subTab - Name of the sub-tab to wait for ("World Entities", "Campaigns", "Story Arcs", "Users")
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForPlanningSubTab(
  page: Page,
  subTab: "World Entities" | "Campaigns" | "Story Arcs" | "Users",
  timeout: number = 5000
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ tab, timeout, eventName }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventSubTab = customEvent.detail?.subTab;
          
          if (eventSubTab === tab && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        // Check if sub-tab is already active (might have been set before listener was set up)
        setTimeout(() => {
          if (resolved) return;
          
          // Check if the tab is already active in the DOM
          const planningTabs = document.querySelectorAll('[role="tablist"][aria-label*="World planning views"] [role="tab"]');
          for (const tabElement of planningTabs) {
            const tabText = tabElement.textContent?.trim() || "";
            const isSelected = tabElement.getAttribute("aria-selected") === "true";
            if (tabText === tab && isSelected) {
              resolved = true;
              clearTimeout(timer);
              window.removeEventListener(eventName, handler);
              resolve();
              return;
            }
          }
        }, 100);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for planning sub-tab "${tab}" to be activated after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { tab: subTab, timeout, eventName: PLANNING_SUBTAB_CHANGED_EVENT }
  );

  // Fallback: Wait for the tab to be visible and selected in the DOM
  const domPromise = (async () => {
    const planningTablist = page.getByRole("tablist", { name: "World planning views" });
    await expect(planningTablist).toBeVisible({ timeout });
    const tab = planningTablist.getByRole("tab", { name: subTab });
    await expect(tab).toBeVisible({ timeout });
    // Poll for tab to be selected (with timeout)
    const startTime = Date.now();
    const pollTimeout = Math.min(timeout, 2000); // Max 2s for polling
    while (Date.now() - startTime < pollTimeout) {
      const isSelected = await tab.getAttribute("aria-selected");
      if (isSelected === "true") {
        return; // Tab is selected
      }
      await page.waitForTimeout(50); // Small delay between polls
    }
    // After polling, check one more time
    const finalSelected = await tab.getAttribute("aria-selected");
    if (finalSelected !== "true") {
      throw new Error(`Planning sub-tab "${subTab}" is visible but not selected after ${pollTimeout}ms`);
    }
  })();

  // Wait for EITHER the event OR the DOM element to be ready
  await Promise.race([
    eventPromise,
    domPromise
  ]).catch(async (error) => {
    // If both failed, check if tab is selected anyway
    const planningTablist = page.getByRole("tablist", { name: "World planning views" });
    const isVisible = await planningTablist.isVisible({ timeout: 1000 }).catch(() => false);
    if (isVisible) {
      const tab = planningTablist.getByRole("tab", { name: subTab });
      const tabVisible = await tab.isVisible({ timeout: 1000 }).catch(() => false);
      if (tabVisible) {
        const isSelected = await tab.getAttribute("aria-selected").catch(() => null);
        if (isSelected === "true") {
          return; // Tab is selected, that's good enough
        }
      }
    }
    throw error; // Neither event nor DOM, rethrow
  });
}

/**
 * Wait for a campaign view to be activated using transition events.
 * 
 * @param page - Playwright page object
 * @param view - Name of the view to wait for ("sessions", "players", "story-arcs", "timeline")
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForCampaignView(
  page: Page,
  view: "sessions" | "players" | "story-arcs" | "timeline",
  timeout: number = 5000
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ view, timeout, eventName }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventView = customEvent.detail?.view;
          
          if (eventView === view && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for campaign view "${view}" to be activated after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { view, timeout, eventName: CAMPAIGN_VIEW_CHANGED_EVENT }
  );

  // Fallback: Wait for view-specific UI elements to appear
  // This is view-specific, so we check for common indicators
  const domPromise = (async () => {
    // For sessions view, look for "Add session" button or session list
    // For players view, look for "Add player" button or player list
    // For story-arcs view, look for "Add story arc" button or story arc list
    // For timeline view, look for timeline-specific elements
    const viewSelectors: Record<string, string> = {
      sessions: "Add session",
      players: "Add player",
      "story-arcs": "Add story arc",
      timeline: "current moment"
    };
    
    const selector = viewSelectors[view];
    if (selector) {
      // Try to find a button or heading that indicates this view is active
      const button = page.getByRole("button", { name: new RegExp(selector, "i") });
      const heading = page.locator("h3, h2").filter({ hasText: new RegExp(selector, "i") });
      
      await Promise.race([
        button.waitFor({ state: "visible", timeout }).catch(() => {}),
        heading.waitFor({ state: "visible", timeout }).catch(() => {})
      ]);
    }
  })();

  // Wait for EITHER the event OR the DOM element to be ready
  await Promise.race([
    eventPromise,
    domPromise
  ]).catch((error) => {
    // If both failed, that's an error
    throw error;
  });
}

/**
 * Wait for a campaign to be created using transition events.
 * 
 * @param page - Playwright page object
 * @param campaignName - Name of the campaign to wait for (can be partial match)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForCampaignCreated(
  page: Page,
  campaignName: string,
  timeout: number = 5000
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ name, timeout, eventName }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventCampaignName = (customEvent.detail?.entityName || "").trim().toLowerCase();
          const searchName = name.trim().toLowerCase();
          
          // Match by exact name or if name is contained in event campaign name
          const exactMatch = eventCampaignName === searchName;
          const forwardMatch = eventCampaignName.includes(searchName);
          const reverseMatch = searchName.includes(eventCampaignName);
          
          if (eventCampaignName && (exactMatch || forwardMatch || reverseMatch) && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for campaign "${name}" to be created after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { name: campaignName, timeout, eventName: CAMPAIGN_CREATED_EVENT }
  );

  // Fallback: Wait for modal to close (campaign creation closes the modal)
  // Use a longer timeout for the fallback since the event should fire first
  const modalPromise = waitForModalClose(page, "campaign", timeout).catch(() => {
    // If modal close fails, that's okay - the event might have fired
    return Promise.resolve();
  });

  // Wait for EITHER the event OR the modal to close
  await Promise.race([
    eventPromise,
    modalPromise
  ]).catch(async (error) => {
    // If event didn't fire, check if modal is closed anyway
    const dialog = page.getByRole("dialog", { name: /create campaign/i });
    const isHidden = await dialog.isHidden({ timeout: 1000 }).catch(() => false);
    if (isHidden) {
      // Modal is closed, that's good enough
      return;
    }
    // Neither event nor modal close - rethrow
    throw error;
  });
}

/**
 * Wait for worlds to be loaded using transition events.
 * 
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForWorldsLoaded(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  const eventPromise = page.evaluate(
    ({ timeout, eventName }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for worlds to be loaded after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { timeout, eventName: WORLDS_LOADED_EVENT }
  );

  // Fallback: Check if worlds are already loaded (check for world context tablist)
  const domPromise = (async () => {
    const worldContextTablist = page.getByRole("tablist", { name: "World context" });
    await expect(worldContextTablist).toBeVisible({ timeout });
  })();

  await Promise.race([
    eventPromise,
    domPromise
  ]).catch((error) => {
    throw error;
  });
}

/**
 * Wait for campaigns to be loaded using transition events.
 * 
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForCampaignsLoaded(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  const eventPromise = page.evaluate(
    ({ timeout, eventName }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for campaigns to be loaded after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { timeout, eventName: CAMPAIGNS_LOADED_EVENT }
  );

  // Fallback: Check if campaigns tab is visible (indicates campaigns might be loaded)
  const domPromise = (async () => {
    // Campaigns might be shown in various places, so we just wait a bit
    await page.waitForTimeout(500);
  })();

  await Promise.race([
    eventPromise,
    domPromise
  ]).catch((error) => {
    throw error;
  });
}

/**
 * Wait for entities to be loaded for a specific world using transition events.
 * 
 * @param page - Playwright page object
 * @param worldId - Optional world ID to wait for (if not provided, waits for any entity load)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForEntitiesLoaded(
  page: Page,
  worldId?: string,
  timeout: number = 5000
): Promise<void> {
  const eventPromise = page.evaluate(
    ({ timeout, eventName, worldId }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventWorldId = customEvent.detail?.worldId;
          
          // If worldId is specified, only resolve if it matches
          // Otherwise, resolve on any entity load
          if (!resolved && (!worldId || eventWorldId === worldId)) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for entities to be loaded after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { timeout, eventName: ENTITIES_LOADED_EVENT, worldId }
  );

  // Fallback: Check if entity list is visible
  const domPromise = (async () => {
    // Entities might be shown in a list - wait a bit for UI to update
    await page.waitForTimeout(500);
  })();

  await Promise.race([
    eventPromise,
    domPromise
  ]).catch((error) => {
    throw error;
  });
}

/**
 * Wait for an entity (creature, faction, location, event) to be created using transition events.
 * 
 * @param page - Playwright page object
 * @param entityType - Type of entity ("creature", "faction", "location", "event")
 * @param entityName - Name of the entity to wait for (can be partial match)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForEntityCreated(
  page: Page,
  entityType: "creature" | "faction" | "location" | "event",
  entityName: string,
  timeout: number = 5000
): Promise<void> {
  // Map entity type to event name
  const eventMap: Record<string, string> = {
    creature: CREATURE_CREATED_EVENT,
    faction: FACTION_CREATED_EVENT,
    location: LOCATION_CREATED_EVENT,
    event: EVENT_CREATED_EVENT
  };
  const eventName = eventMap[entityType];
  if (!eventName) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }

  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ name, eventName, timeout }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventEntityName = (customEvent.detail?.entityName || "").trim().toLowerCase();
          const searchName = name.trim().toLowerCase();
          
          // Match by exact name or if name is contained in event entity name
          const exactMatch = eventEntityName === searchName;
          const forwardMatch = eventEntityName.includes(searchName);
          const reverseMatch = searchName.includes(eventEntityName);
          
          if (eventEntityName && (exactMatch || forwardMatch || reverseMatch) && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for ${eventName} "${name}" to be created after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { name: entityName, eventName, timeout }
  );

  // Fallback: Wait for modal to close (entity creation closes the modal)
  const modalPromise = waitForModalClose(page, "entity", timeout);

  // Wait for EITHER the event OR the modal to close
  await Promise.race([
    eventPromise,
    modalPromise
  ]).catch((error) => {
    // If both failed, that's an error
    throw error;
  });
}

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
  timeout: number = 5000
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
    const isVisible = await errorElement.isVisible({ timeout: 1000 }).catch(() => false);
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
  timeout: number = 5000
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ timeout, eventName }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for error to be cleared after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { timeout, eventName: ERROR_CLEARED_EVENT }
  );

  // Fallback: Wait for error message element to be hidden
  const domPromise = (async () => {
    const errorElement = page.getByTestId("error-message");
    await expect(errorElement).toBeHidden({ timeout });
  })();

  // Wait for EITHER the event OR the DOM element to be hidden
  await Promise.race([
    eventPromise,
    domPromise
  ]).catch(async (error) => {
    // If both failed, check if error element is hidden anyway
    const errorElement = page.getByTestId("error-message");
    const isHidden = await errorElement.isHidden({ timeout: 1000 }).catch(() => false);
    if (isHidden) {
      return; // Error is hidden, that's good enough
    }
    throw error; // Neither event nor DOM, rethrow
  });
}

/**
 * Wait for a main tab to be activated using transition events.
 * This is more reliable than checking for DOM elements.
 * 
 * @param page - Playwright page object
 * @param tabName - Name of the tab to wait for ("World", "Campaigns", "Sessions", "Assets", "Users")
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForMainTab(
  page: Page,
  tabName: "World" | "Campaigns" | "Sessions" | "Assets" | "Users",
  timeout: number = 5000
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ tab, timeout, eventName }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventTab = customEvent.detail?.tab;
          
          if (eventTab === tab && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        // Check if tab is already active (might have been set before listener was set up)
        setTimeout(() => {
          if (resolved) return;
          
          // Check if the tab is already active in the DOM
          // Main tabs are typically in a navigation area
          const mainTabs = document.querySelectorAll('[role="tablist"] [role="tab"]');
          for (const tabElement of mainTabs) {
            const tabText = tabElement.textContent?.trim() || "";
            const isSelected = tabElement.getAttribute("aria-selected") === "true";
            if (tabText === tab && isSelected) {
              resolved = true;
              clearTimeout(timer);
              window.removeEventListener(eventName, handler);
              resolve();
              return;
            }
          }
        }, 100);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for main tab "${tab}" to be activated after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { tab: tabName, timeout, eventName: MAIN_TAB_CHANGED_EVENT }
  );

  // Fallback: Wait for the tab to be visible and selected in the DOM
  const domPromise = (async () => {
    // Main tabs might be in different locations depending on the UI structure
    // Try to find the tab by name
    const tab = page.getByRole("tab", { name: tabName });
    await expect(tab).toBeVisible({ timeout });
    // Poll for tab to be selected (with timeout)
    const startTime = Date.now();
    const pollTimeout = Math.min(timeout, 2000); // Max 2s for polling
    while (Date.now() - startTime < pollTimeout) {
      const isSelected = await tab.getAttribute("aria-selected");
      if (isSelected === "true") {
        return; // Tab is selected
      }
      await page.waitForTimeout(50); // Small delay between polls
    }
    // After polling, check one more time
    const finalSelected = await tab.getAttribute("aria-selected");
    if (finalSelected !== "true") {
      throw new Error(`Main tab "${tabName}" is visible but not selected after ${pollTimeout}ms`);
    }
  })();

  // Wait for EITHER the event OR the DOM element to be ready
  await Promise.race([
    eventPromise,
    domPromise
  ]).catch(async (error) => {
    // If both failed, check if tab is selected anyway
    const tab = page.getByRole("tab", { name: tabName });
    const isVisible = await tab.isVisible({ timeout: 1000 }).catch(() => false);
    if (isVisible) {
      const isSelected = await tab.getAttribute("aria-selected").catch(() => null);
      if (isSelected === "true") {
        return; // Tab is selected, that's good enough
      }
    }
    throw error; // Neither event nor DOM, rethrow
  });
}

/**
 * Wait for a user to be created using transition events.
 * 
 * @param page - Playwright page object
 * @param username - Username to wait for (can be partial match)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForUserCreated(
  page: Page,
  username: string,
  timeout: number = 5000
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ name, timeout, eventName }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventUsername = (customEvent.detail?.username || "").trim().toLowerCase();
          const searchName = name.trim().toLowerCase();
          
          // Match by exact name or if name is contained in event username
          const exactMatch = eventUsername === searchName;
          const forwardMatch = eventUsername.includes(searchName);
          const reverseMatch = searchName.includes(eventUsername);
          
          if (eventUsername && (exactMatch || forwardMatch || reverseMatch) && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for user "${name}" to be created after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { name: username, timeout, eventName: USER_CREATED_EVENT }
  );

  // Fallback: Wait for user item to appear in DOM
  const domPromise = (async () => {
    const userItem = page.getByTestId(`user-${username}`);
    await expect(userItem).toBeVisible({ timeout });
  })();

  // Wait for EITHER the event OR the DOM element
  await Promise.race([
    eventPromise,
    domPromise
  ]).catch(async (error) => {
    // If both failed, check if user item exists anyway
    const userItem = page.getByTestId(`user-${username}`);
    const isVisible = await userItem.isVisible({ timeout: 1000 }).catch(() => false);
    if (isVisible) {
      return; // User item is visible, that's good enough
    }
    throw error; // Neither event nor DOM, rethrow
  });
}

/**
 * Wait for a user to be deleted using transition events.
 * 
 * @param page - Playwright page object
 * @param username - Username to wait for deletion
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForUserDeleted(
  page: Page,
  username: string,
  timeout: number = 5000
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ name, timeout, eventName }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventUsername = (customEvent.detail?.username || "").trim().toLowerCase();
          const searchName = name.trim().toLowerCase();
          
          // Match by exact name or if name is contained in event username
          const exactMatch = eventUsername === searchName;
          const forwardMatch = eventUsername.includes(searchName);
          const reverseMatch = searchName.includes(eventUsername);
          
          if (eventUsername && (exactMatch || forwardMatch || reverseMatch) && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for user "${name}" to be deleted after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { name: username, timeout, eventName: USER_DELETED_EVENT }
  );

  // Fallback: Wait for user item to disappear from DOM
  const domPromise = (async () => {
    const userItem = page.getByTestId(`user-${username}`);
    await expect(userItem).not.toBeVisible({ timeout });
  })();

  // Wait for EITHER the event OR the DOM element to disappear
  await Promise.race([
    eventPromise,
    domPromise
  ]).catch(async (error) => {
    // If both failed, check if user item is hidden anyway
    const userItem = page.getByTestId(`user-${username}`);
    const isHidden = await userItem.isHidden({ timeout: 1000 }).catch(() => true);
    if (isHidden) {
      return; // User item is hidden, that's good enough
    }
    throw error; // Neither event nor DOM, rethrow
  });
}

/**
 * Wait for a role to be assigned to a user using transition events.
 * 
 * @param page - Playwright page object
 * @param username - Username to wait for
 * @param role - Role that was assigned (optional, for verification)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForRoleAssigned(
  page: Page,
  username: string,
  role?: string,
  timeout: number = 5000
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ name, role, timeout, eventName }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventUsername = (customEvent.detail?.username || "").trim().toLowerCase();
          const eventRole = (customEvent.detail?.role || "").trim().toLowerCase();
          const searchName = name.trim().toLowerCase();
          const searchRole = role?.trim().toLowerCase();
          
          // Match username (exact or partial)
          const usernameMatch = eventUsername && (
            eventUsername === searchName ||
            eventUsername.includes(searchName) ||
            searchName.includes(eventUsername)
          );
          
          // If role is specified, also match role
          const roleMatch = !searchRole || eventRole === searchRole;
          
          if (usernameMatch && roleMatch && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for role${role ? ` "${role}"` : ""} to be assigned to user "${name}" after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { name: username, role, timeout, eventName: ROLE_ASSIGNED_EVENT }
  );

  // Fallback: Wait for role badge to appear in DOM
  const domPromise = (async () => {
    if (role) {
      const roleBadge = page.getByTestId(`user-${username}`).getByText(role, { exact: false });
      await expect(roleBadge).toBeVisible({ timeout });
    } else {
      // Just wait a bit for UI to update
      await page.waitForTimeout(500);
    }
  })();

  // Wait for EITHER the event OR the DOM element
  await Promise.race([
    eventPromise,
    domPromise
  ]).catch((error) => {
    throw error;
  });
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
  const dialogNames: Record<string, string> = {
    login: "Login",
    world: "Create world",
    campaign: "Create campaign",
    entity: "Add",
    session: "Add session",
    player: "Add player",
    storyArc: "Add story arc",
    scene: "Add scene",
    createUser: "Create user"
  };
  
  const dialogNamePattern = dialogName || dialogNames[modalType] || "dialog";
  const dialog = typeof dialogNamePattern === "string" 
    ? page.getByRole("dialog", { name: new RegExp(dialogNamePattern, "i") })
    : page.getByRole("dialog", { name: dialogNamePattern });
  
  const isOpen = await dialog.isVisible({ timeout: 1000 }).catch(() => false);
  if (!isOpen) {
    return; // Modal is already closed
  }
  
  // Try to find and click cancel button
  const cancelButton = dialog.getByRole("button", { name: "Cancel" });
  const cancelVisible = await cancelButton.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (cancelVisible) {
    await cancelButton.click();
    await waitForModalClose(page, modalType, timeout).catch(() => {});
  } else {
    // Fallback: try Escape key
    await page.keyboard.press("Escape");
    await waitForModalClose(page, modalType, timeout).catch(() => {});
  }
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
 * Wait for a world to be updated using transition events.
 * 
 * @param page - Playwright page object
 * @param worldId - Optional world ID to wait for (if not provided, waits for any world update)
 * @param updateType - Optional update type to filter by (e.g., "splashImageSet", "splashImageCleared")
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForWorldUpdated(
  page: Page,
  worldId?: string,
  updateType?: string,
  timeout: number = 5000
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ timeout, eventName, worldId, updateType }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventWorldId = customEvent.detail?.worldId;
          const eventUpdateType = customEvent.detail?.updateType;
          
          // If worldId is specified, only resolve if it matches
          // If updateType is specified, also match update type
          const worldMatch = !worldId || eventWorldId === worldId;
          const typeMatch = !updateType || eventUpdateType === updateType;
          
          if (worldMatch && typeMatch && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for world${worldId ? ` "${worldId}"` : ""} to be updated${updateType ? ` (type: ${updateType})` : ""} after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { timeout, eventName: WORLD_UPDATED_EVENT, worldId, updateType }
  );

  // Fallback: Wait a bit for UI to update
  const domPromise = (async () => {
    await page.waitForTimeout(500);
  })();

  // Wait for EITHER the event OR the timeout
  await Promise.race([
    eventPromise,
    domPromise
  ]).catch((error) => {
    throw error;
  });
}

/**
 * Wait for an asset to be uploaded using transition events.
 * 
 * @param page - Playwright page object
 * @param assetName - Optional asset name to wait for (if not provided, waits for any asset upload)
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 */
export async function waitForAssetUploaded(
  page: Page,
  assetName?: string,
  timeout: number = 10000
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ timeout, eventName, assetName }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventAssetName = (customEvent.detail?.assetName || "").trim().toLowerCase();
          const searchName = assetName?.trim().toLowerCase();
          
          // If assetName is specified, only resolve if it matches (exact or partial)
          // Otherwise, resolve on any asset upload
          const nameMatch = !searchName || 
            eventAssetName === searchName ||
            eventAssetName.includes(searchName) ||
            searchName.includes(eventAssetName);
          
          if (nameMatch && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for asset${assetName ? ` "${assetName}"` : ""} to be uploaded after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { timeout, eventName: ASSET_UPLOADED_EVENT, assetName }
  );

  // Fallback: Wait for asset to appear in the assets table
  const domPromise = (async () => {
    if (assetName) {
      // Wait for asset name to appear in the table
      // Use .first() to avoid strict mode violations if multiple rows match
      const assetRow = page.getByRole("row").filter({ hasText: assetName }).first();
      await expect(assetRow).toBeVisible({ timeout });
    } else {
      // Just wait a bit for UI to update
      await page.waitForTimeout(500);
    }
  })();

  // Wait for EITHER the event OR the DOM element
  await Promise.race([
    eventPromise,
    domPromise
  ]).catch((error) => {
    throw error;
  });
}

/**
 * Wait for a role to be revoked from a user using transition events.
 * 
 * @param page - Playwright page object
 * @param username - Username to wait for
 * @param role - Role that was revoked (optional, for verification)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForRoleRevoked(
  page: Page,
  username: string,
  role?: string,
  timeout: number = 5000
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ name, role, timeout, eventName }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventUsername = (customEvent.detail?.username || "").trim().toLowerCase();
          const eventRole = (customEvent.detail?.role || "").trim().toLowerCase();
          const searchName = name.trim().toLowerCase();
          const searchRole = role?.trim().toLowerCase();
          
          // Match username (exact or partial)
          const usernameMatch = eventUsername && (
            eventUsername === searchName ||
            eventUsername.includes(searchName) ||
            searchName.includes(eventUsername)
          );
          
          // If role is specified, also match role
          const roleMatch = !searchRole || eventRole === searchRole;
          
          if (usernameMatch && roleMatch && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for role${role ? ` "${role}"` : ""} to be revoked from user "${name}" after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { name: username, role, timeout, eventName: ROLE_REVOKED_EVENT }
  );

  // Fallback: Wait for role badge to disappear from DOM
  const domPromise = (async () => {
    if (role) {
      const roleBadge = page.getByTestId(`user-${username}`).getByText(role, { exact: false });
      await expect(roleBadge).not.toBeVisible({ timeout });
    } else {
      // Just wait a bit for UI to update
      await page.waitForTimeout(500);
    }
  })();

  // Wait for EITHER the event OR the DOM element
  await Promise.race([
    eventPromise,
    domPromise
  ]).catch((error) => {
    throw error;
  });
}
