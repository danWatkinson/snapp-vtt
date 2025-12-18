import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { When, Then } = createBdd();
// Note: "the admin navigates to the World Entities planning screen" is defined in world-create.steps.ts
// Note: "world Eldoria exists" and "the admin selects world Eldoria" are defined in world-entities-create.steps.ts

When("the admin navigates to the events tab", async ({ page }) => {
  // Ensure planning tabs are visible (world must be selected)
  const planningTabs = page.getByRole("tablist", { name: "World planning views" });
  await expect(planningTabs).toBeVisible({ timeout: 5000 });
  
  await expect(page.getByRole("tab", { name: "Events" })).toBeVisible({ timeout: 3000 });
  await page.getByRole("tab", { name: "Events" }).click();
  await expect(page.getByRole("button", { name: "Add event" })).toBeVisible({ timeout: 3000 });
});

When('the admin ensures event "The Great Awakening" exists', async ({ page }) => {
  const hasEvent = await page
    .getByRole("listitem")
    .filter({ hasText: "The Great Awakening" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasEvent) {
    await page.getByRole("button", { name: "Add event" }).click();
    await expect(page.getByRole("dialog", { name: "Add event" })).toBeVisible();

    await page.getByLabel("Event name").fill("The Great Awakening");
    await page.getByLabel("Summary").fill("Ancient dragons awaken from their slumber.");
    await page.getByRole("button", { name: "Save event" }).click();
  }
});

Then('event "The Great Awakening" appears in the events list', async ({ page }) => {
  await expect(
    page.getByRole("listitem").filter({ hasText: "The Great Awakening" }).first()
  ).toBeVisible();
});
