import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { getUniqueUsername } from "../helpers";
// Note: "the admin navigates to the Campaigns planning screen" and "the campaign Rise of the Dragon King exists" 
// are defined in campaigns-create.steps.ts

const { When, Then } = createBdd();

// Helper to get the unique alice username from page context
async function getStoredAliceUsername(page: any): Promise<string> {
  try {
    const storedName = await page.evaluate(() => {
      return (window as any).__testAliceUsername;
    });
    if (storedName) {
      return storedName;
    }
  } catch {
    // Can't retrieve - fall back to unique name generation
  }
  // Fall back to generating unique name if not stored
  return getUniqueUsername("alice");
}

When("the admin navigates to the players view", async ({ page }) => {
  await page.getByRole("tab", { name: "Players" }).click();
});

When('the admin ensures player "alice" is added to the campaign', async ({ page }) => {
  const uniqueAliceName = await getStoredAliceUsername(page);
  
  const hasAlice = await page
    .getByRole("listitem")
    .filter({ hasText: uniqueAliceName })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasAlice) {
    await page.getByRole("button", { name: "Add player" }).click();
    await expect(page.getByRole("dialog", { name: "Add player" })).toBeVisible();

    await page.getByLabel("Player username").fill(uniqueAliceName);
    await page.getByRole("button", { name: "Save player" }).click();
  }
});

Then('player "alice" appears in the players list', async ({ page }) => {
  const uniqueAliceName = await getStoredAliceUsername(page);
  await expect(
    page.getByRole("listitem").filter({ hasText: uniqueAliceName }).first()
  ).toBeVisible();
});
