import { test, expect } from "@playwright/test";

test("login requires password", async ({ page }) => {
  await page.goto("/");

  // Try to login with just username (no password)
  // HTML5 validation should prevent form submission
  await page.getByRole("button", { name: "Login" }).click();
  await page.getByTestId("login-username").fill("admin");
  // Don't fill password (it's required); submit via Enter on password field
  await page.getByTestId("login-password").press("Enter");

  // The form should not submit due to HTML5 validation
  // Check that we're still on the login form (no success message)
  await expect(page.getByText(/Logged in as/i)).not.toBeVisible({
    timeout: 2000
  });
});

test("login fails with incorrect password", async ({ page }) => {
  await page.goto("/");

  // Try to login with wrong password
  await page.getByRole("button", { name: "Login" }).click();
  await page.getByTestId("login-username").fill("admin");
  await page.getByTestId("login-password").fill("wrongpassword");
  await page.getByTestId("login-password").press("Enter");

  // Login should fail: dialog stays open and app content does not appear
  await expect(page.getByRole("dialog", { name: "Login" })).toBeVisible({
    timeout: 5000
  });
  await expect(
    page.getByRole("heading", { name: "World context and mode" })
  ).not.toBeVisible({ timeout: 5000 });
});

test("login succeeds with correct password", async ({ page }) => {
  await page.goto("/");

  // Login with correct password
  await page.getByRole("button", { name: "Login" }).click();
  await page.getByTestId("login-username").fill("admin");
  await page.getByTestId("login-password").fill("admin123");
  await page.getByTestId("login-password").press("Enter");

  // Should succeed - login dialog closes and application tabs appear
  await expect(page.getByRole("dialog", { name: "Login" })).toBeHidden({
    timeout: 10000
  });
  await expect(
    page.getByRole("heading", { name: "World context and mode" })
  ).toBeVisible({ timeout: 5000 });
});

