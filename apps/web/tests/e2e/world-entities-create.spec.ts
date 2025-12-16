import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("World builder can add Creatures and Factions to a World via popup", async ({
  page
}) => {
  await loginAsAdmin(page);

  // Switch to World tab
  await page.getByRole("tab", { name: "World" }).click();

  // Ensure Eldoria exists (create if needed)
  const hasEldoriaTab = await page
    .getByRole("tab", { name: "Eldoria" })
    .isVisible()
    .catch(() => false);

  if (!hasEldoriaTab) {
    await page.getByRole("button", { name: "Create world" }).click();
    await page.getByLabel("World name").fill("Eldoria");
    await page.getByLabel("Description").fill("A high-fantasy realm.");
    await page.getByRole("button", { name: "Save world" }).click();

    // Wait for world tab to appear before proceeding
    await expect(
      page.getByRole("tab", { name: "Eldoria" })
    ).toBeVisible();
  }

  // Select Eldoria to open its entity view
  await page.getByRole("tab", { name: "Eldoria" }).click();

  // Switch to Creatures tab
  await page.getByRole("tab", { name: "Creatures" }).click();

  // Wait for the entities section to load (check for Add creature button)
  await expect(
    page.getByRole("button", { name: "Add creature" })
  ).toBeVisible();

  // Check if Dragon already exists (from previous test run)
  const hasDragon = await page
    .getByRole("listitem")
    .filter({ hasText: "Dragon" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasDragon) {
    // Add a creature via popup
    await page.getByRole("button", { name: "Add creature" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add creature" })
    ).toBeVisible();

    await page.getByLabel("Creature name").fill("Dragon");
    await page.getByLabel("Summary").fill("A fearsome fire-breathing beast.");
    await page.getByRole("button", { name: "Save creature" }).click();
  }

  // Dragon appears in the list
  await expect(
    page.getByRole("listitem").filter({ hasText: "Dragon" }).first()
  ).toBeVisible();

  // Switch to Factions tab
  await page.getByRole("tab", { name: "Factions" }).click();

  // Wait for the entities section to load (check for Add faction button)
  await expect(
    page.getByRole("button", { name: "Add faction" })
  ).toBeVisible();

  // Check if Order of the Flame already exists (from previous test run)
  const hasFaction = await page
    .getByRole("listitem")
    .filter({ hasText: "Order of the Flame" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasFaction) {
    // Add a faction via popup
    await page.getByRole("button", { name: "Add faction" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add faction" })
    ).toBeVisible();

    await page.getByLabel("Faction name").fill("Order of the Flame");
    await page.getByLabel("Summary").fill("A secretive order of mages.");
    await page.getByRole("button", { name: "Save faction" }).click();
  }

  // Order of the Flame appears in the list
  await expect(
    page.getByRole("listitem").filter({ hasText: "Order of the Flame" }).first()
  ).toBeVisible();
});

