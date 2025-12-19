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

When('the admin ensures location "Whispering Woods" exists', async ({ page }) => {
  // Navigate to locations tab first (if not already there)
  const addLocationButton = page.getByRole("button", { name: "Add location" });
  const isOnLocationsTab = await addLocationButton.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (!isOnLocationsTab) {
    await page.getByRole("tab", { name: "Locations" }).click();
    await expect(addLocationButton).toBeVisible();
  }
  
  const hasLocation = await page
    .getByRole("listitem")
    .filter({ hasText: "Whispering Woods" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasLocation) {
    await addLocationButton.click();
    await expect(page.getByRole("dialog", { name: "Add location" })).toBeVisible();

    await page.getByLabel("Location name").fill("Whispering Woods");
    await page
      .getByLabel("Summary")
      .fill("An ancient forest filled with secret paths and spirits.");

    await page.getByRole("button", { name: "Save location" }).click();
  }
});

Then('location "Whispering Woods" appears in the locations list', async ({ page }) => {
  await expect(
    page.getByRole("listitem").filter({ hasText: "Whispering Woods" }).first()
  ).toBeVisible();
});
