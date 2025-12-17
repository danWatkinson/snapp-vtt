import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
// Note: "the admin navigates to the Campaigns planning screen" and "the campaign Rise of the Dragon King exists" 
// are defined in campaigns-create.steps.ts

const { When, Then } = createBdd();

When('the admin ensures session "Session 1" exists in the campaign', async ({ page }) => {
  const hasSession = await page
    .getByRole("listitem")
    .filter({ hasText: "Session 1" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasSession) {
    await page.getByRole("button", { name: "Add session" }).click();
    await expect(page.getByRole("dialog", { name: "Add session" })).toBeVisible();

    await page.getByLabel("Session name").fill("Session 1");
    await page.getByRole("button", { name: "Save session" }).click();
  }
});

Then('session "Session 1" appears in the sessions list', async ({ page }) => {
  await expect(
    page.getByRole("listitem").filter({ hasText: "Session 1" }).first()
  ).toBeVisible();
});
