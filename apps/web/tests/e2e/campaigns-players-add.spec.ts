import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("Game master can add Players to a Campaign", async ({ page }) => {
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
