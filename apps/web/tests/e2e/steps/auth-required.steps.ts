import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { navigateAndWaitForReady } from "../helpers/utils";

const { When, Then } = createBdd();

When("an unidentified user visits the site", async ({ page }) => {
  // Navigate to the home page
  await navigateAndWaitForReady(page);
});

Then("they see the guest view", async ({ page }) => {
  // Verify the world planning UI is not visible (authenticated content)
  await expect(
    page.getByRole("heading", { name: "World context and mode" })
  ).not.toBeVisible({ timeout: 3000 });
  
  // Verify logout button is not visible (indicates not authenticated)
  await expect(page.getByRole("button", { name: "Log out" })).not.toBeVisible({
    timeout: 2000
  });
  
  // Verify login entry point is visible in the banner
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible({ timeout: 3000 });
});

Then("I see a login entry point in the banner", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
});
