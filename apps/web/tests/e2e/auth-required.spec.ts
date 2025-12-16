import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("unauthenticated users cannot see any application content", async ({ page }) => {
  await page.goto("/");

  // Should not see any tabs or application content
  // Should only see splash/login entry point
  await expect(page.getByRole("tab", { name: "World" })).not.toBeVisible();
  await expect(page.getByRole("tab", { name: "Campaigns" })).not.toBeVisible();
  await expect(page.getByRole("tab", { name: "Sessions" })).not.toBeVisible();
  await expect(page.getByRole("tab", { name: "Users" })).not.toBeVisible();

  // Should see banner login control (entry point to login)
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
});

test("authenticated users can see application content", async ({ page }) => {
  await loginAsAdmin(page);

  // Wait for login to complete - check for status message or user info
  await expect(
    page.getByTestId("status-message").getByText(/Logged in as admin/i)
  ).toBeVisible({
    timeout: 5000
  });

  // Now should see application tabs
  await expect(page.getByRole("tab", { name: "World" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Campaigns" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Sessions" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Users" })).toBeVisible();
});

test("users are redirected to login when accessing protected content", async ({ page }) => {
  // Try to access the page directly
  await page.goto("/");

  // Should be shown splash/login entry point, not application content
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  
  // Application tabs should not be visible
  await expect(page.getByRole("tab", { name: "World" })).not.toBeVisible();
});

