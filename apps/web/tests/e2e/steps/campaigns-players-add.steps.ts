import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { getUniqueUsername } from "../helpers";
import { createPlayer } from "../helpers/entityCreation";
import { verifyEntityInList } from "../helpers/verification";
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

When('the admin ensures the test user is added to the campaign', async ({ page }) => {
  const uniqueAliceName = await getStoredAliceUsername(page);
  
  // Create player if it doesn't exist
  await createPlayer(page, uniqueAliceName);
});

Then('the test user appears in the players list', async ({ page }) => {
  const uniqueAliceName = await getStoredAliceUsername(page);
  await verifyEntityInList(page, uniqueAliceName);
});
