import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
// Note: "the admin navigates to the Campaigns planning screen" and "the campaign Rise of the Dragon King exists" 
// are defined in campaigns-create.steps.ts

const { When, Then } = createBdd();

When("the admin navigates to the campaign timeline view", async ({ page }) => {
  await page.getByRole("tab", { name: "Timeline" }).click();
});

Then("the active story arcs section is visible", async ({ page }) => {
  // The Timeline view shows "Timeline" as a heading (h4 via SectionHeader) and "Active Story Arcs" as a heading (h3)
  // Check for either heading - both should be visible when timeline view is active
  await expect(page.getByRole("heading", { name: /^Timeline$/i })).toBeVisible({ timeout: 3000 });
  await expect(
    page.getByRole("heading", { name: /^Active Story Arcs$/i })
  ).toBeVisible({ timeout: 3000 });
});
