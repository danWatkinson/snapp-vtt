import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { When, Then } = createBdd();

When('the admin revokes the "gm" role from user "alice"', async ({ page }) => {
  const aliceItem = page.getByTestId("user-alice");
  await expect(aliceItem).toBeVisible();

  const gmRoleBadge = aliceItem.locator("span").filter({ hasText: "gm" });
  await expect(gmRoleBadge).toBeVisible();

  await gmRoleBadge.getByText("×").click();

  await Promise.race([
    page.getByTestId("error-message").waitFor({ timeout: 2000 }).catch(() => null),
    page.waitForTimeout(1000)
  ]);

  const revokeErrorVisible = await page
    .getByTestId("error-message")
    .isVisible()
    .catch(() => false);
  if (revokeErrorVisible) {
    const errorText = await page.getByTestId("error-message").textContent();
    throw new Error(`Role revocation failed: ${errorText}`);
  }

  await page.waitForTimeout(1000);
});

Then('user "alice" no longer has the "gm" role in the users list', async ({ page }) => {
  const aliceItem = page.getByTestId("user-alice");
  const gmRoleBadge = aliceItem.locator("span").filter({ hasText: "gm" });
  await expect(gmRoleBadge).not.toBeVisible({ timeout: 5000 });
});
