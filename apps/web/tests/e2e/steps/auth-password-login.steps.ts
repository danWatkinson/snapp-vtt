import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { loginAs } from "../helpers";

const { When, Then } = createBdd();

When("I open the Snapp home page", async ({ page }) => {
  await page.goto("/");
});

When("I open the login dialog", async ({ page }) => {
  await page.getByRole("button", { name: "Login" }).click();
  await page.getByTestId("login-username").waitFor({ timeout: 5000 });
});

When(
  'I attempt to login as "admin" without providing a password',
  async ({ page }) => {
    await page.getByTestId("login-username").fill("admin");
    // Intentionally do not fill password; submit via Enter on password field
    await page.getByTestId("login-password").press("Enter");
  }
);

When(
  'I attempt to login as "admin" with password {string}',
  async ({ page }, password: string) => {
    await page.getByTestId("login-username").fill("admin");
    await page.getByTestId("login-password").fill(password);
    await page.getByTestId("login-password").press("Enter");
  }
);

Then("I stay on the login form", async ({ page }) => {
  await expect(
    page.getByRole("dialog", { name: "Login" })
  ).toBeVisible({ timeout: 5000 });
});

Then("I am not shown as logged in", async ({ page }) => {
  await expect(page.getByText(/Logged in as/i)).not.toBeVisible({
    timeout: 2000
  });
});

Then("the login dialog remains open", async ({ page }) => {
  await expect(
    page.getByRole("dialog", { name: "Login" })
  ).toBeVisible({ timeout: 5000 });
});

Then("the world planning UI is not visible", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: "World context and mode" })
  ).not.toBeVisible({ timeout: 5000 });
});

Then("the login dialog closes", async ({ page }) => {
  await expect(
    page.getByRole("dialog", { name: "Login" })
  ).toBeHidden({ timeout: 10000 });
});

Then("the world planning UI becomes visible", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: "World context and mode" })
  ).toBeVisible({ timeout: 5000 });
});

