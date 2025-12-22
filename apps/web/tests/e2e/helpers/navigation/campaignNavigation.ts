import { Page, expect } from "@playwright/test";
import {
  CAMPAIGN_SELECTED_EVENT,
  CAMPAIGN_VIEW_CHANGED_EVENT
} from "../../../../lib/auth/authEvents";
import { DEFAULT_EVENT_TIMEOUT, STABILITY_WAIT_SHORT, STABILITY_WAIT_MEDIUM, STABILITY_WAIT_EXTRA, STABILITY_WAIT_MAX, VISIBILITY_TIMEOUT_SHORT, VISIBILITY_TIMEOUT_MEDIUM } from "../constants";
import { isVisibleSafely, getAttributeSafely, awaitSafely, safeWait, isPageClosedSafely, waitForStateSafely, waitForLocatorSafely } from "../utils";
import { waitForModalOpen, waitForModalClose } from "../modals";
import { selectWorldAndEnterMode, selectWorldAndEnterModeWithWorldName, waitForSubTab } from "./worldNavigation";

// Import isModeActive - it's not exported, so we need to check tabs directly
async function isModeActive(page: Page): Promise<boolean> {
  return await isVisibleSafely(
    page.getByRole("tablist", { name: "World views" })
  );
}

/**
 * Check if a campaign is currently selected by checking for campaign views visibility.
 */
export async function isCampaignSelected(page: Page): Promise<boolean> {
  return await isVisibleSafely(
    page.getByRole("tablist", { name: "Campaign views" })
  );
}

/**
 * Check if a specific campaign is currently selected by checking the heading.
 */
export async function isCampaignSelectedByName(page: Page, campaignName: string): Promise<boolean> {
  const selectedCampaignHeading = page
    .locator('h3.snapp-heading')
    .filter({ hasText: campaignName })
    .first();
  return await isVisibleSafely(selectedCampaignHeading);
}

/**
 * Navigate to the Campaigns planning sub-tab.
 */
export async function navigateToCampaignsTab(page: Page): Promise<void> {
  const campaignsTab = page
    .getByRole("tablist", { name: "World views" })
    .getByRole("tab", { name: "Campaigns" });
  
  const isOnCampaignsTab = await isVisibleSafely(campaignsTab);
  if (!isOnCampaignsTab) {
    const campaignsPromise = waitForSubTab(page, "Campaigns", 5000);
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

  // Check if we have a stored world name from API-based campaign creation (Background steps)
  let storedWorldName: string | null = null;
  try {
    storedWorldName = await page.evaluate(() => {
      return (window as any).__testWorldName || null;
    });
  } catch {
    // Page might not be ready - that's okay, we'll use default behavior
  }

  // Ensure we're in the appropriate mode with a world selected
  if (!(await isModeActive(page))) {
    // Need to select a world first
    if (storedWorldName) {
      await selectWorldAndEnterModeWithWorldName(page, "Campaigns", storedWorldName);
    } else {
      await selectWorldAndEnterMode(page, "Campaigns");
    }
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
    const worldEntitiesTab = page
      .getByRole("tablist", { name: "World views" })
      .getByRole("tab", { name: "World Entities" });
    
    if (await isVisibleSafely(worldEntitiesTab)) {
      const worldEntitiesPromise = waitForSubTab(page, "World Entities", 5000);
      await worldEntitiesTab.click();
      await awaitSafely(worldEntitiesPromise);
      
      // Now navigate back to Campaigns
      const campaignsTab = page
        .getByRole("tablist", { name: "World views" })
        .getByRole("tab", { name: "Campaigns" });
      const campaignsPromise = waitForSubTab(page, "Campaigns", 5000);
      await campaignsTab.click();
      await awaitSafely(campaignsPromise);
      
      // Re-check if campaign views are still visible
      const stillSelected = await isVisibleSafely(
        page.getByRole("tablist", { name: "Campaign views" })
      );
      
      if (stillSelected) {
        const campaignsPromise2 = waitForSubTab(page, "Campaigns", 5000);
        await campaignsTab.click();
        await awaitSafely(campaignsPromise2);
      }
    }
  }

  // Wait for UI to settle
  const campaignsTab = page
    .getByRole("tablist", { name: "World views" })
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
      await safeWait(page, STABILITY_WAIT_LONG);
    } else {
      const finalCampaignViewsVisible = await isCampaignSelected(page);
      
      if (finalCampaignViewsVisible) {
        const campaignNameVisible = await isVisibleSafely(
          page.getByText(campaignName).first()
        );
        
        if (campaignNameVisible) {
          if (await isCampaignSelectedByName(page, campaignName)) {
            return; // Already have the correct campaign selected
          }
          
          await tryDeselectCampaign(page);
          
          const hiddenCampaignTab = page
            .getByRole("tab", { name: campaignName })
            .first();
          
          const tabExists = await hiddenCampaignTab.count().catch(() => 0) > 0;
          if (tabExists) {
            try {
              if (!(await isPageClosedSafely(page))) {
                await hiddenCampaignTab.click({ force: true, timeout: VISIBILITY_TIMEOUT_SHORT });
                await safeWait(page, STABILITY_WAIT_EXTRA);
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
          
          throw new Error(`Campaign "${campaignName}" exists but cannot be selected. Attempted to deselect current campaign but selection still failed.`);
        }
        
        // Try using the Snapp menu "New Campaign" button as a last resort
        try {
          await page.getByRole("button", { name: /^Snapp/i }).click();
          const newCampaignButton = page.getByRole("button", { name: "New Campaign" });
          if (await isVisibleSafely(newCampaignButton, 2000)) {
            await newCampaignButton.click();
            const dialog = page.getByRole("dialog", { name: /create campaign/i });
            const dialogVisible = await isVisibleSafely(dialog, 2000);
            if (dialogVisible) {
              await page.getByLabel("Campaign name").fill(campaignName);
              await page.getByLabel("Summary").fill(summary);
              await page.getByRole("button", { name: "Save campaign" }).click();
              
              await Promise.race([
                waitForStateSafely(dialog, "hidden", 3000),
                waitForLocatorSafely(page.getByTestId("error-message"), 3000),
                waitForLocatorSafely(page.getByRole("tab", { name: campaignName }), 3000)
              ]);
              
              const campaignTab = await isVisibleSafely(page.getByRole("tab", { name: campaignName }).first());
              if (campaignTab) {
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
        
        throw new Error(
          `Cannot create campaign "${campaignName}" because another campaign is selected and could not be deselected using the Leave Campaign button. ` +
          `This may indicate a UI state issue.`
        );
      }
    }
  }

  // Check if campaign tab exists
  await safeWait(page, 200);
  
  const hasCampaignTab = await isVisibleSafely(
    page.getByRole("tab", { name: campaignName }).first()
  );

  const campaignExistsAnywhere = hasCampaignTab || 
    (await isVisibleSafely(page.getByText(campaignName).first()));

  const canCreateCampaign = !(await isCampaignSelected(page));

  if (!campaignExistsAnywhere && canCreateCampaign) {
    // Campaign doesn't exist and we can create it
    await safeWait(page, STABILITY_WAIT_EXTRA);
    const newCampaignViewsVisible = await isVisibleSafely(
      page.getByRole("tablist", { name: "Campaign views" })
    );
    
    if (newCampaignViewsVisible) {
      const selectedCampaignHeading = page
        .locator('h3.snapp-heading')
        .filter({ hasText: campaignName })
        .first();
      
      const isCorrectCampaign = await isVisibleSafely(selectedCampaignHeading);
      if (isCorrectCampaign) {
        return; // Already have the correct campaign selected
      }
      await page.getByRole("button", { name: /^Snapp/i }).click();
      const leaveCampaignButton = page.getByRole("button", { name: "Leave Campaign" });
      if (await isVisibleSafely(leaveCampaignButton, 2000)) {
        await leaveCampaignButton.click();
        await safeWait(page, STABILITY_WAIT_EXTRA);
      }
    }
    
    try {
      if (await isPageClosedSafely(page)) {
        throw new Error("Page was closed before opening Snapp menu");
      }
      await page.getByRole("button", { name: /^Snapp/i }).click();
      await safeWait(page, STABILITY_WAIT_MAX);
      
      let newCampaignButton = page.getByRole("button", { name: "New Campaign" });
      let buttonVisible = false;
      for (let retry = 0; retry < 3; retry++) {
        buttonVisible = await newCampaignButton.isVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM }).catch(() => false);
        if (buttonVisible) {
          break;
        }
        if (retry < 2) {
          await safeWait(page, STABILITY_WAIT_MEDIUM);
        }
      }
      
      if (!buttonVisible) {
        throw new Error("New Campaign button not found in Snapp menu after multiple retries");
      }
      
      await expect(newCampaignButton).toBeVisible({ timeout: VISIBILITY_TIMEOUT_SHORT });
      
      if (await isPageClosedSafely(page)) {
        throw new Error("Page was closed before clicking New Campaign");
      }
      await newCampaignButton.click();
    } catch (error: any) {
      const actuallyClosed = await isPageClosedSafely(page);
      if (actuallyClosed) {
        throw new Error("Page was closed while trying to create campaign via Snapp menu");
      }
      throw error;
    }
    
    await waitForModalOpen(page, "campaign", 5000);
    
    await page.getByLabel("Campaign name").fill(campaignName);
    await page.getByLabel("Summary").fill(summary);
    await page.getByRole("button", { name: "Save campaign" }).click();

    const createCampaignDialog = page.getByRole("dialog", { name: /create campaign/i });
    try {
      await waitForModalClose(page, "campaign", 5000);
    } catch (error) {
      const errorVisible = await isVisibleSafely(page.getByTestId("error-message"), 3000);
      if (errorVisible) {
        const errorText = await page.getByTestId("error-message").textContent();
        if (errorText?.includes("already exists") || errorText?.includes("duplicate")) {
          const cancelButton = createCampaignDialog.getByRole("button", { name: "Cancel" });
          if (await isVisibleSafely(cancelButton)) {
            await cancelButton.click();
            await waitForModalClose(page, "campaign", 3000);
          }
          await expect(
            page.getByRole("tab", { name: campaignName })
          ).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
          return;
        }
        throw new Error(`Campaign creation failed: ${errorText}`);
      }
      throw error;
    }

    const errorMessage = await isVisibleSafely(page.getByTestId("error-message"));
    if (errorMessage) {
      const cancelButton = createCampaignDialog.getByRole("button", { name: "Cancel" });
      if (await isVisibleSafely(cancelButton)) {
        await cancelButton.click();
      }
    } else {
      const stillOpen = await isVisibleSafely(createCampaignDialog);
      if (stillOpen) {
        const campaignTab = page.getByRole("tab", { name: campaignName });
        const campaignTabVisible = await isVisibleSafely(campaignTab, 3000);
        if (campaignTabVisible) {
          const cancelButton = createCampaignDialog.getByRole("button", { name: "Cancel" });
          if (await isVisibleSafely(cancelButton)) {
            await cancelButton.click();
          }
        }
      }
    }

    await safeWait(page, STABILITY_WAIT_MAX);
    
    const campaignViewsVisible = await isVisibleSafely(
      page.getByRole("tablist", { name: "Campaign views" })
    );
    
    if (campaignViewsVisible) {
      const selectedCampaignHeading = page
        .locator('h3.snapp-heading')
        .filter({ hasText: campaignName })
        .first();
      
      const isCorrectCampaign = await isVisibleSafely(selectedCampaignHeading);
      if (isCorrectCampaign) {
        return; // Campaign is already selected, we're done
      }
      await page.getByRole("button", { name: /^Snapp/i }).click();
      const leaveCampaignButton = page.getByRole("button", { name: "Leave Campaign" });
      if (await isVisibleSafely(leaveCampaignButton, 2000)) {
        await leaveCampaignButton.click();
        await safeWait(page, STABILITY_WAIT_EXTRA);
      }
    }
    
    try {
      if (await isPageClosedSafely(page)) {
        throw new Error("Page was closed before selecting campaign tab");
      }
      const campaignTab = page.getByRole("tab", { name: campaignName }).first();
      await expect(campaignTab).toBeVisible({ timeout: 3000 });
      
      if (await isPageClosedSafely(page)) {
        throw new Error("Page was closed before clicking campaign tab");
      }
      await campaignTab.click();
    } catch (error: any) {
      const actuallyClosed = await isPageClosedSafely(page);
      if (actuallyClosed) {
        throw new Error("Page was closed while trying to select campaign");
      }
      throw error;
    }
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
      const campaignHeading = page
        .locator('h3.snapp-heading')
        .filter({ hasText: campaignName })
        .first();
      
      const headingVisible = await isVisibleSafely(campaignHeading);
      if (headingVisible) {
        return; // Campaign is already selected, we're done
      }
      
      throw new Error(`Campaign "${campaignName}" appears to exist but cannot be found or selected in the UI`);
    }
  }
  
  if (await isPageClosedSafely(page)) {
    throw new Error("Page was closed during ensureCampaignExists");
  }
}

/**
 * Wait for a campaign to be selected using transition events.
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
          if (eventCampaignName && (eventCampaignName === name || eventCampaignName.includes(name)) && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener("snapp:campaign-selected", handler);
            resolve();
          }
        };

        window.addEventListener("snapp:campaign-selected", handler);

        setTimeout(() => {
          if (resolved) return;
          
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
    const campaignViewsTablist = page.getByRole("tablist", { name: "Campaign views" });
    const campaignTab = campaignViewsTablist.getByRole("tab", { name: new RegExp(campaignName, "i") });
    await expect(campaignTab).toBeVisible({ timeout });
    const startTime = Date.now();
    const pollTimeout = Math.min(timeout, VISIBILITY_TIMEOUT_SHORT);
    while (Date.now() - startTime < pollTimeout) {
      const isSelected = await campaignTab.getAttribute("aria-selected");
      if (isSelected === "true") {
        return;
      }
      await safeWait(page, STABILITY_WAIT_SHORT);
    }
    const finalSelected = await campaignTab.getAttribute("aria-selected");
    if (finalSelected !== "true") {
      throw new Error(`Campaign tab "${campaignName}" is visible but not selected after ${pollTimeout}ms`);
    }
  })();

  await Promise.race([
    eventPromise.catch(() => {
      return Promise.resolve();
    }),
    tabPromise
  ]);
}

/**
 * Wait for a campaign view to be activated using transition events.
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
  const viewPromise = (async () => {
    const viewToAddButton: Record<string, string> = {
      sessions: "Add session",
      "story-arcs": "Add story arc",
      players: "Add player",
      timeline: "current moment"
    };
    
    const addButtonText = viewToAddButton[view];
    if (view === "timeline") {
      const timelineHeading = page.getByRole("heading", { name: /timeline/i });
      await expect(timelineHeading).toBeVisible({ timeout });
    } else if (addButtonText) {
      const addButton = page.getByRole("button", { name: addButtonText });
      await expect(addButton).toBeVisible({ timeout });
    }
  })();

  await Promise.race([
    eventPromise.catch(() => Promise.resolve()),
    viewPromise
  ]);
}

/**
 * Navigate to a specific campaign view (Sessions, Story Arcs, Players, Timeline).
 * Requires a campaign to be selected first.
 */
export async function navigateToCampaignView(
  page: Page,
  view: "sessions" | "story-arcs" | "players" | "timeline"
): Promise<void> {
  const campaignViewsTablist = page.getByRole("tablist", { name: "Campaign views" });
  const campaignViewsVisible = await isVisibleSafely(campaignViewsTablist, 2000);
  
  if (!campaignViewsVisible) {
    throw new Error(`Cannot navigate to ${view} view: No campaign is currently selected. Campaign views tablist is not visible.`);
  }
  
  const viewToTabName: Record<string, string> = {
    sessions: "Sessions",
    "story-arcs": "Story arcs",
    players: "Players",
    timeline: "Timeline"
  };
  
  const tabName = viewToTabName[view];
  if (!tabName) {
    throw new Error(`Unknown campaign view: ${view}`);
  }
  
  const tab = campaignViewsTablist.getByRole("tab", { name: tabName });
  const isSelected = await getAttributeSafely(tab, "aria-selected");
  
  if (isSelected === "true") {
    return; // Already on the requested view
  }
  
  const viewPromise = waitForCampaignView(page, view, 5000);
  
  await expect(tab).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  await tab.click();
  
  await awaitSafely(viewPromise);
}

/**
 * Check if currently on a specific campaign view by looking for the "Add" button.
 */
export async function isOnCampaignView(
  page: Page,
  view: "sessions" | "story-arcs" | "players" | "timeline"
): Promise<boolean> {
  const viewToAddButton: Record<string, string> = {
    sessions: "Add session",
    "story-arcs": "Add story arc",
    players: "Add player",
    timeline: "current moment"
  };
  
  const addButtonText = viewToAddButton[view];
  if (!addButtonText) {
    return false;
  }
  
  if (view === "timeline") {
    const timelineHeading = page.getByRole("heading", { name: /timeline/i });
    return await isVisibleSafely(timelineHeading, 1000);
  }
  
  const addButton = page.getByRole("button", { name: addButtonText });
  return await isVisibleSafely(addButton, 1000);
}
