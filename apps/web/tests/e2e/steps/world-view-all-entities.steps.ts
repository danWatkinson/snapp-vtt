import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { selectWorldAndEnterMode } from "../helpers";
import { STABILITY_WAIT_SHORT } from "../helpers/constants";
import { safeWait, isVisibleSafely } from "../helpers/utils";

const { When, Then } = createBdd();
// Note: "world Eldoria exists" is defined in world-entities-create.steps.ts

When("the admin navigates to the all entities view", async ({ page }) => {
  // Check if we're already on the All tab
  const allTab = page.getByRole("tab", { name: "All" });
  const isOnAllTab = await isVisibleSafely(allTab, 1000);
  
  if (isOnAllTab) {
    // Already on the All tab - check if it's selected
    const isSelected = await allTab.getAttribute("aria-selected").then(val => val === "true").catch(() => false);
    if (isSelected) {
      return; // Already on the all entities view
    }
  }
  
  // Check if we're in world view with a world selected
  const worldTab = page.locator('[data-component="WorldTab"]');
  const isInWorldView = await isVisibleSafely(worldTab, 1000);
  
  if (!isInWorldView) {
    // Navigate to World view and select world
    await selectWorldAndEnterMode(page, "World Entities");
  }
  
  // With new navigation, "All" is the default entity type filter
  // Check if we need to click the "All" filter button
  const allTabVisible = await isVisibleSafely(allTab, 1000);
  if (allTabVisible) {
    const isSelected = await allTab.getAttribute("aria-selected").then(val => val === "true").catch(() => false);
    if (!isSelected) {
      await allTab.click();
    }
  }
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
