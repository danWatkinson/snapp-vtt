import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { loginAsAdmin } from "../helpers";

const { When, Then } = createBdd();

When("I sign in as admin via the login dialog", async ({ page }) => {
  await loginAsAdmin(page);
});

Then("I see a login entry point in the banner", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
});
