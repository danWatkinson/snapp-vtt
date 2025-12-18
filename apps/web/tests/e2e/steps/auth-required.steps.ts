import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { loginAsAdmin } from "../helpers";

const { When, Then } = createBdd();

When("I sign in as admin via the login dialog", async ({ page }) => {
  // Ensure we start with a clean page state
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 5000 });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  
  // Clear any existing auth state
  try {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch {
    // If we can't clear storage, that's okay - continue
  }
  
  // Now login
  await loginAsAdmin(page);
  
  // Verify login completed
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible({ timeout: 5000 });
});

Then("I see a login entry point in the banner", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
});
