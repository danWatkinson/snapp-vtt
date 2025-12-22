import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { selectWorldAndEnterMode, getStoredCampaignName, ensureCampaignExists } from "../helpers";
import { navigateToCampaignView, isOnCampaignView } from "../helpers/navigation";
import { createStoryArc } from "../helpers/entityCreation";
import { verifyEntityInList } from "../helpers/verification";
// Note: "the campaign Rise of the Dragon King exists" is defined in campaigns-create.steps.ts

const { When, Then } = createBdd();

When('the admin navigates to the "Story Arcs" screen', async ({ page }) => {
  await selectWorldAndEnterMode(page, "Story Arcs");
});

When("the admin navigates to the story arcs view", async ({ page }) => {
  // Check if already on story arcs view
  if (await isOnCampaignView(page, "story-arcs")) {
    return; // Already on story arcs view
  }
  
  // Ensure campaign is selected
  const campaignName = await getStoredCampaignName(page, "Rise of the Dragon King");
  
  // Ensure campaign exists and is selected
  await ensureCampaignExists(page, campaignName, "A long-running campaign about ancient draconic power returning.");
  
  // Navigate to story arcs view
  await navigateToCampaignView(page, "story-arcs");
});

When('the admin ensures story arc "The Ancient Prophecy" exists', async ({ page }) => {
  // Navigate to story arcs view first (if not already there)
  if (!(await isOnCampaignView(page, "story-arcs"))) {
    // Ensure campaign is selected
    let campaignName: string | null = null;
    for (let i = 0; i < 5; i++) {
      try {
        campaignName = await page.evaluate(() => {
          return (window as any).__testCampaignName;
        });
        if (campaignName) break;
      } catch {
        await safeWait(page, 200);
      }
    }
    
    if (!campaignName) {
      campaignName = getUniqueCampaignName("Rise of the Dragon King");
    }
    
    // Ensure campaign exists and is selected
    await ensureCampaignExists(page, campaignName, "A long-running campaign about ancient draconic power returning.");
    
    // Navigate to story arcs view
    await navigateToCampaignView(page, "story-arcs");
  }
  
  // Create story arc if it doesn't exist
  await createStoryArc(page, "The Ancient Prophecy", "An ancient prophecy foretells the return of the dragon king.");
});

Then('story arc "The Ancient Prophecy" appears in the story arcs list', async ({ page }) => {
  await verifyEntityInList(page, "The Ancient Prophecy");
});
