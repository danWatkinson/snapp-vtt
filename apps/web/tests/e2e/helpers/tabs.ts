import { Page, expect } from "@playwright/test";
import { isVisibleSafely } from "./utils";
import { VISIBILITY_TIMEOUT_MEDIUM } from "./constants";

/**
 * Sub-tabs within the World Entities screen
 */
export type SubTab = "Locations" | "Events" | "Creatures" | "Factions" | "World Entities" | "Campaigns" | "Story Arcs" | "Users";

/**
 * Mapping of sub-tabs to their corresponding "Add" button text
 */
const TAB_TO_ADD_BUTTON: Record<SubTab, string> = {
  "Locations": "Add location",
  "Events": "Add event",
  "Creatures": "Add creature",
  "Factions": "Add faction",
  "World Entities": "", // No add button for this tab
  "Campaigns": "", // No add button for this tab
  "Story Arcs": "", // No add button for this tab
  "Users": "" // No add button for this tab
};

/**
 * Check if mode is currently active by checking for tabs visibility.
 */
async function isModeActive(page: Page): Promise<boolean> {
  return await isVisibleSafely(
    page.getByRole("tablist", { name: "World views" })
  );
}

/**
 * Navigate to a sub-tab within the World Entities screen.
 * Verifies the tab is active by checking for the corresponding "Add" button.
 * 
 * @param page - Playwright page object
 * @param tabName - Name of the tab to navigate to
 * @param verifyButton - Whether to verify the "Add" button is visible (default: true)
 */
export async function navigateToSubTab(
  page: Page,
  tabName: SubTab,
  verifyButton: boolean = true
): Promise<void> {
  // Find the tab directly (tabs are accessible directly, not necessarily through tablist)
  // This matches the pattern used in the original step definitions
  const tab = page.getByRole("tab", { name: tabName });
  
  // Check if tab is already selected
  const isSelected = await tab.getAttribute("aria-selected").catch(() => null);
  if (isSelected === "true") {
    // Already on the correct tab - verify button if requested
    if (verifyButton) {
      const addButtonText = TAB_TO_ADD_BUTTON[tabName];
      if (addButtonText) {
        const addButton = page.getByRole("button", { name: addButtonText });
        const isVisible = await isVisibleSafely(addButton, 1000);
        if (isVisible) {
          return; // Tab is active and button is visible
        }
      } else {
        return; // Tab is active and no button to verify
      }
    } else {
      return; // Tab is active, no verification needed
    }
  }
  
  // Navigate to the tab - wait for it to be visible
  await expect(tab).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  await tab.click();
  
  // Verify the corresponding "Add" button is visible (if applicable)
  if (verifyButton) {
    const addButtonText = TAB_TO_ADD_BUTTON[tabName];
    if (addButtonText) {
      const addButton = page.getByRole("button", { name: addButtonText });
      await expect(addButton).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
    }
  }
}

/**
 * Navigate to the Locations tab within the World Entities screen.
 * Convenience wrapper for `navigateToSubTab(page, "Locations")`.
 */
export async function navigateToLocationsTab(page: Page): Promise<void> {
  await navigateToSubTab(page, "Locations");
}

/**
 * Navigate to the Events tab within the World Entities screen.
 * Convenience wrapper for `navigateToSubTab(page, "Events")`.
 */
export async function navigateToEventsTab(page: Page): Promise<void> {
  await navigateToSubTab(page, "Events");
}

/**
 * Navigate to the Creatures tab within the World Entities screen.
 * Convenience wrapper for `navigateToSubTab(page, "Creatures")`.
 */
export async function navigateToCreaturesTab(page: Page): Promise<void> {
  await navigateToSubTab(page, "Creatures");
}

/**
 * Navigate to the Factions tab within the World Entities screen.
 * Convenience wrapper for `navigateToSubTab(page, "Factions")`.
 */
export async function navigateToFactionsTab(page: Page): Promise<void> {
  await navigateToSubTab(page, "Factions");
}
