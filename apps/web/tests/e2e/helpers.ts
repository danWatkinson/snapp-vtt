import { Page, expect } from "@playwright/test";

/**
 * Helper function to log in a user before accessing the application.
 * This should be called at the start of any test that needs authentication.
 */
export async function loginAs(page: Page, username: string, password: string) {
  await page.goto("/");

  // Open login modal via banner Login button
  await page.getByRole("button", { name: "Login" }).click();

  // Wait for login form to be visible in the modal
  await page.getByTestId("login-username").waitFor({ timeout: 5000 });

  // Fill in credentials
  await page.getByTestId("login-username").fill(username);
  await page.getByTestId("login-password").fill(password);

  // Submit login form via keyboard (triggers form onSubmit reliably)
  await page.getByTestId("login-password").press("Enter");

  // Success criteria:
  // - Login dialog closes
  // - Application tabs (e.g. Users) become visible
  const loginDialog = page.getByRole("dialog", { name: "Login" });

  await expect(loginDialog).toBeHidden({ timeout: 15000 });
  await expect(page.getByRole("tab", { name: "Users" })).toBeVisible({
    timeout: 5000
  });
}

/**
 * Helper function to log in as admin (default test user).
 * Relies on seeded admin/admin123 user.
 */
export async function loginAsAdmin(page: Page) {
  await loginAs(page, "admin", "admin123");
}
