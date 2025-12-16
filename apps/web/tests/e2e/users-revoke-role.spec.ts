import { test, expect } from "@playwright/test";
import { loginAsAdmin, selectWorldAndEnterPlanningMode } from "./helpers";

test("Admin can revoke a role from a user", async ({ page }) => {
  await loginAsAdmin(page);

  // Navigate into Users planning view (world context + Users tab)
  await selectWorldAndEnterPlanningMode(page, "Users");

  // First, ensure alice has the gm role
  await page.getByTestId("assign-target-username").fill("alice");
  await page.getByTestId("assign-role").fill("gm");
  await page.getByRole("button", { name: "Assign role" }).click();

  // Wait for role assignment to complete - check for error or wait for UI update
  await Promise.race([
    page.getByTestId("error-message").waitFor({ timeout: 2000 }).catch(() => null),
    page.waitForTimeout(1000)
  ]);
  
  // Verify no error occurred
  const errorVisible = await page.getByTestId("error-message").isVisible().catch(() => false);
  if (errorVisible) {
    const errorText = await page.getByTestId("error-message").textContent();
    throw new Error(`Role assignment failed: ${errorText}`);
  }

  // Wait for users list to load
  await expect(page.getByTestId("users-list")).toBeVisible({
    timeout: 10000
  });

  // Find alice in the user list
  const aliceItem = page.getByTestId("user-alice");
  await expect(aliceItem).toBeVisible();

  // Find the gm role badge and click the × button to revoke
  const gmRoleBadge = aliceItem.locator("span").filter({ hasText: "gm" });
  await expect(gmRoleBadge).toBeVisible();
  
  // Click the × button within the gm role badge
  await gmRoleBadge.getByText("×").click();

  // Wait for role revocation to complete - check for error or wait for UI update
  await Promise.race([
    page.getByTestId("error-message").waitFor({ timeout: 2000 }).catch(() => null),
    page.waitForTimeout(1000)
  ]);
  
  // Verify no error occurred
  const revokeErrorVisible = await page.getByTestId("error-message").isVisible().catch(() => false);
  if (revokeErrorVisible) {
    const errorText = await page.getByTestId("error-message").textContent();
    throw new Error(`Role revocation failed: ${errorText}`);
  }

  // Wait for UI to update
  await page.waitForTimeout(1000);

  // Verify alice no longer has gm role in the UI
  await expect(gmRoleBadge).not.toBeVisible({ timeout: 5000 });
});

