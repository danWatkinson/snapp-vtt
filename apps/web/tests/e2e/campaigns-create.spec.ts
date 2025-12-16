import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("Game master can create a campaign via popup in the Campaigns tab", async ({
  page
}) => {
  await loginAsAdmin(page);

  // Go to Campaigns tab
  await page.getByRole("tab", { name: "Campaigns" }).click();

  // Check if campaign already exists (from previous test run)
  const hasCampaign = await page
    .getByRole("tab", { name: "Rise of the Dragon King" })
    .first()
    .isVisible()
    .catch(() => false);

  if (hasCampaign) {
    await expect(
      page.getByRole("tab", { name: "Rise of the Dragon King" }).first()
    ).toBeVisible();
    return;
  }

  // Open create campaign popup
  await page.getByRole("button", { name: "Create campaign" }).click();
  await expect(
    page.getByRole("dialog", { name: "Create campaign" })
  ).toBeVisible();

  // Fill in campaign details
  await page.getByLabel("Campaign name").fill("Rise of the Dragon King");
  await page
    .getByLabel("Summary")
    .fill("A long-running campaign about ancient draconic power returning.");

  // Submit and see campaign appear as a tab
  await page.getByRole("button", { name: "Save campaign" }).click();

  await expect(
    page.getByRole("tab", { name: "Rise of the Dragon King" }).first()
  ).toBeVisible();
});
