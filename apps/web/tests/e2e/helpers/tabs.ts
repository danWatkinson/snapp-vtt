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
 * Check if world view is currently active by checking for WorldTab component.
 */
async function isModeActive(page: Page): Promise<boolean> {
  return await isVisibleSafely(
    page.locator('[data-component="WorldTab"]')
  );
}

/**
 * Navigate to an entity type filter within the World view.
 * With the new navigation, entity types are filters, not separate tabs.
 * 
 * @param page - Playwright page object
 * @param tabName - Name of the entity type to filter by
 * @param verifyButton - Whether to verify the "Add" button is visible (default: true)
 */
export async function navigateToSubTab(
  page: Page,
  tabName: SubTab,
  verifyButton: boolean = true
): Promise<void> {
  // Ensure we're in world view
  const worldTab = page.locator('[data-component="WorldTab"]');
  const isInWorldView = await isVisibleSafely(worldTab, 2000);
  if (!isInWorldView) {
    throw new Error("Cannot navigate to entity type filter: not in world view. Select a world first.");
  }
  
  // Entity type filters are now tabs within the EntityTypeFilter component
  // Find the filter tab within the "Entity types" tablist
  const entityTypesTablist = page.getByRole("tablist", { name: "Entity types" });
  const filterTab = entityTypesTablist.getByRole("tab", { name: tabName });
  
  // Check if filter is already selected
  const isSelected = await filterTab.getAttribute("aria-selected").catch(() => null);
  if (isSelected === "true") {
    // Already on the correct filter - verify button if requested
    if (verifyButton) {
      const addButtonText = TAB_TO_ADD_BUTTON[tabName];
      if (addButtonText) {
        const addButton = page.getByRole("button", { name: addButtonText });
        const isVisible = await isVisibleSafely(addButton, 1000);
        if (isVisible) {
          return; // Filter is active and button is visible
        }
      } else {
        return; // Filter is active and no button to verify
      }
    } else {
      return; // Filter is active, no verification needed
    }
  }
  
  // Navigate to the filter - wait for it to be visible
  await expect(filterTab).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  await filterTab.click();
  
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
