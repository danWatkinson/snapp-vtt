import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { When, Then } = createBdd();
// Note: "the admin navigates to the World Entities planning screen" is defined in world-create.steps.ts
// Note: "world Eldoria exists" and "the admin selects world Eldoria" are defined in world-entities-create.steps.ts

When("the admin navigates to the all entities view", async ({ page }) => {
  await page.getByRole("tab", { name: "All" }).click();
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
