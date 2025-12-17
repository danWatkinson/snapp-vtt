import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { selectWorldAndEnterPlanningMode, ensureCampaignExists } from "../helpers";
// Note: common.steps.ts is automatically loaded by playwright-bdd (no import needed)

const { When, Then } = createBdd();

When('the admin navigates to the "Campaigns" planning screen', async ({ page }) => {
  await selectWorldAndEnterPlanningMode(page, "Campaigns");
});

When('the campaign "Rise of the Dragon King" exists', async ({ page }) => {
  await ensureCampaignExists(
    page,
    "Rise of the Dragon King",
    "A long-running campaign about ancient draconic power returning."
  );
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

    // Open create campaign popup
    await page.getByRole("button", { name: "Create campaign" }).click();
    await expect(
      page.getByRole("dialog", { name: "Create campaign" })
    ).toBeVisible();

    // Fill in campaign details
    await page.getByLabel("Campaign name").fill(campaignName);
    await page.getByLabel("Summary").fill(summary);

    // Submit and see campaign appear as a tab
    await page.getByRole("button", { name: "Save campaign" }).click();
  }
);

Then(
  'the UI shows a campaign tab named {string}',
  async ({ page }, campaignName: string) => {
    await expect(
      page.getByRole("tab", { name: campaignName }).first()
    ).toBeVisible({ timeout: 10000 });
  }
);
