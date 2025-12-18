import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { When, Then } = createBdd();
// Note: "the admin navigates to the World Entities planning screen" is defined in world-create.steps.ts
// Note: "world Eldoria exists" and "the admin selects world Eldoria" are defined in world-entities-create.steps.ts

When('the admin ensures event "The Great War" exists with timestamps', async ({ page }) => {
  const hasEvent = await page
    .getByRole("listitem")
    .filter({ hasText: "The Great War" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasEvent) {
    await page.getByRole("button", { name: "Add event" }).click();
    await expect(page.getByRole("dialog", { name: "Add event" })).toBeVisible();

    await page.getByLabel("Event name").fill("The Great War");
    await page
      .getByLabel("Summary")
      .fill("A massive conflict that reshaped the continent.");

    const beginningDate = new Date();
    beginningDate.setFullYear(beginningDate.getFullYear() - 1);
    await page
      .getByLabel("Beginning timestamp")
      .fill(beginningDate.toISOString().slice(0, 16));

    const endingDate = new Date();
    endingDate.setMonth(endingDate.getMonth() - 6);
    await page.getByLabel("Ending timestamp").fill(endingDate.toISOString().slice(0, 16));

    await page.getByRole("button", { name: "Save event" }).click();
  }
});

Then('event "The Great War" appears in the events list', async ({ page }) => {
  await expect(
    page.getByRole("listitem").filter({ hasText: "The Great War" }).first()
  ).toBeVisible({ timeout: 3000 });
});
