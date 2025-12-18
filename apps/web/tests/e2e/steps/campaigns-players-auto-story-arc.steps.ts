import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
// Note: "the admin navigates to the Campaigns planning screen" and "the campaign Rise of the Dragon King exists" 
// are defined in campaigns-create.steps.ts
// Note: "the admin navigates to the story arcs view" is defined in campaigns-story-arcs-add.steps.ts

const { When, Then } = createBdd();

When('the admin ensures player "bob" is added to the campaign', async ({ page }) => {
  const hasBob = await page
    .getByRole("listitem")
    .filter({ hasText: "bob" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasBob) {
    await page.getByRole("button", { name: "Add player" }).click();
    await expect(page.getByRole("dialog", { name: "Add player" })).toBeVisible();

    await page.getByLabel("Player username").fill("bob");
    await page.getByRole("button", { name: "Save player" }).click();

    await expect(
      page.getByRole("listitem").filter({ hasText: "bob" }).first()
    ).toBeVisible({ timeout: 3000 });
  }
});

Then('a story arc named "bob\'s Arc" is automatically created', async ({ page }) => {
  await expect(
    page.getByRole("listitem").filter({ hasText: "bob's Arc" }).first()
  ).toBeVisible({ timeout: 3000 });
});
