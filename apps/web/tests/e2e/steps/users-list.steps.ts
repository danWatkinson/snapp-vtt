import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Then } = createBdd();

Then("the users list is visible", async ({ page }) => {
  // The UsersTab shows "User Management" as the heading, not "Users"
  await expect(page.getByRole("heading", { name: /User Management/i })).toBeVisible({
    timeout: 3000
  });
  // Check for the UsersTab component or the users list
  await expect(page.locator('[data-component="UsersTab"]')).toBeVisible({
    timeout: 3000
  });
});

Then('the user "admin" appears in the users list', async ({ page }) => {
  await expect(page.getByTestId("username-admin")).toBeVisible({
    timeout: 3000
  });
});

Then('the user "alice" appears in the users list', async ({ page }) => {
  await expect(page.getByTestId("username-alice")).toBeVisible({
    timeout: 3000
  });
});
