import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { When, Then } = createBdd();

When('the admin revokes the "gm" role from user "alice"', async ({ page }) => {
  const aliceItem = page.getByTestId("user-alice");
  await expect(aliceItem).toBeVisible();

  const gmRoleBadge = aliceItem.locator("span").filter({ hasText: "gm" });
  await expect(gmRoleBadge).toBeVisible();

  await gmRoleBadge.getByText("×").click();

  try {
    await Promise.race([
      page.getByTestId("error-message").waitFor({ timeout: 2000 }).catch(() => null),
      page.waitForTimeout(1000).catch(() => null)
    ]);
  } catch (error) {
    if (error.message?.includes("closed") || page.isClosed()) {
      throw new Error("Page was closed unexpectedly during role revocation");
    }
    // If it's not a page closure error, continue
  }

  // Check if page is still valid before continuing
  if (page.isClosed()) {
    throw new Error("Page was closed unexpectedly during role revocation");
  }

  const revokeErrorVisible = await page
    .getByTestId("error-message")
    .isVisible()
    .catch(() => false);
  if (revokeErrorVisible) {
    const errorText = await page.getByTestId("error-message").textContent();
    throw new Error(`Role revocation failed: ${errorText}`);
  }

  // Wait for UI to update, but check if page is still valid
  try {
    await page.waitForTimeout(500);
  } catch (error) {
    if (error.message?.includes("closed") || page.isClosed()) {
      throw new Error("Page was closed unexpectedly after role revocation");
    }
    throw error;
  }
});

Then('user "alice" no longer has the "gm" role in the users list', async ({ page }) => {
  const aliceItem = page.getByTestId("user-alice");
  const gmRoleBadge = aliceItem.locator("span").filter({ hasText: "gm" });
  await expect(gmRoleBadge).not.toBeVisible({ timeout: 3000 });
});
