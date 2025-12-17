import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { When, Then } = createBdd();
// Note: "the admin navigates to the World Entities planning screen" is defined in world-create.steps.ts

When('world "Eldoria" exists', async ({ page }) => {
  const worldContextTablist = page.getByRole("tablist", { name: "World context" });
  const hasEldoriaContextTab = await worldContextTablist
    .getByRole("tab", { name: "Eldoria" })
    .isVisible()
    .catch(() => false);

  if (!hasEldoriaContextTab) {
    await page.getByRole("button", { name: "Create world" }).click();
    await page.getByLabel("World name").fill("Eldoria");
    await page.getByLabel("Description").fill("A high-fantasy realm.");
    await page.getByRole("button", { name: "Save world" }).click();

    await expect(
      worldContextTablist.getByRole("tab", { name: "Eldoria" })
    ).toBeVisible();
  }
});

When('the admin selects world "Eldoria"', async ({ page }) => {
  const worldContextTablist = page.getByRole("tablist", { name: "World context" });
  await worldContextTablist.getByRole("tab", { name: "Eldoria" }).click();
});

When("the admin navigates to the creatures tab", async ({ page }) => {
  await page.getByRole("tab", { name: "Creatures" }).click();
  await expect(page.getByRole("button", { name: "Add creature" })).toBeVisible();
});

When('the admin ensures creature "Dragon" exists', async ({ page }) => {
  const hasDragon = await page
    .getByRole("listitem")
    .filter({ hasText: "Dragon" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasDragon) {
    await page.getByRole("button", { name: "Add creature" }).click();
    await expect(page.getByRole("dialog", { name: "Add creature" })).toBeVisible();

    await page.getByLabel("Creature name").fill("Dragon");
    await page.getByLabel("Summary").fill("A fearsome fire-breathing beast.");
    await page.getByRole("button", { name: "Save creature" }).click();
  }
});

Then('creature "Dragon" appears in the creatures list', async ({ page }) => {
  await expect(
    page.getByRole("listitem").filter({ hasText: "Dragon" }).first()
  ).toBeVisible();
});

When("the admin navigates to the factions tab", async ({ page }) => {
  await page.getByRole("tab", { name: "Factions" }).click();
  await expect(page.getByRole("button", { name: "Add faction" })).toBeVisible();
});

When('the admin ensures faction "Order of the Flame" exists', async ({ page }) => {
  const hasFaction = await page
    .getByRole("listitem")
    .filter({ hasText: "Order of the Flame" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasFaction) {
    await page.getByRole("button", { name: "Add faction" }).click();
    await expect(page.getByRole("dialog", { name: "Add faction" })).toBeVisible();

    await page.getByLabel("Faction name").fill("Order of the Flame");
    await page.getByLabel("Summary").fill("A secretive order of mages.");
    await page.getByRole("button", { name: "Save faction" }).click();
  }
});

Then('faction "Order of the Flame" appears in the factions list', async ({ page }) => {
  await expect(
    page.getByRole("listitem").filter({ hasText: "Order of the Flame" }).first()
  ).toBeVisible();
});
