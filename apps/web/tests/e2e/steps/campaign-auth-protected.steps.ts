import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Then, When } = createBdd();

Then("the campaigns tab is not visible", async ({ page }) => {
  await expect(page.getByRole("tab", { name: "Campaigns" })).not.toBeVisible();
});

When('the admin creates a campaign named "Authenticated Test Campaign"', async ({ page }) => {
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
  }
});

Then('the campaign "Authenticated Test Campaign" appears in the campaigns list', async ({ page }) => {
  await expect(page.getByText("Authenticated Test Campaign").first()).toBeVisible({ timeout: 5000 });
});
