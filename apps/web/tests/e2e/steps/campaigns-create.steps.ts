import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { selectWorldAndEnterPlanningMode, ensureCampaignExists, getUniqueCampaignName } from "../helpers";
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
    // Wait for dialog to appear (menu closes when button is clicked, tab navigates, modal opens)
    await expect(
      page.getByRole("dialog", { name: "Create campaign" })
    ).toBeVisible({ timeout: 3000 });

    // Fill in campaign details
    await page.getByLabel("Campaign name").fill(campaignName);
    await page.getByLabel("Summary").fill(summary);

    // Submit the form
    await page.getByRole("button", { name: "Save campaign" }).click();
    
    // Wait for either the modal to close (success) or an error message to appear
    const createCampaignDialog = page.getByRole("dialog", { name: /create campaign/i });
    await Promise.race([
      createCampaignDialog.waitFor({ state: "hidden", timeout: 3000 }).catch(() => null),
      page.getByTestId("error-message").waitFor({ timeout: 3000, state: "visible" }).catch(() => null),
      // Also wait for campaign tab to appear (indicates success)
      page.getByRole("tab", { name: campaignName }).waitFor({ timeout: 3000 }).catch(() => null)
    ]);
    
    // Check if there's an error message
    const errorVisible = await page.getByTestId("error-message").isVisible({ timeout: 1000 }).catch(() => false);
    if (errorVisible) {
      const errorText = await page.getByTestId("error-message").textContent();
      // If error says campaign already exists, that's okay - close the modal and continue
      if (errorText?.includes("already exists") || errorText?.includes("duplicate")) {
        // Close the modal by clicking cancel
        const cancelButton = createCampaignDialog.getByRole("button", { name: "Cancel" });
        if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await cancelButton.click();
        }
        // Campaign already exists, it should appear in the list
        return;
      } else {
        // Some other error - close modal and throw
        const cancelButton = createCampaignDialog.getByRole("button", { name: "Cancel" });
        if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await cancelButton.click();
        }
        throw new Error(`Campaign creation failed: ${errorText}`);
      }
    }
    
    // Check if modal is closed (success case)
    const dialogStillVisible = await createCampaignDialog.isVisible({ timeout: 1000 }).catch(() => true);
    if (dialogStillVisible) {
      // Modal still open - might be a timing issue, wait a bit more
      await page.waitForTimeout(1000);
      const stillVisible = await createCampaignDialog.isVisible({ timeout: 1000 }).catch(() => true);
      if (stillVisible) {
        // Still visible - try to close it manually and check for errors
        const cancelButton = createCampaignDialog.getByRole("button", { name: "Cancel" });
        if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await cancelButton.click();
        }
        throw new Error("Campaign creation modal did not close after submission");
      }
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
      // Neither visible - wait a bit and check again
      await page.waitForTimeout(500);
      const tabVisibleAfterWait = await page
        .getByRole("tab", { name: campaignName })
        .first()
        .isVisible()
        .catch(() => false);
      
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
