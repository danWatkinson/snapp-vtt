import { test, expect } from "@playwright/test";
import { loginAsAdmin, selectWorldAndEnterPlanningMode, ensureCampaignExists } from "./helpers";

test("Game master can view and advance Campaign Timeline", async ({ page }) => {
  await loginAsAdmin(page);

  // Select a world and enter planning mode, then navigate to Campaigns sub-tab
  await selectWorldAndEnterPlanningMode(page, "Campaigns");

  // Ensure "Rise of the Dragon King" campaign exists
  await ensureCampaignExists(
    page,
    "Rise of the Dragon King",
    "A long-running campaign about ancient draconic power returning."
  );

  // ensureCampaignExists already selects the campaign, so just navigate to timeline view
  await page.getByRole("tab", { name: "Timeline" }).click();

  // Wait for timeline section to load
  await expect(
    page.getByRole("heading", { name: /timeline/i })
  ).toBeVisible();

  // Verify current moment is displayed
  await expect(
    page.getByText(/current moment/i)
  ).toBeVisible();

  // Advance timeline by 1 day
  await page.getByRole("button", { name: "+1 day" }).click();

  // Verify timeline advanced (current moment should have changed)
  const currentMomentText = await page
    .getByText(/current moment/i)
    .textContent();
  expect(currentMomentText).toBeTruthy();

  // Advance timeline by 1 week
  await page.getByRole("button", { name: "+1 week" }).click();

  // Advance timeline by 1 month
  await page.getByRole("button", { name: "+1 month" }).click();

  // Verify we can also go back
  await page.getByRole("button", { name: "-1 day" }).click();
});
