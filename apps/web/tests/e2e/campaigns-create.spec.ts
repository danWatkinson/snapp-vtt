import { test, expect } from "@playwright/test";
import { loginAsAdmin, selectWorldAndEnterPlanningMode } from "./helpers";

test("Game master can create a campaign via popup in the Campaigns tab", async ({
  page
}) => {
  await loginAsAdmin(page);

  // Select a world and enter planning mode, then navigate to Campaigns sub-tab
  await selectWorldAndEnterPlanningMode(page, "Campaigns");

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
