import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Then } = createBdd();

Then("the users list is visible", async ({ page }) => {
  await expect(page.getByRole("heading", { name: /^Users$/i })).toBeVisible({
    timeout: 5000
  });
  await expect(page.getByTestId("users-list")).toBeVisible({
    timeout: 10000
  });
});

Then('the user "admin" appears in the users list', async ({ page }) => {
  await expect(page.getByTestId("username-admin")).toBeVisible({
    timeout: 5000
  });
});

Then('the user "alice" appears in the users list', async ({ page }) => {
  await expect(page.getByTestId("username-alice")).toBeVisible({
    timeout: 5000
  });
});
