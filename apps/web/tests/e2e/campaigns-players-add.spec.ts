import { test, expect } from "@playwright/test";
import { loginAsAdmin, selectWorldAndEnterPlanningMode, ensureCampaignExists } from "./helpers";

test("Game master can add Players to a Campaign", async ({ page }) => {
  await loginAsAdmin(page);

  // Select a world and enter planning mode, then navigate to Campaigns sub-tab
  await selectWorldAndEnterPlanningMode(page, "Campaigns");

  // Ensure "Rise of the Dragon King" campaign exists
  await ensureCampaignExists(
    page,
    "Rise of the Dragon King",
    "A long-running campaign about ancient draconic power returning."
  );

  // Select campaign and open players view via nested tabs
  await page.getByRole("tab", { name: "Rise of the Dragon King" }).first().click();
  await page.getByRole("tab", { name: "Players" }).click();

  // Wait for the players section to load
  await expect(
    page.getByRole("button", { name: "Add player" })
  ).toBeVisible();

  // Check if "alice" is already a player (from previous test run)
  const hasAlice = await page
    .getByRole("listitem")
    .filter({ hasText: "alice" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasAlice) {
    // Add a player via popup
    await page.getByRole("button", { name: "Add player" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add player" })
    ).toBeVisible();

    await page.getByLabel("Player username").fill("alice");
    await page.getByRole("button", { name: "Save player" }).click();
  }

  // Alice appears in the players list
  await expect(
    page.getByRole("listitem").filter({ hasText: "alice" }).first()
  ).toBeVisible();
});
