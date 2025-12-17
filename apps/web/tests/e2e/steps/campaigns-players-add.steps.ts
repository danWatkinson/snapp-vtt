import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
// Note: "the admin navigates to the Campaigns planning screen" and "the campaign Rise of the Dragon King exists" 
// are defined in campaigns-create.steps.ts

const { When, Then } = createBdd();

When("the admin navigates to the players view", async ({ page }) => {
  await page.getByRole("tab", { name: "Players" }).click();
});

When('the admin ensures player "alice" is added to the campaign', async ({ page }) => {
  const hasAlice = await page
    .getByRole("listitem")
    .filter({ hasText: "alice" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasAlice) {
    await page.getByRole("button", { name: "Add player" }).click();
    await expect(page.getByRole("dialog", { name: "Add player" })).toBeVisible();

    await page.getByLabel("Player username").fill("alice");
    await page.getByRole("button", { name: "Save player" }).click();
  }
});

Then('player "alice" appears in the players list', async ({ page }) => {
  await expect(
    page.getByRole("listitem").filter({ hasText: "alice" }).first()
  ).toBeVisible();
});
