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

  // Select campaign and open timeline view via nested tabs
  await page.getByRole("tab", { name: "Rise of the Dragon King" }).first().click();
  await page.getByRole("tab", { name: "Timeline" }).click();

  // Wait for timeline section to load
  await expect(page.getByText(/timeline for/i)).toBeVisible();

  // Verify "Active Story Arcs" section exists
  await expect(
    page.getByRole("heading", { name: /active story arcs/i })
  ).toBeVisible({ timeout: 10000 });
});
