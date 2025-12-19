import { Page, expect } from "@playwright/test";
import {
  WORLD_SELECTED_EVENT,
  CAMPAIGN_SELECTED_EVENT,
  PLANNING_MODE_ENTERED_EVENT,
  PLANNING_SUBTAB_CHANGED_EVENT,
  CAMPAIGN_VIEW_CHANGED_EVENT,
  MAIN_TAB_CHANGED_EVENT,
  ERROR_OCCURRED_EVENT,
  ERROR_CLEARED_EVENT
} from "../../../lib/auth/authEvents";
import { DEFAULT_EVENT_TIMEOUT, STABILITY_WAIT_SHORT, STABILITY_WAIT_MEDIUM, STABILITY_WAIT_LONG, STABILITY_WAIT_EXTRA, STABILITY_WAIT_MAX, VISIBILITY_TIMEOUT_SHORT, VISIBILITY_TIMEOUT_MEDIUM, VISIBILITY_TIMEOUT_LONG, VISIBILITY_TIMEOUT_EXTRA } from "./constants";
import { ensureLoginDialogClosed } from "./auth";
import { waitForModalOpen, waitForModalClose } from "./modals";
import { getUniqueCampaignName, waitForSimpleEvent, isVisibleSafely, isHiddenSafely, getAttributeSafely, waitForLoadStateSafely, getBoundingBoxSafely, createTimeoutPromise, waitForStateSafely, waitForLocatorSafely, awaitSafely, awaitSafelyBoolean, safeWait, isPageClosedSafely } from "./utils";

/**
 * Check if planning mode is currently active by checking for planning tabs visibility.
 */
async function isPlanningModeActive(page: Page): Promise<boolean> {
  return await isVisibleSafely(
    page.getByRole("tablist", { name: "World planning views" })
  );
}

/**
 * Navigate to a planning sub-tab if already in planning mode.
 * Returns true if navigation succeeded, false if not in planning mode.
 */
async function navigateToPlanningSubTabIfActive(
  page: Page,
  subTab: "World Entities" | "Campaigns" | "Story Arcs" | "Users"
): Promise<boolean> {
  const planningTabsVisible = await isPlanningModeActive(page);
  
  if (!planningTabsVisible) {
    return false;
  }
  
  // Already in planning mode - just navigate to the requested sub-tab
  const planningTablist = page.getByRole("tablist", { name: "World planning views" });
  const subTabButton = planningTablist.getByRole("tab", { name: subTab });
  
  // Check if already on the requested tab
  const isActive = await getAttributeSafely(subTabButton, "aria-selected");
  if (isActive === "true") {
    return true; // Already on the correct tab
  }
  
  // Set up event listener BEFORE clicking
  const subTabPromise = waitForPlanningSubTab(page, subTab, 5000);
  
  await expect(subTabButton).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  await subTabButton.click();
  
  // Wait for sub-tab to be activated (event-based)
  await subTabPromise;
  return true;
}

/**
 * Store a world name in page context for later retrieval.
 */
async function storeWorldName(page: Page, worldName: string): Promise<void> {
  await page.evaluate((name) => {
    (window as any).__testWorldName = name;
  }, worldName);
}

/**
 * Check if a campaign is currently selected by checking for campaign views visibility.
 */
async function isCampaignSelected(page: Page): Promise<boolean> {
  return await isVisibleSafely(
    page.getByRole("tablist", { name: "Campaign views" })
  );
}

/**
 * Check if a specific campaign is currently selected by checking the heading.
 */
async function isCampaignSelectedByName(page: Page, campaignName: string): Promise<boolean> {
  const selectedCampaignHeading = page
    .locator('h3.snapp-heading')
    .filter({ hasText: campaignName })
    .first();
  return await isVisibleSafely(selectedCampaignHeading);
}

/**
 * Navigate to the Campaigns planning sub-tab.
 */
async function navigateToCampaignsTab(page: Page): Promise<void> {
  const campaignsTab = page
    .getByRole("tablist", { name: "World planning views" })
    .getByRole("tab", { name: "Campaigns" });
  
  const isOnCampaignsTab = await isVisibleSafely(campaignsTab);
  if (!isOnCampaignsTab) {
    const campaignsPromise = waitForPlanningSubTab(page, "Campaigns", 5000);
    await campaignsTab.click();
    await awaitSafely(campaignsPromise);
  }
}

/**
 * Try to deselect the currently selected campaign using the Leave Campaign button.
 * Returns true if deselection succeeded, false otherwise.
 */
async function tryDeselectCampaign(page: Page): Promise<boolean> {
  if (await isPageClosedSafely(page)) {
    return false;
  }
  
  try {
    // Open Snapp menu
    await page.getByRole("button", { name: /^Snapp/i }).click();
    
    if (await isPageClosedSafely(page)) {
      return false;
    }
    
    // Wait for menu to be visible and "Leave Campaign" button to appear
    const leaveCampaignButton = page.getByRole("button", { name: "Leave Campaign" });
    const buttonVisible = await isVisibleSafely(leaveCampaignButton, 2000);
    
    if (buttonVisible && !(await isPageClosedSafely(page))) {
      // Click to deselect the campaign
      await leaveCampaignButton.click();
      // Wait for state to update
      await safeWait(page, STABILITY_WAIT_EXTRA);
      
      // Check if campaign views disappeared (indicates deselection worked)
      if (!(await isPageClosedSafely(page))) {
        const campaignViewsGone = !(await isCampaignSelected(page));
        return campaignViewsGone;
      }
    }
  } catch {
    // Deselection failed - that's okay
  }
  
  return false;
}

/**
 * Find a world tab by trying multiple strategies:
 * 1. Try unique world name
 * 2. Try base name "Eldoria"
 * 3. Try first available world
 * Returns the world tab locator and whether it exists.
 */
async function findWorldTab(
  page: Page,
  worldContextTablist: ReturnType<Page['getByRole']>,
  uniqueWorldName: string,
  hasUniqueWorld: boolean
): Promise<{ worldTab: ReturnType<Page['getByRole']> | null; exists: boolean }> {
  let worldTab: ReturnType<Page['getByRole']> | null = null;
  let worldTabExists = false;
  
  // If we already found the unique world, use it
  if (hasUniqueWorld) {
    worldTab = worldContextTablist.getByRole("tab", { name: uniqueWorldName });
    worldTabExists = true;
  } else {
    // First, try to find the unique world name
    try {
      worldTab = worldContextTablist.getByRole("tab", { name: uniqueWorldName });
      worldTabExists = await isVisibleSafely(worldTab);
    } catch {
      // Can't check, continue
    }
  }
  
  // If unique world not found, try base name "Eldoria"
  if (!worldTabExists) {
    try {
      worldTab = worldContextTablist.getByRole("tab", { name: "Eldoria" });
      worldTabExists = await isVisibleSafely(worldTab);
    } catch {
      // Can't check, continue
    }
  }
  
  // If still not found, just get the first available world
  if (!worldTabExists) {
    try {
      worldTab = worldContextTablist.getByRole("tab").first();
      // Verify it exists
      worldTabExists = await isVisibleSafely(worldTab);
    } catch (error: any) {
      if (error.message?.includes("closed") || (await isPageClosedSafely(page))) {
        throw new Error("Page or browser context was closed while trying to find world tab");
      }
      throw error;
    }
  }
  
  return { worldTab, exists: worldTabExists };
}

/**
 * Ensures the ModeSelector (world context tablist) is visible.
 * If a world is currently selected, leaves it first.
 */
export async function ensureModeSelectorVisible(page: Page) {
  const modeSelectorVisible = await isVisibleSafely(
    page.getByRole("tablist", { name: "World context" })
  );

  if (modeSelectorVisible) {
    // Already visible, nothing to do
    return;
  }

  // Check if login dialog is still open - if so, close it first (it blocks clicks)
  await ensureLoginDialogClosed(page);
  
  // Mode selector not visible - check if a world is selected
  // Check if menu is already open by looking for overlay
  const menuOverlay = page.locator('div.fixed.inset-0.z-10');
  const isMenuOpen = await isVisibleSafely(menuOverlay);
  
  // If menu is not open, open it to check for "Leave World"
  if (!isMenuOpen) {
    await page.getByRole("button", { name: /^Snapp/i }).click();
    // Wait a bit for menu to open
    await safeWait(page, STABILITY_WAIT_LONG);
  }
  
  // Check if a world is actually selected by looking for "Leave World" button
  const leaveWorldButton = page.getByRole("button", { name: "Leave World" });
  const hasLeaveWorld = await isVisibleSafely(leaveWorldButton);
  
  if (hasLeaveWorld) {
    // A world is currently selected, so we need to leave it first
    await leaveWorldButton.click();
    // Wait for menu to close and state to update
    await safeWait(page, STABILITY_WAIT_MAX);
    // Wait for page state to settle after leaving world
    await waitForLoadStateSafely(page, "domcontentloaded", VISIBILITY_TIMEOUT_SHORT);
    await safeWait(page, STABILITY_WAIT_LONG);
    // Wait for ModeSelector to appear
    try {
      await expect(
        page.getByRole("tablist", { name: "World context" })
      ).toBeVisible({ timeout: VISIBILITY_TIMEOUT_LONG });
    } catch {
      // Tablist didn't appear - check if we're still logged in
      const logoutButtonAfterLeave = page.getByRole("button", { name: "Log out" });
      const stillLoggedIn = await isVisibleSafely(logoutButtonAfterLeave, 2000);
      if (!stillLoggedIn) {
        throw new Error("User appears to have been logged out after leaving world. Logout button not found.");
      }
      // Still logged in but tablist not visible - might be a timing issue, continue anyway
    }
  } else {
    // No world is selected - menu is open, close it by clicking outside or the button again
    // Click outside the menu (on the overlay) to close it
    if (isMenuOpen || await isVisibleSafely(menuOverlay)) {
      // Click on the overlay to close the menu
      await menuOverlay.click({ position: { x: 10, y: 10 } });
      await safeWait(page, STABILITY_WAIT_LONG);
    }
    
    // Mode selector should be visible when no world is selected
    // Wait for it to appear (it might show "No worlds" message or world list)
    // First, ensure we're actually logged in - if not, this will fail with a clear error
    // After clicking menu overlay, wait a bit for UI to settle
    await safeWait(page, STABILITY_WAIT_LONG);
    const logoutButton = page.getByRole("button", { name: "Log out" });
    const isLoggedIn = await isVisibleSafely(logoutButton, 3000);
    if (!isLoggedIn) {
      // Check if we're on guest view instead
      const guestView = await isVisibleSafely(page.getByText("Welcome to Snapp"), 1000);
      if (guestView) {
        throw new Error("Cannot ensure mode selector visible: user is not logged in. Guest view is visible.");
      }
      throw new Error("Cannot ensure mode selector visible: user is not logged in. Logout button not found.");
    }
    
    try {
      await expect(
        page.getByRole("tablist", { name: "World context" })
      ).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
    } catch {
      // If not visible, check for "No worlds" message instead
      const noWorldsMessage = await isVisibleSafely(
        page.getByText("No worlds have been created yet")
      );
      
      if (!noWorldsMessage) {
        // Neither mode selector nor "No worlds" message - check if we're on guest view
        const guestView = await isVisibleSafely(page.getByText("Welcome to Snapp"));
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
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  
  // Also verify we're not on guest view (AuthenticatedView should be rendering)
  // Wait for page to be in a ready state after login - use domcontentloaded instead of networkidle
  // networkidle can be too strict and timeout unnecessarily
  await waitForLoadStateSafely(page, "domcontentloaded", VISIBILITY_TIMEOUT_LONG);
  
  // Wait for authenticated view to be ready - check for logout button or mode selector
  const logoutButton = page.getByRole("button", { name: "Log out" });
  await expect(logoutButton).toBeVisible({ timeout: VISIBILITY_TIMEOUT_LONG });
  
  const guestView = await isVisibleSafely(page.getByText("Welcome to Snapp"));
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
    planningTabsAlreadyVisible = await isPlanningModeActive(page);
    
    if (planningTabsAlreadyVisible) {
      break;
    }
    // Wait a bit and check again
    await safeWait(page, STABILITY_WAIT_LONG);
  }
  
  if (planningTabsAlreadyVisible) {
    // Already in planning mode - navigate to sub-tab and return
    await navigateToPlanningSubTabIfActive(page, subTab);
    return; // Done - we're already in planning mode
  }

  // Not in planning mode yet - need to select a world first
  // Check if world context tablist is visible (might be hidden if world is selected but planning mode not active)
  const worldContextTablistCheck = page.getByRole("tablist", { name: "World context" });
  const worldContextVisibleCheck = await isVisibleSafely(worldContextTablistCheck);
  
  if (!worldContextVisibleCheck) {
    // World context not visible - might be in a weird state
    // Try to leave the world first (if we're in one)
    try {
      const snappMenu = page.getByRole("button", { name: /^Snapp/i });
      const menuVisible = await isVisibleSafely(snappMenu);
      if (menuVisible) {
        await snappMenu.click();
        const leaveWorldButton = page.getByRole("button", { name: "Leave World" });
        const leaveWorldVisible = await isVisibleSafely(leaveWorldButton);
        if (leaveWorldVisible) {
          await leaveWorldButton.click();
          await safeWait(page, STABILITY_WAIT_EXTRA);
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
  // This function already checks if user is logged in, so we trust it
  await ensureModeSelectorVisible(page);
  
  // Wait for page to be fully ready after ensureModeSelectorVisible
  // Use domcontentloaded instead of networkidle - networkidle can be too strict
  await waitForLoadStateSafely(page, "domcontentloaded", VISIBILITY_TIMEOUT_MEDIUM);
  
  // Small stability wait to ensure React has rendered
  await page.waitForTimeout(STABILITY_WAIT_EXTRA);
  
  // Verify we're still logged in after ensureModeSelectorVisible
  // Use a more defensive check - the logout button might be temporarily hidden during state transitions
  // But ensureModeSelectorVisible already verified login, so this is just a double-check
  const logoutButtonCheck = page.getByRole("button", { name: "Log out" });
  const stillLoggedIn = await isVisibleSafely(logoutButtonCheck, 3000);
  if (!stillLoggedIn) {
    // Logout button not visible - but ensureModeSelectorVisible already checked this
    // This might be a timing issue. Check if we're on guest view instead
    const guestView = await isVisibleSafely(page.getByText("Welcome to Snapp"), 1000);
    if (guestView) {
      throw new Error("User appears to have been logged out after ensureModeSelectorVisible. Guest view is visible.");
    }
    // If not on guest view, might just be a timing issue - continue anyway
    // since ensureModeSelectorVisible already verified login
  }
  
  // Wait for mode selector (world context tablist) to actually be visible
  // ensureModeSelectorVisible should have made it visible, but wait for it
  // Sometimes there's a brief delay between ensureModeSelectorVisible completing and the tablist appearing
  const worldContextTablistAfterEnsure = page.getByRole("tablist", { name: "World context" });
  
  // Try to wait for it, but if it's not visible, check if we're already in planning mode
  let tablistVisible = false;
  
  // Retry a few times - the tablist might need a moment to appear after ensureModeSelectorVisible
  for (let retry = 0; retry < 3; retry++) {
    try {
      // Use longer timeout for first attempt, shorter for retries
      const timeout = retry === 0 ? VISIBILITY_TIMEOUT_MEDIUM : VISIBILITY_TIMEOUT_SHORT;
      await expect(worldContextTablistAfterEnsure).toBeVisible({ timeout });
      tablistVisible = true;
      break;
    } catch {
      // Not visible yet - wait a bit and try again, or check if we're in planning mode
      if (retry < 2) {
        await safeWait(page, STABILITY_WAIT_EXTRA);
        continue;
      }
      
      // Last retry failed - check if we're already in planning mode
      if (await isPlanningModeActive(page)) {
        // We're already in planning mode - navigate to sub-tab directly
        await navigateToPlanningSubTabIfActive(page, subTab);
        return;
      }
      
      // Not in planning mode and tablist not visible - check one more time with a longer wait
      await safeWait(page, STABILITY_WAIT_MAX);
      const finalCheck = await isVisibleSafely(worldContextTablistAfterEnsure, VISIBILITY_TIMEOUT_SHORT);
      if (finalCheck) {
        tablistVisible = true;
        break;
      }
      
      // Still not visible - this is an error
      throw new Error("World context tablist is not visible and not in planning mode. User may not be logged in or page may be in an unexpected state. Try ensuring the user is logged in and the mode selector is visible.");
    }
  }
  
  // Double-check that we're not in planning mode (might have changed during ensureModeSelectorVisible)
  if (await isPlanningModeActive(page)) {
    // We're now in planning mode - just navigate to sub-tab
    await navigateToPlanningSubTabIfActive(page, subTab);
    return;
  }

  // For Users tab, we can navigate directly without requiring a world
  // The Users tab doesn't logically need a world, even though the UI currently requires it
  if (subTab === "Users") {
    // Try to find any world first, but if none exists, we'll still try to navigate to Users
    const worldContextTablist = page.getByRole("tablist", { name: "World context" });
    const hasAnyWorld = await isVisibleSafely(
      worldContextTablist.getByRole("tab").first()
    );
    
    if (hasAnyWorld) {
      // Select the first available world
      const firstWorldTab = worldContextTablist.getByRole("tab").first();
      await firstWorldTab.click();
      await safeWait(page, STABILITY_WAIT_EXTRA);
    }
    // Navigate to Users tab directly
    const usersTab = page.getByRole("tab", { name: "Users" });
    const usersTabVisible = await isVisibleSafely(usersTab, 2000);
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
      await safeWait(page, STABILITY_WAIT_MAX);
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
  await waitForLoadStateSafely(page, "domcontentloaded", VISIBILITY_TIMEOUT_MEDIUM);
  
  let worldContextVisible = false;
  try {
    await expect(worldContextTablist).toBeVisible({ timeout: VISIBILITY_TIMEOUT_LONG });
    worldContextVisible = true;
  } catch {
    // Tablist not visible - check if we're already in planning mode (double-check)
    if (await isPlanningModeActive(page)) {
      // We're already in planning mode - just navigate to sub-tab
      await navigateToPlanningSubTabIfActive(page, subTab);
      return;
    }
    
    // Not in planning mode and tablist not visible - wait a bit more and try again
    await waitForLoadStateSafely(page, "networkidle", VISIBILITY_TIMEOUT_SHORT);
    worldContextVisible = await isVisibleSafely(worldContextTablist, 5000);
    
    if (!worldContextVisible) {
      // This is an error - we should have the tablist visible after ensureModeSelectorVisible
      throw new Error("World context tablist is not visible and not in planning mode. User may not be logged in or page may be in an unexpected state. Try ensuring the user is logged in and the mode selector is visible.");
    }
  }
  
  // First, check if the unique world name already exists
  const uniqueWorldName = getUniqueCampaignName("Eldoria");
  let hasUniqueWorld = await isVisibleSafely(
    worldContextTablist.getByRole("tab", { name: uniqueWorldName })
  );
  
  // If unique world exists, store it and skip creation
  if (hasUniqueWorld) {
    await page.evaluate((name) => {
      (window as any).__testWorldName = name;
    }, uniqueWorldName);
  } else {
    // Check if any world exists (might be base "Eldoria" or another world)
    const hasWorld = await isVisibleSafely(
      worldContextTablist.getByRole("tab").first()
    );

    if (!hasWorld) {
      // Check if we see the "No worlds" message - if so, create one
      const noWorldsMessage = await isVisibleSafely(
        page.getByText("No worlds have been created yet")
      );
      
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
          const errorVisible = await isVisibleSafely(page.getByTestId("error-message"), 2000);
          if (errorVisible) {
            const errorText = await page.getByTestId("error-message").textContent();
            // If error says world already exists, that's okay - close modal and continue
            if (errorText?.includes("already exists") || errorText?.includes("duplicate")) {
              const cancelButton = createWorldDialog.getByRole("button", { name: "Cancel" });
              if (await isVisibleSafely(cancelButton)) {
                await cancelButton.click();
                await waitForModalClose(page, "world", 3000);
              }
              // World should already exist, wait for it
              await expect(
                worldContextTablist.getByRole("tab", { name: uniqueWorldName })
              ).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
              await storeWorldName(page, uniqueWorldName);
              hasUniqueWorld = true;
              return;
            }
            throw new Error(`World creation failed: ${errorText}`);
          }
          throw error;
        }
        
    // Check if world already appeared (creation succeeded)
    let worldExists = await isVisibleSafely(
      worldContextTablist.getByRole("tab", { name: uniqueWorldName })
    );
    
    // If not visible yet, wait a bit more and check again
    if (!worldExists) {
      await safeWait(page, STABILITY_WAIT_MAX);
      worldExists = await isVisibleSafely(
        worldContextTablist.getByRole("tab", { name: uniqueWorldName })
      );
    }
    
    if (worldExists) {
      // World was created successfully, modal should be closed or will close
      // Force close if still open
      const stillOpen = await isVisibleSafely(createWorldDialog);
      if (stillOpen) {
        const cancelButton = createWorldDialog.getByRole("button", { name: "Cancel" });
        if (await isVisibleSafely(cancelButton)) {
          await cancelButton.click();
        }
      }
      // Store the unique world name in page context for other steps to use
      await storeWorldName(page, uniqueWorldName);
      // Mark that we now have the unique world
      hasUniqueWorld = true;
      // Wait a bit for the world tab to be fully ready
      await safeWait(page, STABILITY_WAIT_LONG);
        } else {
          // Check if there's an error message
          const errorVisible = await isVisibleSafely(page.getByTestId("error-message"));
          if (errorVisible) {
            const errorText = await page.getByTestId("error-message").textContent();
            // If error says world already exists, that's okay - close the modal and continue
            if (errorText?.includes("already exists") || errorText?.includes("duplicate")) {
              // Close the modal by clicking cancel
              const cancelButton = createWorldDialog.getByRole("button", { name: "Cancel" });
              if (await isVisibleSafely(cancelButton)) {
                await cancelButton.click();
              }
              // Wait a bit for the world to appear
              await safeWait(page, STABILITY_WAIT_MAX);
              // World should already exist, wait for it (try unique name first, then fall back to base name)
              const worldTab = worldContextTablist.getByRole("tab", { name: uniqueWorldName });
              const worldTabExists = await isVisibleSafely(worldTab);
              if (worldTabExists) {
                await expect(worldTab).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
                // Store the unique world name in page context
                await storeWorldName(page, uniqueWorldName);
                hasUniqueWorld = true;
              } else {
                // Fall back to base name for backwards compatibility
                await expect(
                  worldContextTablist.getByRole("tab", { name: "Eldoria" })
                ).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
              }
            } else {
              // Some other error - close modal and throw
              const cancelButton = createWorldDialog.getByRole("button", { name: "Cancel" });
              if (await isVisibleSafely(cancelButton)) {
                await cancelButton.click();
              }
              throw new Error(`World creation failed: ${errorText}`);
            }
          } else {
            // No error and world doesn't exist - modal might still be open
            // Check if modal is still open and close it
            const modalStillOpen = await isVisibleSafely(createWorldDialog);
            if (modalStillOpen) {
              // Modal didn't close - something went wrong, but try to close it
              const cancelButton = createWorldDialog.getByRole("button", { name: "Cancel" });
              if (await isVisibleSafely(cancelButton)) {
                await cancelButton.click();
              }
            }
            // Wait a bit more and check again
            await safeWait(page, STABILITY_WAIT_MAX);
            const worldTab = worldContextTablist.getByRole("tab", { name: uniqueWorldName });
            const worldTabExists = await isVisibleSafely(worldTab);
            if (worldTabExists) {
              await expect(worldTab).toBeVisible({ timeout: 3000 });
              // Store the unique world name in page context
              await storeWorldName(page, uniqueWorldName);
              hasUniqueWorld = true;
            } else {
              // Fall back to base name for backwards compatibility
              const baseWorldTab = worldContextTablist.getByRole("tab", { name: "Eldoria" });
              const baseWorldExists = await isVisibleSafely(baseWorldTab);
              if (baseWorldExists) {
                await expect(baseWorldTab).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
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
  if (await isPageClosedSafely(page)) {
    throw new Error("Page was closed unexpectedly");
  }

  // Select the first available world
  // Try to find the unique world name first (for "Eldoria"), then fall back to any world
  let { worldTab, exists: worldTabExists } = await findWorldTab(
    page,
    worldContextTablist,
    uniqueWorldName,
    hasUniqueWorld
  );
  
  // If we still don't have a world tab, wait a bit more and retry (for concurrent execution)
  if (!worldTabExists) {
    // Wait for worlds to be loaded - check if the tablist is visible first
    await expect(worldContextTablist).toBeVisible({ timeout: 3000 });
    
    // Wait a bit for worlds to appear (may be delayed during concurrent execution or data loading)
    await safeWait(page, VISIBILITY_TIMEOUT_SHORT);
    
    // Try one more time to find any world
    try {
      // Check if "No worlds" message is visible - if so, we need to create one
      const noWorldsMessage = await isVisibleSafely(
        page.getByText("No worlds have been created yet")
      );
      
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
        ).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
        
        worldTab = worldContextTablist.getByRole("tab", { name: worldName });
        worldTabExists = true;
      } else {
        // Try to find any world tab
        worldTab = worldContextTablist.getByRole("tab").first();
        worldTabExists = await isVisibleSafely(worldTab);
      }
    } catch (error: any) {
      // Still can't find it - check if page is closed
      if (error.message?.includes("closed") || (await isPageClosedSafely(page))) {
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
  } catch (error: any) {
    // Check if page is actually closed - be defensive about this check
    const actuallyClosed = await isPageClosedSafely(page);
    
    // Only throw page closed error if we're certain the page is closed
    if (actuallyClosed || error.message?.includes("closed")) {
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
  await expect(worldTab).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  await expect(worldTab).toBeEnabled({ timeout: VISIBILITY_TIMEOUT_SHORT });
  
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
    await safeWait(page, STABILITY_WAIT_EXTRA);
    
    // Verify the click worked by checking if tab is selected
    // Give it a bit more time since React state updates might be delayed
    let clickedSelected = false;
    for (let i = 0; i < 3; i++) {
      clickedSelected = await awaitSafelyBoolean(
        Promise.race([
          getAttributeSafely(worldTab, "aria-selected").then(attr => attr === "true"),
          createTimeoutPromise(500, false)
        ])
      );
      
      if (clickedSelected) {
        break;
      }
      // Wait a bit more before next check
      await safeWait(page, STABILITY_WAIT_LONG);
    }
    
    if (!clickedSelected) {
      // Click didn't register - try again with a different approach
      // First, ensure the tab is still visible and clickable
      await expect(worldTab).toBeVisible({ timeout: VISIBILITY_TIMEOUT_SHORT });
      await expect(worldTab).toBeEnabled({ timeout: VISIBILITY_TIMEOUT_SHORT });
      await worldTab.click({ force: true, timeout: VISIBILITY_TIMEOUT_SHORT });
      await safeWait(page, STABILITY_WAIT_LONG * 2);
      
      // Check again with multiple attempts
      for (let i = 0; i < 3; i++) {
        clickedSelected = await awaitSafelyBoolean(
          Promise.race([
            getAttributeSafely(worldTab, "aria-selected").then(attr => attr === "true"),
            createTimeoutPromise(500, false)
          ])
        );
        
        if (clickedSelected) {
          break;
        }
        await safeWait(page, STABILITY_WAIT_LONG);
      }
      
      if (!clickedSelected) {
        // Still not selected - try one more time with mouse click at center
        const retryBox = await getBoundingBoxSafely(worldTab);
        if (retryBox) {
          await page.mouse.click(retryBox.x + retryBox.width / 2, retryBox.y + retryBox.height / 2);
          await safeWait(page, STABILITY_WAIT_LONG * 2);
          // Final check
          clickedSelected = await awaitSafelyBoolean(
            Promise.race([
              getAttributeSafely(worldTab, "aria-selected").then(attr => attr === "true"),
              createTimeoutPromise(1000, false)
            ])
          );
        }
      }
    }
  } catch (error: any) {
    if (error.message?.includes("closed") || (await isPageClosedSafely(page))) {
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
    let planningTabsVisible = await isPlanningModeActive(page);
    
    if (!planningTabsVisible) {
      // Planning mode not active - wait a bit more and check again
      // Sometimes the UI takes a moment to update even after events fire
      // If world selection event fired, planning mode should activate - give it more time
      const waitTime = worldSelectedSucceeded ? VISIBILITY_TIMEOUT_SHORT : STABILITY_WAIT_MAX;
      await safeWait(page, waitTime);
      planningTabsVisible = await isPlanningModeActive(page);
      
      if (!planningTabsVisible) {
        // Wait one more time with a longer delay
        await safeWait(page, VISIBILITY_TIMEOUT_SHORT / 2);
        planningTabsVisible = await isPlanningModeActive(page);
      }
      
      if (!planningTabsVisible) {
        // If world selection event fired but planning mode didn't, the world might still be selected
        // Check if we can proceed anyway - sometimes planning mode activates without the event
        if (worldSelectedSucceeded) {
          // World was selected - wait a bit more for planning mode to catch up
          await safeWait(page, VISIBILITY_TIMEOUT_SHORT);
          planningTabsVisible = await isPlanningModeActive(page);
          
          if (planningTabsVisible) {
            // Planning mode is now active - success!
            return;
          }
        }
        
        // Still not visible - provide helpful error with event status
        const currentUrl = page.url();
        const worldContextStillVisible = await isVisibleSafely(
          page.getByRole("tablist", { name: "World context" })
        );
        
        const worldTabStillVisible = await isVisibleSafely(worldTab);
        const worldTabSelected = worldTabStillVisible
            ? await awaitSafelyBoolean(
              Promise.race([
                getAttributeSafely(worldTab, "aria-selected").then(attr => attr === "true"),
                createTimeoutPromise(2000, false)
              ])
            )
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
    if (await isPlanningModeActive(page)) {
      // Planning mode is active - that's what matters, continue
      return;
    }
    
    // Planning mode not active and error occurred - rethrow
    throw error;
  }

  // Navigate to the requested sub-tab if not already on it
  if (subTab !== "World Entities") {
    // Ensure page is still valid
    if (await isPageClosedSafely(page)) {
      throw new Error("Page was closed before navigating to sub-tab");
    }
    
    // Use helper function to navigate to sub-tab
    await navigateToPlanningSubTabIfActive(page, subTab);
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
  if (await isPageClosedSafely(page)) {
    throw new Error("Page was closed unexpectedly");
  }

  // Ensure we're in planning mode with a world selected
  // Check if planning tabs are visible (indicates world is selected)
  if (!(await isPlanningModeActive(page))) {
    // Need to select a world first
    await selectWorldAndEnterPlanningMode(page, "Campaigns");
  }

  // Ensure we're on the Campaigns tab
  await navigateToCampaignsTab(page);

  // Check if campaign is already selected and if it's the one we want
  if (await isCampaignSelected(page)) {
    if (await isCampaignSelectedByName(page, campaignName)) {
      // The campaign we want is already selected, we're done
      return;
    }
    
    // A different campaign is selected - we need to deselect it
    // Navigate to a different planning tab and back to reset the selection
    const worldEntitiesTab = page
      .getByRole("tablist", { name: "World planning views" })
      .getByRole("tab", { name: "World Entities" });
    
    if (await isVisibleSafely(worldEntitiesTab)) {
      // Set up event listener BEFORE clicking
      const worldEntitiesPromise = waitForPlanningSubTab(page, "World Entities", 5000);
      await worldEntitiesTab.click();
      await awaitSafely(worldEntitiesPromise); // Don't fail if event doesn't fire
      
      // Now navigate back to Campaigns
      const campaignsTab = page
        .getByRole("tablist", { name: "World planning views" })
        .getByRole("tab", { name: "Campaigns" });
      const campaignsPromise = waitForPlanningSubTab(page, "Campaigns", 5000);
      await campaignsTab.click();
      await awaitSafely(campaignsPromise); // Don't fail if event doesn't fire
      
      // Re-check if campaign views are still visible (they shouldn't be after navigation)
      const stillSelected = await isVisibleSafely(
        page.getByRole("tablist", { name: "Campaign views" })
      );
      
      if (stillSelected) {
        // Still selected - try clicking the Campaigns tab again to force reset
        const campaignsPromise2 = waitForPlanningSubTab(page, "Campaigns", 5000);
        await campaignsTab.click();
        await awaitSafely(campaignsPromise2); // Don't fail if event doesn't fire
      }
    }
  }

  // Wait for UI to settle - check that campaigns tab is active
  const campaignsTab = page
    .getByRole("tablist", { name: "World planning views" })
    .getByRole("tab", { name: "Campaigns" });
  await expect(campaignsTab).toBeVisible({ timeout: VISIBILITY_TIMEOUT_SHORT });
  
  // Re-check campaign views visibility after potential deselection
  const campaignViewsStillVisible = await isCampaignSelected(page);
  
  // If campaign views are still visible, check if it's the campaign we want
  if (campaignViewsStillVisible) {
    if (await isCampaignSelectedByName(page, campaignName)) {
      return; // Already have the correct campaign selected
    }
    
    // Different campaign selected - try to deselect it
    const deselectionSucceeded = await tryDeselectCampaign(page);
    
    if (deselectionSucceeded) {
      // Wait a bit more for UI to fully settle
      await safeWait(page, STABILITY_WAIT_LONG);
      // Continue to normal campaign creation/selection logic below
    } else {
      // Deselection didn't work - check if campaign is still selected and handle error
      const finalCampaignViewsVisible = await isCampaignSelected(page);
      
      if (finalCampaignViewsVisible) {
      // Still can't deselect - check if the campaign we want already exists
      // Look for it in the heading (if it's selected) or anywhere in the UI
      const campaignNameVisible = await isVisibleSafely(
        page.getByText(campaignName).first()
      );
      
      if (campaignNameVisible) {
        // Campaign exists - check if it's currently selected
        if (await isCampaignSelectedByName(page, campaignName)) {
          return; // Already have the correct campaign selected
        }
        
        // Campaign exists but not selected - try to deselect first, then select it
        await tryDeselectCampaign(page);
        
        // Now try to find and select the campaign tab
        // Even if tabs are not visible, they might exist in the DOM
        const hiddenCampaignTab = page
          .getByRole("tab", { name: campaignName })
          .first();
        
        const tabExists = await hiddenCampaignTab.count().catch(() => 0) > 0;
        if (tabExists) {
          // Try to click it even if not visible
          try {
            if (!(await isPageClosedSafely(page))) {
              await hiddenCampaignTab.click({ force: true, timeout: VISIBILITY_TIMEOUT_SHORT });
              await safeWait(page, STABILITY_WAIT_EXTRA);
              // Check if it worked
              const selectedCampaignHeading = page
                .locator('h3.snapp-heading')
                .filter({ hasText: campaignName })
                .first();
              const nowSelected = await isVisibleSafely(selectedCampaignHeading);
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
        if (await isVisibleSafely(newCampaignButton, 2000)) {
          await newCampaignButton.click();
          // If that worked, continue with creation flow
          const dialog = page.getByRole("dialog", { name: /create campaign/i });
          const dialogVisible = await isVisibleSafely(dialog, 2000);
          if (dialogVisible) {
            // Success! Continue with creation
            await page.getByLabel("Campaign name").fill(campaignName);
            await page.getByLabel("Summary").fill(summary);
            await page.getByRole("button", { name: "Save campaign" }).click();
            
            // Wait for creation to complete
            await Promise.race([
              waitForStateSafely(dialog, "hidden", 3000),
              waitForLocatorSafely(page.getByTestId("error-message"), 3000),
              waitForLocatorSafely(page.getByRole("tab", { name: campaignName }), 3000)
            ]);
            
            // Check if campaign was created
            const campaignTab = await isVisibleSafely(page.getByRole("tab", { name: campaignName }).first());
            if (campaignTab) {
              // Campaign created, select it
              await page.getByRole("tab", { name: campaignName }).first().click();
              await expect(
                page.getByRole("tablist", { name: "Campaign views" })
              ).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
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
  
  const hasCampaignTab = await isVisibleSafely(
    page.getByRole("tab", { name: campaignName }).first()
  );

  // Also check if campaign exists by looking for it in any visible form (heading, tab, etc.)
  const campaignExistsAnywhere = hasCampaignTab || 
    (await isVisibleSafely(page.getByText(campaignName).first()));

  // Check if we can create a campaign (no campaign views means no campaign selected)
  const canCreateCampaign = !(await isCampaignSelected(page));

  // If no campaign is selected, we can create a campaign via Snapp menu
  // If campaign tab exists, we can select it
  // If campaign views are visible and it's the correct campaign, we're done (handled above)
  if (!campaignExistsAnywhere && canCreateCampaign) {
    // Campaign doesn't exist and we can create it
    // Use the Snapp menu "New Campaign" button
    // First check if a campaign was auto-selected while we were checking
    await safeWait(page, STABILITY_WAIT_EXTRA);
    const newCampaignViewsVisible = await isVisibleSafely(
      page.getByRole("tablist", { name: "Campaign views" })
    );
    
    if (newCampaignViewsVisible) {
      // A campaign was selected - check if it's the one we want
      const selectedCampaignHeading = page
        .locator('h3.snapp-heading')
        .filter({ hasText: campaignName })
        .first();
      
      const isCorrectCampaign = await isVisibleSafely(selectedCampaignHeading);
      if (isCorrectCampaign) {
        return; // Already have the correct campaign selected
      }
      // Wrong campaign selected - use "Leave Campaign" from Snapp menu to deselect
      await page.getByRole("button", { name: /^Snapp/i }).click();
      const leaveCampaignButton = page.getByRole("button", { name: "Leave Campaign" });
      if (await isVisibleSafely(leaveCampaignButton, 2000)) {
        await leaveCampaignButton.click();
        await safeWait(page, STABILITY_WAIT_EXTRA);
      }
    }
    
    // Open Snapp menu and click "New Campaign"
      // Check page state before interacting
      try {
        if (await isPageClosedSafely(page)) {
          throw new Error("Page was closed before opening Snapp menu");
        }
      await page.getByRole("button", { name: /^Snapp/i }).click();
      // Small wait for menu to open
      await page.waitForTimeout(STABILITY_WAIT_LONG);
      const newCampaignButton = page.getByRole("button", { name: "New Campaign" });
      await expect(newCampaignButton).toBeVisible({ timeout: VISIBILITY_TIMEOUT_LONG });
      
      // Check page state again before clicking
      if (await isPageClosedSafely(page)) {
        throw new Error("Page was closed before clicking New Campaign");
      }
      await newCampaignButton.click();
    } catch (error: any) {
      // Check if page is actually closed - be defensive
      const actuallyClosed = await isPageClosedSafely(page);
      
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
      const errorVisible = await isVisibleSafely(page.getByTestId("error-message"), 3000);
      if (errorVisible) {
        const errorText = await page.getByTestId("error-message").textContent();
        // If error says campaign already exists, that's okay - close modal and continue
        if (errorText?.includes("already exists") || errorText?.includes("duplicate")) {
          const cancelButton = createCampaignDialog.getByRole("button", { name: "Cancel" });
          if (await isVisibleSafely(cancelButton)) {
            await cancelButton.click();
            await waitForModalClose(page, "campaign", 3000);
          }
          // Campaign should already exist, wait for it
          await expect(
            page.getByRole("tab", { name: campaignName })
          ).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
          return;
        }
        throw new Error(`Campaign creation failed: ${errorText}`);
      }
      throw error;
    }

    // Check for errors first
    const errorMessage = await isVisibleSafely(page.getByTestId("error-message"));
    if (errorMessage) {
      // Campaign might already exist, close the modal manually
      const cancelButton = createCampaignDialog.getByRole("button", { name: "Cancel" });
      if (await isVisibleSafely(cancelButton)) {
        await cancelButton.click();
      }
    } else {
      // No error - modal should be closed, but if it's still open, wait a bit more
      const stillOpen = await isVisibleSafely(createCampaignDialog);
      if (stillOpen) {
        // Wait for campaign tab to appear (might be loading)
        const campaignTab = page.getByRole("tab", { name: campaignName });
        const campaignTabVisible = await isVisibleSafely(campaignTab, 3000);
        if (campaignTabVisible) {
          // Success - close modal manually if still open
          const cancelButton = createCampaignDialog.getByRole("button", { name: "Cancel" });
          if (await isVisibleSafely(cancelButton)) {
            await cancelButton.click();
          }
        }
      }
    }

    // After creation, wait for UI to update
    await safeWait(page, STABILITY_WAIT_MAX);
    
    // Check if campaign was auto-selected (campaign views visible)
    const campaignViewsVisible = await isVisibleSafely(
      page.getByRole("tablist", { name: "Campaign views" })
    );
    
    if (campaignViewsVisible) {
      // Campaign was auto-selected - check if it's the one we want
      const selectedCampaignHeading = page
        .locator('h3.snapp-heading')
        .filter({ hasText: campaignName })
        .first();
      
      const isCorrectCampaign = await isVisibleSafely(selectedCampaignHeading);
      if (isCorrectCampaign) {
        // Campaign is already selected, we're done
        return;
      }
      // Wrong campaign selected - use "Leave Campaign" from Snapp menu to deselect
      await page.getByRole("button", { name: /^Snapp/i }).click();
      const leaveCampaignButton = page.getByRole("button", { name: "Leave Campaign" });
      if (await isVisibleSafely(leaveCampaignButton, 2000)) {
        await leaveCampaignButton.click();
        await safeWait(page, STABILITY_WAIT_EXTRA);
      }
    }
    
    // Campaign tab should be visible (campaign not yet selected)
    // Click it to select the campaign
    // Check page state before interacting
    try {
      if (await isPageClosedSafely(page)) {
        throw new Error("Page was closed before selecting campaign tab");
      }
      const campaignTab = page.getByRole("tab", { name: campaignName }).first();
      await expect(campaignTab).toBeVisible({ timeout: 3000 });
      
      // Check page state again before clicking
      if (await isPageClosedSafely(page)) {
        throw new Error("Page was closed before clicking campaign tab");
      }
      await campaignTab.click();
    } catch (error: any) {
      // Check if page is actually closed - be defensive
      const actuallyClosed = await isPageClosedSafely(page);
      
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
      if (await isPageClosedSafely(page)) {
        throw new Error("Page was closed before selecting existing campaign");
      }
      const campaignTab = page.getByRole("tab", { name: campaignName }).first();
      await expect(campaignTab).toBeVisible({ timeout: 3000 });
      
      if (await isPageClosedSafely(page)) {
        throw new Error("Page was closed before clicking existing campaign tab");
      }
      await campaignTab.click();
      await expect(
        page.getByRole("tablist", { name: "Campaign views" })
      ).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
    } catch (error: any) {
      if (await isPageClosedSafely(page) || error.message?.includes("closed") || error.message?.includes("Target page")) {
        throw new Error("Page was closed while trying to select existing campaign");
      }
      throw error;
    }
  } else if (campaignExistsAnywhere && !hasCampaignTab && !campaignViewsStillVisible) {
    // Campaign exists somewhere but we can't see the tab
    // This might mean it was just created or is in a weird state
    // Try waiting a bit more and checking again
    await safeWait(page, STABILITY_WAIT_MAX);
    const campaignTabAfterWait = await isVisibleSafely(
      page.getByRole("tab", { name: campaignName }).first()
    );
    
    if (campaignTabAfterWait) {
      await page.getByRole("tab", { name: campaignName }).first().click();
      await expect(
        page.getByRole("tablist", { name: "Campaign views" })
      ).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
    } else {
      // Campaign might be selected but we can't see it - try to find it via heading
      const campaignHeading = page
        .locator('h3.snapp-heading')
        .filter({ hasText: campaignName })
        .first();
      
      const headingVisible = await isVisibleSafely(campaignHeading);
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
  if (await isPageClosedSafely(page)) {
    throw new Error("Page was closed during ensureCampaignExists");
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
  timeout: number = DEFAULT_EVENT_TIMEOUT
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ name, timeout }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;
        
        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventWorldName = customEvent.detail?.worldName || "";
          
          // Match using matchesName pattern (exact or partial, case-insensitive)
          const nameMatch = eventWorldName && (() => {
            const event = (eventWorldName || "").trim().toLowerCase();
            const search = (name || "").trim().toLowerCase();
            if (!event || !search) return false;
            if (event === search) return true;
            if (event.includes(search)) return true;
            if (search.includes(event)) return true;
            return false;
          })();
          
          if (nameMatch && !resolved) {
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
          const searchName = (name || "").trim().toLowerCase();
          for (const tab of worldTabs) {
            const isSelected = tab.getAttribute("aria-selected") === "true";
            const tabText = (tab.textContent || "").trim().toLowerCase();
            
            // Match using matchesName pattern (exact or partial, case-insensitive)
            const nameMatch = tabText && (() => {
              const event = tabText;
              const search = searchName;
              if (!event || !search) return false;
              if (event === search) return true;
              if (event.includes(search)) return true;
              if (search.includes(event)) return true;
              return false;
            })();
            
            if (isSelected && nameMatch) {
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
        await expect(worldTab).toBeVisible({ timeout: Math.min(timeout, VISIBILITY_TIMEOUT_MEDIUM) });
        tabFound = true;
      } catch {
        // Exact match failed - try to find any selected tab
        const allTabs = worldContextTablist.getByRole("tab");
        const tabCount = await allTabs.count();
        for (let i = 0; i < tabCount; i++) {
          const tab = allTabs.nth(i);
          const tabText = await tab.textContent().catch(() => "");
          const isSelected = await getAttributeSafely(tab, "aria-selected");
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
          const isSelected = await getAttributeSafely(worldTab, "aria-selected");
          if (isSelected === "true") {
            return; // Tab is visible and selected
          }
          await page.waitForTimeout(STABILITY_WAIT_SHORT); // Small delay between polls
        }
        // After polling, check one more time
        const finalSelected = await getAttributeSafely(worldTab, "aria-selected");
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
    if (await isPlanningModeActive(page)) {
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
  timeout: number = DEFAULT_EVENT_TIMEOUT
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
    const pollTimeout = Math.min(timeout, VISIBILITY_TIMEOUT_SHORT); // Max 2s for polling
    while (Date.now() - startTime < pollTimeout) {
      const isSelected = await campaignTab.getAttribute("aria-selected");
      if (isSelected === "true") {
        return; // Tab is selected
      }
      await page.waitForTimeout(STABILITY_WAIT_SHORT); // Small delay between polls
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
  timeout: number = DEFAULT_EVENT_TIMEOUT
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
      await page.waitForTimeout(STABILITY_WAIT_MAX);
      await expect(planningTabs).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
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
  timeout: number = DEFAULT_EVENT_TIMEOUT
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
    const pollTimeout = Math.min(timeout, VISIBILITY_TIMEOUT_SHORT); // Max 2s for polling
    while (Date.now() - startTime < pollTimeout) {
      const isSelected = await tab.getAttribute("aria-selected");
      if (isSelected === "true") {
        return; // Tab is selected
      }
      await page.waitForTimeout(STABILITY_WAIT_SHORT); // Small delay between polls
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
    const isVisible = await isVisibleSafely(planningTablist);
    if (isVisible) {
      const tab = planningTablist.getByRole("tab", { name: subTab });
      const tabVisible = await isVisibleSafely(tab);
      if (tabVisible) {
        const isSelected = await getAttributeSafely(tab, "aria-selected");
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
  timeout: number = DEFAULT_EVENT_TIMEOUT
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
        waitForStateSafely(button, "visible", timeout),
        waitForStateSafely(heading, "visible", timeout)
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
  timeout: number = DEFAULT_EVENT_TIMEOUT
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
    const pollTimeout = Math.min(timeout, VISIBILITY_TIMEOUT_SHORT); // Max 2s for polling
    while (Date.now() - startTime < pollTimeout) {
      const isSelected = await tab.getAttribute("aria-selected");
      if (isSelected === "true") {
        return; // Tab is selected
      }
      await page.waitForTimeout(STABILITY_WAIT_SHORT); // Small delay between polls
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
    const isVisible = await isVisibleSafely(tab);
    if (isVisible) {
      const isSelected = await getAttributeSafely(tab, "aria-selected");
      if (isSelected === "true") {
        return; // Tab is selected, that's good enough
      }
    }
    throw error; // Neither event nor DOM, rethrow
  });
}
