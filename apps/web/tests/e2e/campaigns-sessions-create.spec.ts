import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("Game master can create a Session within a Campaign", async ({ page }) => {
  await loginAsAdmin(page);

  // Go to Campaigns tab
  await page.getByRole("tab", { name: "Campaigns" }).click();

  // Ensure "Rise of the Dragon King" campaign exists (create if needed)
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

  // Select campaign and open sessions view via nested campaign view tabs
  await page.getByRole("tab", { name: "Rise of the Dragon King" }).first().click();
  await page
    .getByRole("tablist", { name: "Campaign views" })
    .getByRole("tab", { name: "Sessions" })
    .click();

  // Wait for the sessions section to load (check for Add session button)
  await expect(
    page.getByRole("button", { name: "Add session" })
  ).toBeVisible();

  // Check if "Session 1" already exists (from previous test run)
  const hasSession = await page
    .getByRole("listitem")
    .filter({ hasText: "Session 1" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasSession) {
    // Add a session via popup
    await page.getByRole("button", { name: "Add session" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add session" })
    ).toBeVisible();

    await page.getByLabel("Session name").fill("Session 1");
    await page.getByRole("button", { name: "Save session" }).click();
  }

  // Session appears in the list
  await expect(
    page.getByRole("listitem").filter({ hasText: "Session 1" }).first()
  ).toBeVisible();
});
