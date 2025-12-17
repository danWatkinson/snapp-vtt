import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
// Note: "the admin navigates to the Campaigns planning screen" and "the campaign Rise of the Dragon King exists" 
// are defined in campaigns-create.steps.ts

const { When, Then } = createBdd();

When("the admin navigates to the campaign timeline view", async ({ page }) => {
  await page.getByRole("tab", { name: "Timeline" }).click();
});

Then("the active story arcs section is visible", async ({ page }) => {
  await expect(page.getByRole("heading", { name: /timeline/i })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /active story arcs/i })
  ).toBeVisible({ timeout: 10000 });
});
