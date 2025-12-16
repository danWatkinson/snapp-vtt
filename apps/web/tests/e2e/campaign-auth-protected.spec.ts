import { test, expect } from "@playwright/test";
import { loginAsAdmin, selectWorldAndEnterPlanningMode } from "./helpers";

test("Campaign creation requires authentication", async ({ page }) => {
  await page.goto("/");

  // Should only see splash/login entry point, not tabs
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Campaigns" })).not.toBeVisible();
  
  // Cannot access campaign creation without logging in
  // Cannot access campaign creation without logging in
  // This test verifies that unauthenticated users cannot see application content
});

test("Authenticated user with gm role can create a campaign", async ({ page }) => {
  await loginAsAdmin(page);

  // Select a world and enter planning mode, then navigate to Campaigns sub-tab
  await selectWorldAndEnterPlanningMode(page, "Campaigns");

  // Create a campaign
  const campaignName = "Authenticated Test Campaign";
  const hasCampaign = await page
    .getByText(campaignName)
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasCampaign) {
    await page.getByRole("button", { name: "Create campaign" }).click();
    await expect(page.getByRole("dialog", { name: /create campaign/i })).toBeVisible();
    
    await page.getByLabel("Campaign name").fill(campaignName);
    await page.getByLabel("Summary").fill("A test campaign created by authenticated user");
    await page.getByRole("button", { name: "Save campaign" }).click();

    // Should succeed - verification is that the campaign appears below
  }

  // Verify campaign appears in list
  await expect(
    page.getByText(campaignName).first()
  ).toBeVisible({ timeout: 5000 });
});

