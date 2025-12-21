import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { selectWorldAndEnterPlanningMode } from "../helpers";
import { STABILITY_WAIT_SHORT } from "../helpers/constants";
import { safeWait } from "../helpers/utils";

const { When, Then } = createBdd();
// Note: "world Eldoria exists" is defined in world-entities-create.steps.ts

When("the admin navigates to the all entities view", async ({ page }) => {
  // Check if we're already on the All tab
  const allTab = page.getByRole("tab", { name: "All" });
  const isOnAllTab = await allTab.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (isOnAllTab) {
    // Already on the All tab - check if it's selected
    const isSelected = await allTab.getAttribute("aria-selected").then(val => val === "true").catch(() => false);
    if (isSelected) {
      return; // Already on the all entities view
    }
  }
  
  // Check if we're in planning mode with a world selected
  const planningTabs = page.getByRole("tablist", { name: "World planning views" });
  const isInPlanningMode = await planningTabs.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (!isInPlanningMode) {
    // Navigate to World Entities planning screen and select world
    try {
      await selectWorldAndEnterPlanningMode(page, "World Entities");
    } catch (error) {
      // If planning mode activation failed, check if we're actually in planning mode anyway
      // Retry multiple times with delays - planning mode might activate shortly after the error
      let isActuallyInPlanningMode = false;
      for (let retry = 0; retry < 5; retry++) {
        await safeWait(page, STABILITY_WAIT_SHORT);
        const planningTabsCheck = page.getByRole("tablist", { name: "World planning views" });
        isActuallyInPlanningMode = await planningTabsCheck.isVisible({ timeout: 2000 }).catch(() => false);
        if (isActuallyInPlanningMode) {
          break; // Planning mode is active, continue
        }
      }
      if (!isActuallyInPlanningMode) {
        // Not in planning mode after retries - rethrow the error
        throw error;
      }
      // We're in planning mode despite the error - continue
    }
  }
  
  // Now click the All tab
  await allTab.click();
});

Then("either entities are visible or an empty message is shown", async ({ page }) => {
  const hasAnyEntities = await page
    .getByRole("listitem")
    .first()
    .isVisible()
    .catch(() => false);

  const hasEmptyMessage = await page
    .getByText("No entities have been added to this world yet.")
    .isVisible()
    .catch(() => false);

  expect(hasAnyEntities || hasEmptyMessage).toBe(true);

  if (hasAnyEntities) {
    await expect(page.getByRole("listitem").first()).toBeVisible();
  }
});
