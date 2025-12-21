import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { ensureWorldExistsAndSelected } from "./world-entities-create.steps";

const { When, Then } = createBdd();
// Note: "the admin navigates to the World Entities planning screen" is defined in world-create.steps.ts
// Note: "world Eldoria exists" and "the admin selects world Eldoria" are defined in world-entities-create.steps.ts

// Combined step: world exists and is selected with locations tab
When("world {string} exists and is selected with locations tab", async ({ page }, worldName: string) => {
  await ensureWorldExistsAndSelected(page, worldName);
  
  // Navigate to locations tab
  await page.getByRole("tab", { name: "Locations" }).click();
  await expect(page.getByRole("button", { name: "Add location" })).toBeVisible();
});

When("the admin navigates to the locations tab", async ({ page }) => {
  await page.getByRole("tab", { name: "Locations" }).click();
  await expect(page.getByRole("button", { name: "Add location" })).toBeVisible();
});

When('the admin ensures location {string} exists', async ({ page }, locationName: string) => {
  // Navigate to locations tab first (if not already there)
  const addLocationButton = page.getByRole("button", { name: "Add location" });
  const isOnLocationsTab = await addLocationButton.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (!isOnLocationsTab) {
    await page.getByRole("tab", { name: "Locations" }).click();
    await expect(addLocationButton).toBeVisible();
  }
  
  const hasLocation = await page
    .getByRole("listitem")
    .filter({ hasText: locationName })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasLocation) {
    await addLocationButton.click();
    const dialog = page.getByRole("dialog", { name: "Add location" });
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Location name").fill(locationName);
    await dialog
      .getByLabel("Summary")
      .fill("An ancient forest filled with secret paths and spirits.");

    await dialog.getByRole("button", { name: "Save location" }).click();
    
    // Wait for the dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 3000 });

    // Wait for the location to appear in the list
    await expect(
      page.getByRole("listitem").filter({ hasText: locationName }).first()
    ).toBeVisible({ timeout: 3000 });
  }
});

Then('location {string} appears in the locations list', async ({ page }, locationName: string) => {
  await expect(
    page.getByRole("listitem").filter({ hasText: locationName }).first()
  ).toBeVisible({ timeout: 3000 });
});
