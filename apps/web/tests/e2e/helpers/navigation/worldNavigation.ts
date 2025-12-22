import { Page, expect } from "@playwright/test";
import {
  WORLD_SELECTED_EVENT,
  PLANNING_MODE_ENTERED_EVENT,
  PLANNING_SUBTAB_CHANGED_EVENT
} from "../../../../lib/auth/authEvents";
import { DEFAULT_EVENT_TIMEOUT, STABILITY_WAIT_SHORT, STABILITY_WAIT_MEDIUM, STABILITY_WAIT_LONG, STABILITY_WAIT_EXTRA, STABILITY_WAIT_MAX, VISIBILITY_TIMEOUT_SHORT, VISIBILITY_TIMEOUT_MEDIUM, VISIBILITY_TIMEOUT_LONG } from "../constants";
import { ensureLoginDialogClosed } from "../auth";
import { getUniqueCampaignName, isVisibleSafely, getAttributeSafely, waitForLoadStateSafely, getBoundingBoxSafely, createTimeoutPromise, awaitSafely, awaitSafelyBoolean, safeWait, isPageClosedSafely } from "../utils";
import { waitForModalOpen, waitForModalClose } from "../modals";
import { storeWorldName } from "./navigationUtils";

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

/**
 * Select a specific world by name and enter planning mode
 */
export async function selectWorldAndEnterPlanningModeWithWorldName(
  page: Page,
  subTab: "World Entities" | "Campaigns" | "Story Arcs" | "Users",
  worldName: string
) {
  // First do all the setup checks (login, mode selector, etc.)
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  await waitForLoadStateSafely(page, "domcontentloaded", VISIBILITY_TIMEOUT_LONG);
  const logoutButton = page.getByRole("button", { name: "Log out" });
  await expect(logoutButton).toBeVisible({ timeout: VISIBILITY_TIMEOUT_LONG });

  const guestView = await isVisibleSafely(page.getByText("Welcome to Snapp"));
  if (guestView) {
    throw new Error("Cannot navigate to planning screen: still on guest view after login.");
  }

  // Check if already in planning mode
  if (await isPlanningModeActive(page)) {
    await navigateToPlanningSubTabIfActive(page, subTab);
    return;
  }

  await ensureModeSelectorVisible(page);
  await waitForLoadStateSafely(page, "domcontentloaded", VISIBILITY_TIMEOUT_MEDIUM);
  await safeWait(page, STABILITY_WAIT_EXTRA);

  // Wait for world context tablist to be visible
  const worldContextTablist = page.getByRole("tablist", { name: "World context" });
  await expect(worldContextTablist).toBeVisible({ timeout: VISIBILITY_TIMEOUT_LONG });
  
  // Wait a bit for worlds to load (especially if created via API in Background)
  await safeWait(page, STABILITY_WAIT_SHORT);
  
  // Try to find the world by exact name match first
  let worldTab = worldContextTablist.getByRole("tab", { name: worldName });
  let worldFound = await isVisibleSafely(worldTab, 2000).catch(() => false);
  
  // If not found, try to find any world containing the name (handles unique names)
  if (!worldFound) {
    const allWorldTabs = await worldContextTablist.getByRole("tab").all();
    for (const tab of allWorldTabs) {
      const tabName = await tab.textContent().catch(() => "");
      if (tabName && (tabName === worldName || tabName.includes(worldName) || worldName.includes(tabName))) {
        worldTab = tab;
        worldFound = true;
        break;
      }
    }
  }
  
  // If still not found, try base name matching (for "Eldoria" matching "Eldoria-worker-0")
  if (!worldFound && worldName === "Eldoria") {
    const uniqueName = getUniqueCampaignName("Eldoria");
    worldTab = worldContextTablist.getByRole("tab", { name: uniqueName });
    worldFound = await isVisibleSafely(worldTab, 2000).catch(() => false);
  }
  
  if (!worldFound) {
    throw new Error(`World "${worldName}" not found in world context. Available worlds may not have loaded yet or world was not created.`);
  }
  
  // Click the world tab
  await worldTab.click();
  
  // Wait for planning mode to activate
  await waitForPlanningMode(page, VISIBILITY_TIMEOUT_LONG);
  
  // Navigate to the requested sub-tab
  await navigateToPlanningSubTabIfActive(page, subTab);
}

/**
 * Wait for a world to be selected using transition events.
 * This is more reliable than polling for DOM elements.
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
          await safeWait(page, STABILITY_WAIT_SHORT); // Small delay between polls
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
 * Wait for planning mode to be entered using transition events.
 * This is more reliable than polling for planning tabs visibility.
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
      await safeWait(page, STABILITY_WAIT_MAX);
      await expect(planningTabs).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
    }
  })();

  // Wait for BOTH the event AND the tabs to be visible
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
      await safeWait(page, STABILITY_WAIT_SHORT); // Small delay between polls
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

// Now define selectWorldAndEnterPlanningMode which uses the wait functions above
export async function selectWorldAndEnterPlanningMode(
  page: Page,
  subTab: "World Entities" | "Campaigns" | "Story Arcs" | "Users" = "World Entities"
) {
  // First verify we're logged in and authenticated view is ready
  const logoutButton = page.getByRole("button", { name: "Log out" });
  const logoutVisible = await isVisibleSafely(logoutButton, VISIBILITY_TIMEOUT_MEDIUM);
  if (!logoutVisible) {
    const guestView = await isVisibleSafely(page.getByText("Welcome to Snapp"), 1000);
    if (guestView) {
      throw new Error("Cannot navigate to planning screen: user is not logged in. Guest view is visible.");
    }
    await safeWait(page, STABILITY_WAIT_MEDIUM);
    const logoutVisibleRetry = await isVisibleSafely(logoutButton, VISIBILITY_TIMEOUT_SHORT);
    if (!logoutVisibleRetry) {
      throw new Error("Cannot navigate to planning screen: logout button is not visible and user does not appear to be logged in.");
    }
  }
  
  await waitForLoadStateSafely(page, "domcontentloaded", VISIBILITY_TIMEOUT_LONG);
  
  try {
    await expect(logoutButton).toBeVisible({ timeout: VISIBILITY_TIMEOUT_LONG });
  } catch (error) {
    const guestViewCheck = await isVisibleSafely(page.getByText("Welcome to Snapp"), 1000);
    if (guestViewCheck) {
      throw new Error("Cannot navigate to planning screen: user is not logged in. Guest view is visible after waiting for authentication.");
    }
    throw new Error(`Cannot navigate to planning screen: logout button is not visible after waiting ${VISIBILITY_TIMEOUT_LONG}ms. User may not be logged in or page may not be in authenticated state. Original error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  const guestView = await isVisibleSafely(page.getByText("Welcome to Snapp"));
  if (guestView) {
    throw new Error("Cannot navigate to planning screen: still on guest view after login. AuthenticatedView may not have rendered.");
  }
  
  // Check if we're already in planning mode
  let planningTabsAlreadyVisible = false;
  for (let i = 0; i < 3; i++) {
    planningTabsAlreadyVisible = await isPlanningModeActive(page);
    if (planningTabsAlreadyVisible) {
      break;
    }
    await safeWait(page, STABILITY_WAIT_LONG);
  }
  
  if (planningTabsAlreadyVisible) {
    await navigateToPlanningSubTabIfActive(page, subTab);
    return;
  }

  // Not in planning mode yet - need to select a world first
  const worldContextTablistCheck = page.getByRole("tablist", { name: "World context" });
  const worldContextVisibleCheck = await isVisibleSafely(worldContextTablistCheck);
  
  if (!worldContextVisibleCheck) {
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
          await snappMenu.click();
        }
      }
    } catch {
      // Ignore errors
    }
  }
  
  await ensureModeSelectorVisible(page);
  await waitForLoadStateSafely(page, "domcontentloaded", VISIBILITY_TIMEOUT_MEDIUM);
  await safeWait(page, STABILITY_WAIT_EXTRA);
  
  const logoutButtonCheck = page.getByRole("button", { name: "Log out" });
  const stillLoggedIn = await isVisibleSafely(logoutButtonCheck, 3000);
  if (!stillLoggedIn) {
    const guestView = await isVisibleSafely(page.getByText("Welcome to Snapp"), 1000);
    if (guestView) {
      throw new Error("User appears to have been logged out after ensureModeSelectorVisible. Guest view is visible.");
    }
  }
  
  const worldContextTablistAfterEnsure = page.getByRole("tablist", { name: "World context" });
  let tablistVisible = false;
  
  for (let retry = 0; retry < 3; retry++) {
    try {
      const timeout = retry === 0 ? VISIBILITY_TIMEOUT_MEDIUM : VISIBILITY_TIMEOUT_SHORT;
      await expect(worldContextTablistAfterEnsure).toBeVisible({ timeout });
      tablistVisible = true;
      break;
    } catch {
      if (retry < 2) {
        await safeWait(page, STABILITY_WAIT_EXTRA);
        continue;
      }
      
      if (await isPlanningModeActive(page)) {
        await navigateToPlanningSubTabIfActive(page, subTab);
        return;
      }
      
      await safeWait(page, STABILITY_WAIT_MAX);
      const finalCheck = await isVisibleSafely(worldContextTablistAfterEnsure, VISIBILITY_TIMEOUT_SHORT);
      if (finalCheck) {
        tablistVisible = true;
        break;
      }
      
      throw new Error("World context tablist is not visible and not in planning mode. User may not be logged in or page may be in an unexpected state. Try ensuring the user is logged in and the mode selector is visible.");
    }
  }
  
  if (await isPlanningModeActive(page)) {
    await navigateToPlanningSubTabIfActive(page, subTab);
    return;
  }

  // For Users tab, we can navigate directly without requiring a world
  if (subTab === "Users") {
    const worldContextTablist = page.getByRole("tablist", { name: "World context" });
    const hasAnyWorld = await isVisibleSafely(
      worldContextTablist.getByRole("tab").first()
    );
    
    if (hasAnyWorld) {
      const firstWorldTab = worldContextTablist.getByRole("tab").first();
      await firstWorldTab.click();
      await safeWait(page, STABILITY_WAIT_EXTRA);
    }
    const usersTab = page.getByRole("tab", { name: "Users" });
    const usersTabVisible = await isVisibleSafely(usersTab, 2000);
    if (usersTabVisible) {
      await usersTab.click();
    } else {
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent("setActiveTab", { detail: { tab: "Users" } }));
      });
      await safeWait(page, STABILITY_WAIT_MAX);
    }
    return;
  }

  // For other tabs, world selection is required
  const logoutButtonBeforeWorldSelect = page.getByRole("button", { name: "Log out" });
  const stillLoggedInBeforeWorldSelect = await isVisibleSafely(logoutButtonBeforeWorldSelect, VISIBILITY_TIMEOUT_MEDIUM);
  if (!stillLoggedInBeforeWorldSelect) {
    await safeWait(page, STABILITY_WAIT_SHORT);
    const retryCheck = await isVisibleSafely(logoutButtonBeforeWorldSelect, VISIBILITY_TIMEOUT_SHORT);
    if (!retryCheck) {
      const guestViewCheck = await isVisibleSafely(page.getByText("Welcome to Snapp"), 1000);
      if (guestViewCheck) {
        throw new Error("Cannot select world: user appears to have been logged out. Guest view is visible. Ensure the login step completed successfully.");
      }
      throw new Error("Cannot select world: logout button is not visible after retry. User may not be logged in. Ensure the login step completed successfully before selecting a world.");
    }
  }

  const worldContextTablist = page.getByRole("tablist", { name: "World context" });
  await waitForLoadStateSafely(page, "domcontentloaded", VISIBILITY_TIMEOUT_MEDIUM);
  
  let worldContextVisible = false;
  try {
    await expect(worldContextTablist).toBeVisible({ timeout: VISIBILITY_TIMEOUT_LONG });
    worldContextVisible = true;
  } catch {
    if (await isPlanningModeActive(page)) {
      await navigateToPlanningSubTabIfActive(page, subTab);
      return;
    }
    
    await waitForLoadStateSafely(page, "networkidle", VISIBILITY_TIMEOUT_SHORT);
    worldContextVisible = await isVisibleSafely(worldContextTablist, 5000);
    
    if (!worldContextVisible) {
      throw new Error("World context tablist is not visible and not in planning mode. User may not be logged in or page may be in an unexpected state. Try ensuring the user is logged in and the mode selector is visible.");
    }
  }
  
  await safeWait(page, STABILITY_WAIT_SHORT);
  
  const uniqueWorldName = getUniqueCampaignName("Eldoria");
  let hasUniqueWorld = await isVisibleSafely(
    worldContextTablist.getByRole("tab", { name: uniqueWorldName })
  );
  
  if (hasUniqueWorld) {
    await page.evaluate((name) => {
      (window as any).__testWorldName = name;
    }, uniqueWorldName);
  } else {
    await safeWait(page, STABILITY_WAIT_SHORT);
    const hasWorld = await isVisibleSafely(
      worldContextTablist.getByRole("tab").first()
    );

    if (!hasWorld) {
      const noWorldsMessage = await isVisibleSafely(
        page.getByText("No worlds have been created yet")
      );
      
      if (noWorldsMessage) {
        await page.getByRole("button", { name: /Snapp/i }).click();
        await page.getByRole("button", { name: "Create world" }).click();
        await waitForModalOpen(page, "world", 5000);
        const createWorldDialog = page.getByRole("dialog", { name: /create world/i });
        await page.getByLabel("World name").fill(uniqueWorldName);
        await page.getByLabel("Description").fill("A high-fantasy realm.");
        await page.getByRole("button", { name: "Save world" }).click();
        
        try {
          await waitForModalClose(page, "world", 5000);
        } catch (error) {
          const errorVisible = await isVisibleSafely(page.getByTestId("error-message"), 2000);
          if (errorVisible) {
            const errorText = await page.getByTestId("error-message").textContent();
            if (errorText?.includes("already exists") || errorText?.includes("duplicate")) {
              const cancelButton = createWorldDialog.getByRole("button", { name: "Cancel" });
              if (await isVisibleSafely(cancelButton)) {
                await cancelButton.click();
                await waitForModalClose(page, "world", 3000);
              }
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
        
        let worldExists = await isVisibleSafely(
          worldContextTablist.getByRole("tab", { name: uniqueWorldName })
        );
        
        if (!worldExists) {
          await safeWait(page, STABILITY_WAIT_MAX);
          worldExists = await isVisibleSafely(
            worldContextTablist.getByRole("tab", { name: uniqueWorldName })
          );
        }
        
        if (worldExists) {
          const stillOpen = await isVisibleSafely(createWorldDialog);
          if (stillOpen) {
            const cancelButton = createWorldDialog.getByRole("button", { name: "Cancel" });
            if (await isVisibleSafely(cancelButton)) {
              await cancelButton.click();
            }
          }
          await storeWorldName(page, uniqueWorldName);
          hasUniqueWorld = true;
          await safeWait(page, STABILITY_WAIT_LONG);
        } else {
          const errorVisible = await isVisibleSafely(page.getByTestId("error-message"));
          if (errorVisible) {
            const errorText = await page.getByTestId("error-message").textContent();
            if (errorText?.includes("already exists") || errorText?.includes("duplicate")) {
              const cancelButton = createWorldDialog.getByRole("button", { name: "Cancel" });
              if (await isVisibleSafely(cancelButton)) {
                await cancelButton.click();
              }
              await safeWait(page, STABILITY_WAIT_MAX);
              const worldTab = worldContextTablist.getByRole("tab", { name: uniqueWorldName });
              const worldTabExists = await isVisibleSafely(worldTab);
              if (worldTabExists) {
                await expect(worldTab).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
                await storeWorldName(page, uniqueWorldName);
                hasUniqueWorld = true;
              } else {
                await expect(
                  worldContextTablist.getByRole("tab", { name: "Eldoria" })
                ).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
              }
            } else {
              const cancelButton = createWorldDialog.getByRole("button", { name: "Cancel" });
              if (await isVisibleSafely(cancelButton)) {
                await cancelButton.click();
              }
              throw new Error(`World creation failed: ${errorText}`);
            }
          } else {
            const modalStillOpen = await isVisibleSafely(createWorldDialog);
            if (modalStillOpen) {
              const cancelButton = createWorldDialog.getByRole("button", { name: "Cancel" });
              if (await isVisibleSafely(cancelButton)) {
                await cancelButton.click();
              }
            }
            await safeWait(page, STABILITY_WAIT_MAX);
            const worldTab = worldContextTablist.getByRole("tab", { name: uniqueWorldName });
            const worldTabExists = await isVisibleSafely(worldTab);
            if (worldTabExists) {
              await expect(worldTab).toBeVisible({ timeout: 3000 });
              await storeWorldName(page, uniqueWorldName);
              hasUniqueWorld = true;
            } else {
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

  if (await isPageClosedSafely(page)) {
    throw new Error("Page was closed unexpectedly");
  }

  await safeWait(page, STABILITY_WAIT_MEDIUM);
  
  let { worldTab, exists: worldTabExists } = await findWorldTab(
    page,
    worldContextTablist,
    uniqueWorldName,
    hasUniqueWorld
  );
  
  if (!worldTabExists) {
    await expect(worldContextTablist).toBeVisible({ timeout: 3000 });
    await safeWait(page, VISIBILITY_TIMEOUT_SHORT);
    
    try {
      const noWorldsMessage = await isVisibleSafely(
        page.getByText("No worlds have been created yet")
      );
      
      if (noWorldsMessage) {
        await page.getByRole("button", { name: /Snapp/i }).click();
        await page.getByRole("button", { name: "Create world" }).click();
        await waitForModalOpen(page, "world", 5000);
        const worldName = getUniqueCampaignName("Eldoria");
        await page.getByLabel("World name").fill(worldName);
        await page.getByLabel("Description").fill("A high-fantasy realm.");
        await page.getByRole("button", { name: "Save world" }).click();
        await waitForModalClose(page, "world", 5000);
        await expect(
          worldContextTablist.getByRole("tab", { name: worldName })
        ).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
        worldTab = worldContextTablist.getByRole("tab", { name: worldName });
        worldTabExists = true;
      } else {
        worldTab = worldContextTablist.getByRole("tab").first();
        worldTabExists = await isVisibleSafely(worldTab);
      }
    } catch (error: any) {
      if (error.message?.includes("closed") || (await isPageClosedSafely(page))) {
        throw new Error("Page or browser context was closed while trying to find world tab");
      }
    }
    
    if (!worldTabExists) {
      throw new Error("No world found to select. This may indicate a race condition during concurrent test execution or that worlds aren't being loaded properly.");
    }
  }
  
  const logoutButtonBeforeClick = page.getByRole("button", { name: "Log out" });
  const loggedInBeforeClick = await isVisibleSafely(logoutButtonBeforeClick, VISIBILITY_TIMEOUT_SHORT);
  if (!loggedInBeforeClick) {
    const guestViewCheck = await isVisibleSafely(page.getByText("Welcome to Snapp"), 1000);
    if (guestViewCheck) {
      throw new Error("Cannot click world tab: user appears to have been logged out. Guest view is visible. Ensure the login step completed successfully.");
    }
    throw new Error("Cannot click world tab: logout button is not visible. User may not be logged in. Ensure the login step completed successfully before selecting a world.");
  }
  
  try {
    await expect(worldTab).toBeVisible({ timeout: 5000 });
  } catch (error: any) {
    const actuallyClosed = await isPageClosedSafely(page);
    if (actuallyClosed || error.message?.includes("closed")) {
      throw new Error("Page or browser context was closed while waiting for world tab to be visible");
    }
    throw error;
  }
  
  await expect(worldTab).toBeEnabled({ timeout: 5000 });
  await safeWait(page, STABILITY_WAIT_SHORT);
  
  const worldNameRaw = await worldTab.textContent().catch(() => "unknown");
  const worldName = worldNameRaw?.trim().replace(/^[—–\-\s]+/, "").trim() || "unknown";
  
  const worldSelectedPromise = waitForWorldSelected(page, worldName, 8000);
  const planningModePromise = waitForPlanningMode(page, 10000);
  
  await expect(worldTab).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  await expect(worldTab).toBeEnabled({ timeout: VISIBILITY_TIMEOUT_SHORT });
  
  try {
    const box = await worldTab.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await worldTab.click({ force: true });
    }
    
    await safeWait(page, STABILITY_WAIT_EXTRA);
    
    let clickedSelected = false;
    for (let i = 0; i < 2; i++) {
      clickedSelected = await awaitSafelyBoolean(
        Promise.race([
          getAttributeSafely(worldTab, "aria-selected").then(attr => attr === "true"),
          createTimeoutPromise(500, false)
        ])
      );
      
      if (clickedSelected) {
        break;
      }
      await safeWait(page, STABILITY_WAIT_SHORT * (i + 1));
    }
    
    if (!clickedSelected) {
      await expect(worldTab).toBeVisible({ timeout: VISIBILITY_TIMEOUT_SHORT });
      await expect(worldTab).toBeEnabled({ timeout: VISIBILITY_TIMEOUT_SHORT });
      await worldTab.click({ force: true, timeout: VISIBILITY_TIMEOUT_SHORT });
      await safeWait(page, STABILITY_WAIT_LONG);
      
      for (let i = 0; i < 2; i++) {
        clickedSelected = await awaitSafelyBoolean(
          Promise.race([
            getAttributeSafely(worldTab, "aria-selected").then(attr => attr === "true"),
            createTimeoutPromise(500, false)
          ])
        );
        
        if (clickedSelected) {
          break;
        }
        await safeWait(page, STABILITY_WAIT_SHORT * (i + 1));
      }
      
      if (!clickedSelected) {
        const retryBox = await getBoundingBoxSafely(worldTab);
        if (retryBox) {
          await page.mouse.click(retryBox.x + retryBox.width / 2, retryBox.y + retryBox.height / 2);
          await safeWait(page, STABILITY_WAIT_LONG);
          clickedSelected = await awaitSafelyBoolean(
            Promise.race([
              getAttributeSafely(worldTab, "aria-selected").then(attr => attr === "true"),
              createTimeoutPromise(500, false)
            ])
          );
        }
      }
    }
  } catch (error: any) {
    if (error.message?.includes("closed") || (await isPageClosedSafely(page))) {
      throw new Error("Page or browser context was closed while clicking world tab");
    }
  }
  
  try {
    const results = await Promise.allSettled([
      worldSelectedPromise,
      planningModePromise
    ]);
    
    const worldSelectedSucceeded = results[0].status === "fulfilled";
    const planningModeSucceeded = results[1].status === "fulfilled";
    
    let planningTabsVisible = planningModeSucceeded ? true : await isPlanningModeActive(page);
    
    if (!planningTabsVisible) {
      const waitTime = worldSelectedSucceeded ? VISIBILITY_TIMEOUT_SHORT : STABILITY_WAIT_MAX;
      await safeWait(page, waitTime);
      planningTabsVisible = await isPlanningModeActive(page);
      
      if (!planningTabsVisible) {
        await safeWait(page, VISIBILITY_TIMEOUT_SHORT / 2);
        planningTabsVisible = await isPlanningModeActive(page);
      }
      
      if (!planningTabsVisible) {
        if (worldSelectedSucceeded) {
          const worldTabSelected = await awaitSafelyBoolean(
            Promise.race([
              getAttributeSafely(worldTab, "aria-selected").then(attr => attr === "true"),
              createTimeoutPromise(3000, false)
            ])
          );
          
          if (!worldTabSelected) {
            await safeWait(page, VISIBILITY_TIMEOUT_SHORT);
            const stillNotSelected = !(await awaitSafelyBoolean(
              Promise.race([
                getAttributeSafely(worldTab, "aria-selected").then(attr => attr === "true"),
                createTimeoutPromise(2000, false)
              ])
            ));
            
            if (stillNotSelected) {
              try {
                await worldTab.click({ force: true });
                await safeWait(page, STABILITY_WAIT_EXTRA);
              } catch {
                // Click failed - continue anyway
              }
            }
          }
          
          await safeWait(page, VISIBILITY_TIMEOUT_SHORT);
          planningTabsVisible = await isPlanningModeActive(page);
          
          if (planningTabsVisible) {
            return;
          }
          
          await safeWait(page, VISIBILITY_TIMEOUT_SHORT);
          planningTabsVisible = await isPlanningModeActive(page);
          
          if (planningTabsVisible) {
            return;
          }
        }
        
        const currentUrl = page.url();
        const logoutButtonStillVisible = await isVisibleSafely(
          page.getByRole("button", { name: "Log out" })
        );
        const guestViewVisible = await isVisibleSafely(
          page.getByText("Welcome to Snapp")
        );
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
        
        let errorMessage = `Planning mode did not activate after selecting world "${worldName}". `;
        errorMessage += `URL: ${currentUrl}, `;
        errorMessage += `Logout button visible: ${logoutButtonStillVisible}, `;
        errorMessage += `Guest view visible: ${guestViewVisible}, `;
        errorMessage += `World context visible: ${worldContextStillVisible}, `;
        errorMessage += `World tab visible: ${worldTabStillVisible}, World tab selected: ${worldTabSelected}. `;
        errorMessage += `World selection event fired: ${worldEventFired}, Planning mode event fired: ${planningEventFired}. `;
        
        if (!logoutButtonStillVisible && guestViewVisible) {
          errorMessage += `User appears to have been logged out (guest view is visible). `;
        } else if (!logoutButtonStillVisible) {
          errorMessage += `User may not be logged in (logout button not visible). `;
        } else if (!worldContextStillVisible) {
          errorMessage += `World context tablist is not visible - ensureModeSelectorVisible may have failed. `;
        }
        
        errorMessage += `This may indicate the click did not register, the events did not fire, or planning mode did not activate.`;
        
        throw new Error(errorMessage);
      }
    }
  } catch (error) {
    if (await isPlanningModeActive(page)) {
      return;
    }
    throw error;
  }

  if (subTab !== "World Entities") {
    if (await isPageClosedSafely(page)) {
      throw new Error("Page was closed before navigating to sub-tab");
    }
    await navigateToPlanningSubTabIfActive(page, subTab);
  }
}
