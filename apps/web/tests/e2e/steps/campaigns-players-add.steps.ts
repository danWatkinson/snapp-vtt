import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { getUniqueUsername, loginAsAdmin, ensureLoginDialogClosed, ensureCampaignExists, getUniqueCampaignName } from "../helpers";
import { navigateAndWaitForReady } from "../helpers/utils";
import { createPlayer } from "../helpers/entityCreation";
import { verifyEntityInList } from "../helpers/verification";
import { navigateToCampaignView } from "../helpers/navigation";
import { STABILITY_WAIT_MEDIUM } from "../helpers/constants";
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

When('the game master adds the test user to the campaign', async ({ page }) => {
  // Check if game master (admin) is already logged in
  const logoutButton = page.getByRole("button", { name: "Log out" });
  const isLoggedIn = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (!isLoggedIn) {
    // Game master is not logged in - log them in first
    // Ensure we start with a clean page state
    await navigateAndWaitForReady(page);
    
    // Wait for page to be fully ready before attempting login
    await page.waitForTimeout(1000);
    
    // Ensure login dialog is closed before attempting to open it
    await ensureLoginDialogClosed(page);
    
    // Double-check we're not logged in after ensuring dialog is closed
    const stillNotLoggedIn = !(await logoutButton.isVisible({ timeout: 1000 }).catch(() => false));
    
    if (stillNotLoggedIn) {
      // Retry login up to 3 times to handle race conditions
      let loginSucceeded = false;
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await loginAsAdmin(page);
          loginSucceeded = true;
          break;
        } catch (loginError) {
          lastError = loginError as Error;
          
          // Check if we're actually logged in (maybe login succeeded but threw an error)
          const logoutButtonAfterAttempt = page.getByRole("button", { name: "Log out" });
          const isLoggedInAfterAttempt = await logoutButtonAfterAttempt.isVisible({ timeout: 2000 }).catch(() => false);
          
          if (isLoggedInAfterAttempt) {
            // We're logged in - the error was likely just a timeout or race condition
            loginSucceeded = true;
            break;
          }
          
          // If this isn't the last attempt, wait a bit and try again
          if (attempt < 2) {
            await page.waitForTimeout(500); // Brief delay before retry
          }
        }
      }
      
      if (!loginSucceeded && lastError) {
        throw new Error(
          `Game master (admin) login failed before adding player after 3 attempts. ` +
          `The loginAsAdmin function reported an error: ${lastError.message}.`
        );
      }
      
      // Verify login succeeded by checking for authenticated UI
      await expect(page.getByRole("button", { name: "Log out" })).toBeVisible({ timeout: 3000 });
    }
  }
  
  // Ensure campaign exists and is selected
  const uniqueCampaignName = getUniqueCampaignName("Rise of the Dragon King");
  await ensureCampaignExists(
    page,
    uniqueCampaignName,
    "A long-running campaign about ancient draconic power returning."
  );
  
  // Navigate to campaign with players view
  await navigateToCampaignView(page, "players");
  
  // Get the unique alice username
  const uniqueAliceName = await getStoredAliceUsername(page);
  
  // Create player if it doesn't exist
  await createPlayer(page, uniqueAliceName);
});

Then('the test user appears in the players list', async ({ page }) => {
  const uniqueAliceName = await getStoredAliceUsername(page);
  await verifyEntityInList(page, uniqueAliceName);
});

Then('a story arc is created for the new player', async ({ page }) => {
  // Get the unique alice username
  const uniqueAliceName = await getStoredAliceUsername(page);
  const expectedStoryArcName = `${uniqueAliceName}'s Arc`;
  
  // Navigate to story arcs view if not already there
  const addStoryArcButton = page.getByRole("button", { name: "Add story arc" });
  const isOnStoryArcsView = await addStoryArcButton.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (!isOnStoryArcsView) {
    // Check if campaign is already selected
    const campaignViews = page.getByRole("tablist", { name: "Campaign views" });
    const isCampaignSelected = await campaignViews.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (!isCampaignSelected) {
      // Campaign should already be selected from the previous step, but if not, navigate
      const uniqueCampaignName = getUniqueCampaignName("Rise of the Dragon King");
      await ensureCampaignExists(
        page,
        uniqueCampaignName,
        "A long-running campaign about ancient draconic power returning."
      );
    }
    
    // Navigate to Story Arcs tab
    await navigateToCampaignView(page, "story-arcs");
    
    // Wait for story arcs view to be ready
    await expect(addStoryArcButton).toBeVisible({ timeout: 3000 });
  }
  
  // Verify the story arc exists
  await expect(
    page.getByRole("listitem").filter({ hasText: expectedStoryArcName }).first()
  ).toBeVisible({ timeout: 3000 });
});
