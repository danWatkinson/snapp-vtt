import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { getUniqueUsername, ensureLoginDialogClosed } from "../helpers";

const { Then } = createBdd();

// Helper to get the unique alice username from page context
async function getStoredAliceUsername(page: any): Promise<string> {
  try {
    const storedName = await page.evaluate(() => {
      return (window as any).__testAliceUsername;
    });
    if (storedName) {
      return storedName;
    }
  } catch {
    // Can't retrieve - fall back to unique name generation
  }
  // Fall back to generating unique name if not stored
  return getUniqueUsername("alice");
}

Then("the users list is visible", async ({ page }) => {
  // Navigate to Users screen first (if not already there)
  const usersTab = page.locator('[data-component="UsersTab"]');
  const isOnUsersScreen = await usersTab.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (!isOnUsersScreen) {
    await ensureLoginDialogClosed(page);
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible({ timeout: 3000 });
    await page.getByRole("button", { name: /^Snapp/i }).click();
    await expect(page.getByRole("button", { name: "User Management" })).toBeVisible({ timeout: 3000 });
    await page.getByRole("button", { name: "User Management" }).click();
    await page.waitForSelector('[data-component="UsersTab"]', { timeout: 3000 });
  }
  
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

Then('the test user appears in the users list', async ({ page }) => {
  const uniqueAliceName = await getStoredAliceUsername(page);
  await expect(page.getByTestId(`username-${uniqueAliceName}`)).toBeVisible({
    timeout: 3000
  });
});
