import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { selectWorldAndEnterPlanningMode, ensureCampaignExists, getUniqueCampaignName, waitForModalOpen, waitForCampaignCreated, waitForModalClose, closeModalIfOpen, handleAlreadyExistsError } from "../helpers";
// Note: common.steps.ts is automatically loaded by playwright-bdd (no import needed)

const { When, Then } = createBdd();

When('the admin navigates to the "Campaigns" planning screen', async ({ page }) => {
  await selectWorldAndEnterPlanningMode(page, "Campaigns");
});

When('the campaign "Rise of the Dragon King" exists', async ({ page }) => {
  // Make campaign name unique per worker to avoid conflicts when tests run in parallel
  const uniqueCampaignName = getUniqueCampaignName("Rise of the Dragon King");
  
  await ensureCampaignExists(
    page,
    uniqueCampaignName,
    "A long-running campaign about ancient draconic power returning."
  );
  
  // Store the unique name in page context for other steps to use
  await page.evaluate((name) => {
    (window as any).__testCampaignName = name;
  }, uniqueCampaignName);
});

When(
  'the admin creates a campaign named {string} with summary {string}',
  async ({ page }, campaignName: string, summary: string) => {
    // Check if campaign already exists (from previous test run)
    const hasCampaign = await page
      .getByRole("tab", { name: campaignName })
      .first()
      .isVisible()
      .catch(() => false);

    if (hasCampaign) {
      // Campaign already exists, skip creation
      return;
    }

    // Open create campaign popup via Snapp menu
    await page.getByRole("button", { name: /^Snapp/i }).click();
    // Wait for menu to be visible and "New Campaign" button to appear
    const newCampaignButton = page.getByRole("button", { name: "New Campaign" });
    await expect(newCampaignButton).toBeVisible({ timeout: 3000 });
    await newCampaignButton.click();
    
    // Wait for modal to open using transition event
    await waitForModalOpen(page, "campaign", 5000);

    // Fill in campaign details
    await page.getByLabel("Campaign name").fill(campaignName);
    await page.getByLabel("Summary").fill(summary);

    // Set up event listener BEFORE clicking submit
    // This ensures we don't miss the event if it fires quickly
    const campaignCreatedPromise = waitForCampaignCreated(page, campaignName, 10000);

    // Submit the form
    await page.getByRole("button", { name: "Save campaign" }).click();
    
    // Wait for campaign creation event (this fires after API success + state update)
    // The helper includes modal close fallback, so this is more reliable
    try {
      await campaignCreatedPromise;
      // Campaign was created successfully - event fired
      // Modal should be closed automatically, but if not, close it
      await closeModalIfOpen(page, "campaign", /create campaign/i);
    } catch (error) {
      // Event didn't fire - check for errors
      const errorVisible = await page.getByTestId("error-message").isVisible({ timeout: 1000 }).catch(() => false);
      if (errorVisible) {
        const errorText = await page.getByTestId("error-message").textContent();
        // Handle "already exists" errors gracefully
        await handleAlreadyExistsError(page, errorText || null, "campaign", /create campaign/i);
        return; // Campaign already exists, it should appear in the list
      }
      // No error but event didn't fire - rethrow original error
      throw error;
    }
  }
);

Then(
  'the UI shows a campaign tab named {string}',
  async ({ page }, campaignName: string) => {
    // Campaign might be auto-selected after creation, so check for either:
    // 1. Campaign tab visible (not selected)
    // 2. Campaign heading visible (selected)
    const campaignTabVisible = await page
      .getByRole("tab", { name: campaignName })
      .first()
      .isVisible()
      .catch(() => false);
    
    const campaignHeadingVisible = await page
      .locator('h3.snapp-heading')
      .filter({ hasText: campaignName })
      .first()
      .isVisible()
      .catch(() => false);
    
    if (!campaignTabVisible && !campaignHeadingVisible) {
      // Neither visible - wait for campaign to appear (might be loading)
      const campaignTab = page.getByRole("tab", { name: campaignName }).first();
      const tabVisibleAfterWait = await campaignTab.isVisible({ timeout: 5000 }).catch(() => false);
      
      const headingVisibleAfterWait = await page
        .locator('h3.snapp-heading')
        .filter({ hasText: campaignName })
        .first()
        .isVisible()
        .catch(() => false);
      
      if (!tabVisibleAfterWait && !headingVisibleAfterWait) {
        // Still not visible - expect the tab (original behavior)
        await expect(
          page.getByRole("tab", { name: campaignName }).first()
        ).toBeVisible({ timeout: 3000 });
      }
    }
    // If either is visible, the campaign exists and is shown in the UI
  }
);
