import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("Game master automatically gets a Story Arc for each Player added to a Campaign", async ({
  page
}) => {
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

  // Switch to story arcs view via nested tab
  await page.getByRole("tab", { name: "Story arcs" }).click();

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

