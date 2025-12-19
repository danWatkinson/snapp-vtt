import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { getUniqueUsername } from "../helpers";

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
