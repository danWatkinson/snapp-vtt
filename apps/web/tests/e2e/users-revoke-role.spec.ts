import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("Admin can revoke a role from a user", async ({ page }) => {
  await loginAsAdmin(page);

  // Navigate to Users tab (already logged in)
  await page.getByRole("tab", { name: "Users" }).click();

  // First, ensure alice has the gm role
  await page.getByTestId("assign-target-username").fill("alice");
  await page.getByTestId("assign-role").fill("gm");
  await page.getByRole("button", { name: "Assign role" }).click();

  // Wait for role assignment
  await expect(
    page.getByText(/User alice now has roles/i)
  ).toBeVisible({ timeout: 5000 });

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

  // Verify role was revoked
  await expect(
    page.getByText(/Role.*gm.*revoked from alice/i)
  ).toBeVisible({ timeout: 5000 });

  // Wait for UI to update
  await page.waitForTimeout(1000);

  // Verify alice no longer has gm role in the UI
  await expect(gmRoleBadge).not.toBeVisible({ timeout: 5000 });
});

