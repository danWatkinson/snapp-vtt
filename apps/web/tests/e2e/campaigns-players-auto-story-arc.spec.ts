import { test, expect } from "@playwright/test";
import { loginAsAdmin, selectWorldAndEnterPlanningMode, ensureCampaignExists } from "./helpers";

test("Game master automatically gets a Story Arc for each Player added to a Campaign", async ({
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

  // ensureCampaignExists already selects the campaign, so just navigate to players view
  await page
    .getByRole("tablist", { name: "Campaign views" })
    .getByRole("tab", { name: "Players" })
    .click();

  // Wait for the players section to load
  await expect(page.getByRole("button", { name: "Add player" })).toBeVisible();

  // Check if "bob" is already a player (from previous test run)
  const hasBob = await page
    .getByRole("listitem")
    .filter({ hasText: "bob" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasBob) {
    // Add a player via popup
    await page.getByRole("button", { name: "Add player" }).click();
    await expect(page.getByRole("dialog", { name: "Add player" })).toBeVisible();

    await page.getByLabel("Player username").fill("bob");
    await page.getByRole("button", { name: "Save player" }).click();

    // Wait for player to appear
    await expect(
      page.getByRole("listitem").filter({ hasText: "bob" }).first()
    ).toBeVisible({ timeout: 10000 });
  }

  // Switch to story arcs view via nested campaign view tabs
  await page
    .getByRole("tablist", { name: "Campaign views" })
    .getByRole("tab", { name: "Story arcs" })
    .click();

  // Wait for story arcs section to load
  await expect(
    page.getByRole("button", { name: "Add story arc" })
  ).toBeVisible();

  // Wait a bit for story arcs to reload after player was added
  await page.waitForTimeout(500);

  // Verify that a story arc for "bob" was automatically created
  // The story arc should be named "bob's Arc"
  await expect(
    page.getByRole("listitem").filter({ hasText: "bob's Arc" }).first()
  ).toBeVisible({ timeout: 10000 });
});
