import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { ensureCampaignExists } from "../helpers";

const { Then, When } = createBdd();

Then("the campaigns tab is not visible", async ({ page }) => {
  await expect(page.getByRole("tab", { name: "Campaigns" })).not.toBeVisible();
});

When('the admin creates a campaign named "Authenticated Test Campaign"', async ({ page }) => {
  const campaignName = "Authenticated Test Campaign";
  
  // Use the helper function to ensure campaign exists
  await ensureCampaignExists(
    page,
    campaignName,
    "A test campaign created by authenticated user"
  );
});

Then('the campaign "Authenticated Test Campaign" appears in the campaigns list', async ({ page }) => {
  // Campaigns appear in a TabList with aria-label="Campaigns"
  // Each campaign is a TabButton with the campaign name
  // The campaigns tablist is only visible when a world is selected
  const campaignsTabList = page.getByRole("tablist", { name: "Campaigns" });
  
  // Wait for the tablist to be visible (campaigns might still be loading)
  await expect(campaignsTabList).toBeVisible({ timeout: 3000 });
  
  // Look for the campaign tab by name - wait directly for it to appear
  const campaignTab = campaignsTabList.getByRole("tab", { name: "Authenticated Test Campaign" });
  await expect(campaignTab).toBeVisible({ timeout: 5000 });
});
