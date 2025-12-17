import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { When, Then } = createBdd();
// Note: "the admin navigates to the World Entities planning screen" is defined in world-create.steps.ts
// Note: "world Eldoria exists" and "the admin selects world Eldoria" are defined in world-entities-create.steps.ts

When("the admin navigates to the locations tab", async ({ page }) => {
  await page.getByRole("tab", { name: "Locations" }).click();
  await expect(page.getByRole("button", { name: "Add location" })).toBeVisible();
});

When('the admin ensures location "Whispering Woods" exists', async ({ page }) => {
  const hasLocation = await page
    .getByRole("listitem")
    .filter({ hasText: "Whispering Woods" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasLocation) {
    await page.getByRole("button", { name: "Add location" }).click();
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
