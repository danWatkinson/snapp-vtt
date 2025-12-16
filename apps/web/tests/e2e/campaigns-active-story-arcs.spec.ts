import { test, expect } from "@playwright/test";
import { loginAsAdmin, selectWorldAndEnterPlanningMode, ensureCampaignExists } from "./helpers";

test("Game master can see active Story Arcs in Campaign Timeline", async ({
  page
}) => {
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
  await expect(page.getByRole("heading", { name: /timeline/i })).toBeVisible();

  // Verify "Active Story Arcs" section exists
  await expect(
    page.getByRole("heading", { name: /active story arcs/i })
  ).toBeVisible({ timeout: 10000 });
});
