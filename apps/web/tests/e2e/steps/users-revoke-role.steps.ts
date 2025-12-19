import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { getUniqueUsername, waitForRoleRevoked, waitForError } from "../helpers";

const { When, Then } = createBdd();

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

When('the admin revokes the "gm" role from the test user', async ({ page }) => {
  const uniqueAliceName = await getStoredAliceUsername(page);
  const aliceItem = page.getByTestId(`user-${uniqueAliceName}`);
  await expect(aliceItem).toBeVisible();

  const gmRoleBadge = aliceItem.locator("span").filter({ hasText: "gm" });
  await expect(gmRoleBadge).toBeVisible();

  // Set up event listener BEFORE clicking revoke
  // Reduced timeout from 10000ms to 5000ms for better performance
  const roleRevokedPromise = waitForRoleRevoked(page, uniqueAliceName, "gm", 5000);
  const errorPromise = waitForError(page, undefined, 5000).catch(() => null);

  await gmRoleBadge.getByText("×").click();

  // Wait for either role revocation or error
  try {
    await Promise.race([
      roleRevokedPromise,
      errorPromise.then((errorMsg) => {
        if (errorMsg) throw new Error(`Role revocation failed: ${errorMsg}`);
      })
    ]);
    // Role was revoked successfully
  } catch (error) {
    if (error.message?.includes("closed") || page.isClosed()) {
      throw new Error("Page was closed unexpectedly during role revocation");
    }
    throw error;
  }
});

Then('the test user no longer has the "gm" role in the users list', async ({ page }) => {
  const uniqueAliceName = await getStoredAliceUsername(page);
  const aliceItem = page.getByTestId(`user-${uniqueAliceName}`);
  const gmRoleBadge = aliceItem.locator("span").filter({ hasText: "gm" });
  await expect(gmRoleBadge).not.toBeVisible({ timeout: 3000 });
});
