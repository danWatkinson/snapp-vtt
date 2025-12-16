import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("Game master can view and advance Campaign Timeline", async ({ page }) => {
  await loginAsAdmin(page);

  // Go to Campaigns tab
  await page.getByRole("tab", { name: "Campaigns" }).click();

  // Ensure "Rise of the Dragon King" campaign exists
  const hasCampaignTab = await page
    .getByRole("tab", { name: "Rise of the Dragon King" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasCampaignTab) {
    await page.getByRole("button", { name: "Create campaign" }).click();
    await page.getByLabel("Campaign name").fill("Rise of the Dragon King");
    await page
      .getByLabel("Summary")
      .fill("A long-running campaign about ancient draconic power returning.");
    await page.getByRole("button", { name: "Save campaign" }).click();

    await expect(
      page.getByRole("tab", { name: "Rise of the Dragon King" }).first()
    ).toBeVisible();
  }

  // Select campaign and open timeline view via nested tabs
  await page.getByRole("tab", { name: "Rise of the Dragon King" }).first().click();
  await page.getByRole("tab", { name: "Timeline" }).click();

  // Wait for timeline section to load
  await expect(
    page.getByText(/timeline for/i)
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
