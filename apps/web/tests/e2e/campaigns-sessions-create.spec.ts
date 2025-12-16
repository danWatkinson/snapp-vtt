import { test, expect } from "@playwright/test";
import { loginAsAdmin, selectWorldAndEnterPlanningMode, ensureCampaignExists } from "./helpers";

test("Game master can create a Session within a Campaign", async ({ page }) => {
  await loginAsAdmin(page);

  // Select a world and enter planning mode, then navigate to Campaigns sub-tab
  await selectWorldAndEnterPlanningMode(page, "Campaigns");

  // Ensure "Rise of the Dragon King" campaign exists
  await ensureCampaignExists(
    page,
    "Rise of the Dragon King",
    "A long-running campaign about ancient draconic power returning."
  );

  // ensureCampaignExists already selects the campaign, so just navigate to sessions view
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
