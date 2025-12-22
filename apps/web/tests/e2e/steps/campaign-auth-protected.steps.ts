import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { ensureCampaignExists, getUniqueUsername, loginAs } from "../helpers";
import { navigateAndWaitForReady } from "../helpers/utils";

const { Then, When } = createBdd();

// Helper to get the unique world builder username from page context
async function getStoredWorldBuilderUsername(page: any): Promise<string> {
  try {
    const storedName = await page.evaluate(() => {
      return (window as any).__testWorldBuilderUsername;
    });
    if (storedName) {
      return storedName;
    }
  } catch {
    // Can't retrieve - fall back to unique name generation
  }
  // Fall back to generating unique name if not stored
  return getUniqueUsername("worldbuilder");
}

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

When('the world builder creates a campaign', async ({ page }) => {
  // Check if user is logged in, sign in if needed
  const logoutButton = page.getByRole("button", { name: "Log out" });
  const isLoggedIn = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (!isLoggedIn) {
    // Get the unique world builder username from page context
    const uniqueUsername = await getStoredWorldBuilderUsername(page);
    const password = "worldbuilder123";
    
    // Navigate to home page if not already there
    await navigateAndWaitForReady(page);
    
    // Sign in
    await loginAs(page, uniqueUsername, password);
    
    // Verify login succeeded
    await expect(logoutButton).toBeVisible({ timeout: 3000 });
  }
  
  const campaignName = "Authenticated Test Campaign";
  
  // Use the helper function to ensure campaign exists
  await ensureCampaignExists(
    page,
    campaignName,
    "A test campaign created by authenticated user"
  );
});

Then('the campaign appears in the campaigns list', async ({ page }) => {
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
