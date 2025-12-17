import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
// Note: "the admin navigates to the Campaigns planning screen" and "the campaign Rise of the Dragon King exists" 
// are defined in campaigns-create.steps.ts

const { When, Then } = createBdd();

When("the admin navigates to the sessions view", async ({ page }) => {
  await page
    .getByRole("tablist", { name: "Campaign views" })
    .getByRole("tab", { name: "Sessions" })
    .click();
});

When('session "Session 1" exists in the campaign', async ({ page }) => {
  const hasSession = await page
    .getByRole("listitem")
    .filter({ hasText: "Session 1" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasSession) {
    await expect(page.getByRole("button", { name: "Add session" })).toBeVisible();
    await page.getByRole("button", { name: "Add session" }).click();
    await page.getByLabel("Session name").fill("Session 1");
    await page.getByRole("button", { name: "Save session" }).click();

    await expect(
      page.getByRole("listitem").filter({ hasText: "Session 1" }).first()
    ).toBeVisible();
  }
});

When('the admin views scenes for session "Session 1"', async ({ page }) => {
  await page
    .getByRole("tablist", { name: "Campaign views" })
    .getByRole("tab", { name: "Sessions" })
    .click();

  await page
    .getByRole("listitem")
    .filter({ hasText: "Session 1" })
    .first()
    .getByRole("button", { name: "View scenes" })
    .click();

  await expect(page.getByRole("button", { name: "Add scene" })).toBeVisible();
});

When('the admin ensures scene "The Throne Room" exists in the session', async ({ page }) => {
  const hasScene = await page
    .getByRole("listitem")
    .filter({ hasText: "The Throne Room" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasScene) {
    await page.getByRole("button", { name: "Add scene" }).click();
    await expect(page.getByRole("dialog", { name: "Add scene" })).toBeVisible();

    const addSceneDialog = page.getByRole("dialog", { name: "Add scene" });

    await addSceneDialog.getByLabel("Scene name").fill("The Throne Room");
    await addSceneDialog.getByLabel("Summary", { exact: true }).fill("A tense negotiation with the king.");

    await addSceneDialog.getByLabel("World").selectOption("Eldoria");

    await page.getByRole("button", { name: "Save scene" }).click();
  }
});

Then('scene "The Throne Room" appears in the scenes list', async ({ page }) => {
  await expect(
    page.getByRole("listitem").filter({ hasText: "The Throne Room" }).first()
  ).toBeVisible();
});
