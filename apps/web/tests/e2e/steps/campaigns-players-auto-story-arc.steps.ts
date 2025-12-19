import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { selectWorldAndEnterPlanningMode, getUniqueCampaignName, safeWait } from "../helpers";
import { STABILITY_WAIT_SHORT, STABILITY_WAIT_MEDIUM } from "../helpers/constants";
// Note: "the admin navigates to the Campaigns planning screen" and "the campaign Rise of the Dragon King exists" 
// are defined in campaigns-create.steps.ts
// Note: "the admin navigates to the story arcs view" is defined in campaigns-story-arcs-add.steps.ts

const { When, Then } = createBdd();

When('the admin ensures player "bob" is added to the campaign', async ({ page }) => {
  const hasBob = await page
    .getByRole("listitem")
    .filter({ hasText: "bob" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasBob) {
    await page.getByRole("button", { name: "Add player" }).click();
    await expect(page.getByRole("dialog", { name: "Add player" })).toBeVisible();

    await page.getByLabel("Player username").fill("bob");
    await page.getByRole("button", { name: "Save player" }).click();

    await expect(
      page.getByRole("listitem").filter({ hasText: "bob" }).first()
    ).toBeVisible({ timeout: 3000 });
  }
});

Then('a story arc named "bob\'s Arc" is automatically created', async ({ page }) => {
  // Navigate to story arcs view if not already there
  const addStoryArcButton = page.getByRole("button", { name: "Add story arc" });
  const isOnStoryArcsView = await addStoryArcButton.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (!isOnStoryArcsView) {
    // Check if campaign is already selected
    const campaignViews = page.getByRole("tablist", { name: "Campaign views" });
    const isCampaignSelected = await campaignViews.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (!isCampaignSelected) {
      // Navigate to Campaigns planning screen
      await selectWorldAndEnterPlanningMode(page, "Campaigns");
      
      // Get test campaign name
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
      
      // Wait for campaigns to load
      await safeWait(page, STABILITY_WAIT_MEDIUM);
      
      // Select the campaign
      let campaignsTablist = page.getByRole("tablist", { name: "Campaigns" });
      let isVisible = await campaignsTablist.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (!isVisible) {
        campaignsTablist = page.getByRole("tablist", { name: "Campaign context" });
        isVisible = await campaignsTablist.isVisible({ timeout: 3000 }).catch(() => false);
      }
      
      if (isVisible) {
        let campaignTab = campaignsTablist.getByRole("tab", { name: campaignName });
        let exists = await campaignTab.isVisible().catch(() => false);
        
        if (!exists) {
          // Try partial match
          const allTabs = await campaignsTablist.getByRole("tab").all();
          for (const tab of allTabs) {
            const text = await tab.textContent();
            if (text && text.includes(campaignName.split(" ")[0])) {
              campaignTab = tab;
              exists = true;
              break;
            }
          }
        }
        
        if (exists) {
          await campaignTab.click();
          await expect(campaignViews).toBeVisible();
        }
      }
    }
    
    // Navigate to Story Arcs tab
    await page
      .getByRole("tablist", { name: "Campaign views" })
      .getByRole("tab", { name: "Story Arcs" })
      .click();
    
    // Wait for story arcs view to be ready
    await expect(addStoryArcButton).toBeVisible({ timeout: 3000 });
  }
  
  await expect(
    page.getByRole("listitem").filter({ hasText: "bob's Arc" }).first()
  ).toBeVisible({ timeout: 3000 });
});
