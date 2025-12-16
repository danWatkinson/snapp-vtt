import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("unauthenticated users cannot see any application content", async ({ page }) => {
  await page.goto("/");

  // Should not see any application shell (world context panel)
  // Should only see splash/login entry point
  await expect(
    page.getByRole("heading", { name: "World context and mode" })
  ).not.toBeVisible();

  // Should see banner login control (entry point to login)
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
});

test("authenticated users can see application content", async ({ page }) => {
  await loginAsAdmin(page);

  // Wait for login to complete - verify authenticated UI appears
  await expect(
    page.getByRole("heading", { name: "World context and mode" })
  ).toBeVisible({ timeout: 5000 });
});

test("users are redirected to login when accessing protected content", async ({ page }) => {
  // Try to access the page directly
  await page.goto("/");

  // Should be shown splash/login entry point, not application content
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  
  // Application shell should not be visible
  await expect(
    page.getByRole("heading", { name: "World context and mode" })
  ).not.toBeVisible();
});
