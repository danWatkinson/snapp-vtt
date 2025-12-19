import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { selectWorldAndEnterPlanningMode, getUniqueCampaignName } from "../helpers";
import { safeWait } from "../helpers/utils";
import { STABILITY_WAIT_SHORT, STABILITY_WAIT_MEDIUM } from "../helpers/constants";
// Note: "the campaign Rise of the Dragon King exists" is defined in campaigns-create.steps.ts

const { When, Then } = createBdd();

When('the admin navigates to the "Story Arcs" planning screen', async ({ page }) => {
  await selectWorldAndEnterPlanningMode(page, "Story Arcs");
});

When("the admin navigates to the story arcs view", async ({ page }) => {
  // Check if we're already on the story arcs view
  const addStoryArcButton = page.getByRole("button", { name: "Add story arc" });
  const isOnStoryArcsView = await addStoryArcButton.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (!isOnStoryArcsView) {
    // Check if a campaign is selected (Campaign views tablist should be visible)
    const campaignViews = page.getByRole("tablist", { name: "Campaign views" });
    const isCampaignSelected = await campaignViews.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (!isCampaignSelected) {
      // Need to navigate to Campaigns planning screen and select a campaign
      // Try to get test campaign name with retry logic (page context might not be ready)
      let campaignName: string | null = null;
      for (let i = 0; i < 5; i++) {
        try {
          campaignName = await page.evaluate(() => {
            return (window as any).__testCampaignName;
          });
          if (campaignName) break;
        } catch {
          // Page might not be ready yet, wait and retry
          await safeWait(page, 200);
        }
      }
      
      // If still not found, generate it deterministically (for "Rise of the Dragon King")
      // The name generation is deterministic based on worker index, so it will match
      if (!campaignName) {
        campaignName = getUniqueCampaignName("Rise of the Dragon King");
      }
      
      // Navigate to Campaigns planning screen
      await selectWorldAndEnterPlanningMode(page, "Campaigns");
      
      // Verify we're on the Campaigns sub-tab
      const planningTablist = page.getByRole("tablist", { name: "World planning views" });
      const campaignsTab = planningTablist.getByRole("tab", { name: "Campaigns" });
      await expect(campaignsTab).toBeVisible({ timeout: 5000 });
      
      // Wait for campaigns to load (especially if created via API in Background)
      await safeWait(page, STABILITY_WAIT_MEDIUM);
      
      // Check if campaign views are already visible (campaign might be auto-selected)
      const campaignViewsCheck = page.getByRole("tablist", { name: "Campaign views" });
      const campaignAlreadySelected = await campaignViewsCheck.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (!campaignAlreadySelected) {
        // Campaign not selected - need to select it
        // Find the campaigns tablist - try both "Campaigns" and "Campaign context" names
        // Wait a bit more for the UI to fully render
        await safeWait(page, STABILITY_WAIT_SHORT);
        
        // Try "Campaigns" first (as used in campaign-auth-protected.steps.ts)
        let campaignsTablist = page.getByRole("tablist", { name: "Campaigns" });
        let isVisible = await campaignsTablist.isVisible({ timeout: 3000 }).catch(() => false);
        
        // If not found, try "Campaign context"
        if (!isVisible) {
          campaignsTablist = page.getByRole("tablist", { name: "Campaign context" });
          isVisible = await campaignsTablist.isVisible({ timeout: 3000 }).catch(() => false);
        }
        
        if (!isVisible) {
          // Wait a bit more and try again
          await safeWait(page, STABILITY_WAIT_MEDIUM);
          campaignsTablist = page.getByRole("tablist", { name: "Campaigns" });
          isVisible = await campaignsTablist.isVisible({ timeout: 5000 }).catch(() => false);
          
          if (!isVisible) {
            campaignsTablist = page.getByRole("tablist", { name: "Campaign context" });
            isVisible = await campaignsTablist.isVisible({ timeout: 5000 }).catch(() => false);
          }
        }
        
        if (!isVisible) {
          // Still not visible - maybe campaigns haven't loaded yet, or we're in a different state
          // Check if we're actually on the Campaigns tab
          const isOnCampaignsTab = await campaignsTab.getAttribute("aria-selected").then(attr => attr === "true").catch(() => false);
          if (!isOnCampaignsTab) {
            // Not on Campaigns tab - click it
            await campaignsTab.click();
            await safeWait(page, STABILITY_WAIT_MEDIUM);
          }
          
          // Try one more time with both names
          campaignsTablist = page.getByRole("tablist", { name: "Campaigns" });
          isVisible = await campaignsTablist.isVisible({ timeout: 5000 }).catch(() => false);
          
          if (!isVisible) {
            campaignsTablist = page.getByRole("tablist", { name: "Campaign context" });
            isVisible = await campaignsTablist.isVisible({ timeout: 5000 }).catch(() => false);
          }
        }
        
        if (!isVisible) {
          throw new Error(
            `Cannot navigate to story arcs view: Campaigns tablist not found after navigating to Campaigns planning screen. ` +
            `Tried both "Campaigns" and "Campaign context" tablist names. ` +
            `This may indicate campaigns haven't loaded or the UI is in an unexpected state.`
          );
        }
        
        // Wait a bit more for campaigns to appear
        await safeWait(page, STABILITY_WAIT_SHORT);
        
        // Select the test campaign - try unique name first, then fall back to base name
        let campaignTab = campaignsTablist.getByRole("tab", { name: campaignName }).first();
        let exists = await campaignTab.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (!exists) {
          // Try partial match for unique name
          campaignTab = campaignsTablist.getByRole("tab").filter({ hasText: campaignName }).first();
          exists = await campaignTab.isVisible({ timeout: 5000 }).catch(() => false);
        }
        
        if (!exists) {
          // Try base name as fallback
          campaignTab = campaignsTablist.getByRole("tab", { name: "Rise of the Dragon King" }).first();
          exists = await campaignTab.isVisible({ timeout: 5000 }).catch(() => false);
        }
        
        if (exists) {
          await campaignTab.click();
          await expect(campaignViews).toBeVisible({ timeout: 5000 });
        } else {
          // If campaign tab not found, try to find any campaign tab as last resort
          const anyCampaignTab = campaignsTablist.getByRole("tab").first();
          const anyExists = await anyCampaignTab.isVisible({ timeout: 3000 }).catch(() => false);
          if (anyExists) {
            await anyCampaignTab.click();
            await expect(campaignViews).toBeVisible({ timeout: 5000 });
          } else {
            // Get all available campaign names for debugging
            const allTabs = campaignsTablist.getByRole("tab");
            const tabCount = await allTabs.count();
            const availableCampaigns: string[] = [];
            for (let i = 0; i < Math.min(tabCount, 10); i++) {
              const tab = allTabs.nth(i);
              const text = await tab.textContent().catch(() => "");
              if (text) availableCampaigns.push(text.trim());
            }
            throw new Error(
              `Cannot navigate to story arcs view: no campaign found. ` +
              `Expected campaign "${campaignName}" or "Rise of the Dragon King" not found in campaign selector. ` +
              `Available campaigns: ${availableCampaigns.join(", ") || "none"}. ` +
              `Please ensure 'the test campaign exists' step has run.`
            );
          }
        }
      }
      // If campaign is already selected, we can proceed directly to story arcs tab
    }
    
    // Now navigate to story arcs tab (campaign should be selected at this point)
    await campaignViews.getByRole("tab", { name: "Story arcs" }).click();
    await expect(addStoryArcButton).toBeVisible();
  }
});

When('the admin ensures story arc "The Ancient Prophecy" exists', async ({ page }) => {
  // Navigate to story arcs view first (if not already there)
  const addStoryArcButton = page.getByRole("button", { name: "Add story arc" });
  const isOnStoryArcsView = await addStoryArcButton.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (!isOnStoryArcsView) {
    // Use already-imported functions from top of file
    const campaignViews = page.getByRole("tablist", { name: "Campaign views" });
    const isCampaignSelected = await campaignViews.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (!isCampaignSelected) {
      // Need to navigate and select campaign
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
      
      // Check if campaign is already selected
      const campaignViewsCheck = page.getByRole("tablist", { name: "Campaign views" });
      const campaignAlreadySelected = await campaignViewsCheck.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (!campaignAlreadySelected) {
        // Find and select campaign
        let campaignsTablist = page.getByRole("tablist", { name: "Campaigns" });
        let isVisible = await campaignsTablist.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (!isVisible) {
          campaignsTablist = page.getByRole("tablist", { name: "Campaign context" });
          isVisible = await campaignsTablist.isVisible({ timeout: 3000 }).catch(() => false);
        }
        
        if (isVisible) {
          let campaignTab = campaignsTablist.getByRole("tab", { name: campaignName }).first();
          let exists = await campaignTab.isVisible({ timeout: 5000 }).catch(() => false);
          
          if (!exists) {
            campaignTab = campaignsTablist.getByRole("tab").filter({ hasText: campaignName }).first();
            exists = await campaignTab.isVisible({ timeout: 5000 }).catch(() => false);
          }
          
          if (!exists) {
            campaignTab = campaignsTablist.getByRole("tab", { name: "Rise of the Dragon King" }).first();
            exists = await campaignTab.isVisible({ timeout: 5000 }).catch(() => false);
          }
          
          if (exists) {
            await campaignTab.click();
            await expect(campaignViews).toBeVisible({ timeout: 5000 });
          }
        }
      }
    }
    
    // Navigate to story arcs tab
    await campaignViews.getByRole("tab", { name: "Story arcs" }).click();
    await expect(addStoryArcButton).toBeVisible();
  }
  
  const hasStoryArc = await page
    .getByRole("listitem")
    .filter({ hasText: "The Ancient Prophecy" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasStoryArc) {
    await addStoryArcButton.click();
    await expect(page.getByRole("dialog", { name: "Add story arc" })).toBeVisible();

    await page.getByLabel("Story arc name").fill("The Ancient Prophecy");
    await page
      .getByLabel("Summary")
      .fill("An ancient prophecy foretells the return of the dragon king.");
    await page.getByRole("button", { name: "Save story arc" }).click();

    await Promise.race([
      page
        .getByRole("dialog", { name: /create story arc/i })
        .waitFor({ state: "hidden", timeout: 3000 })
        .catch(() => null),
      page.getByTestId("error-message").waitFor({ timeout: 3000 }).catch(() => null)
    ]);

    const errorMessage = await page.getByTestId("error-message").isVisible().catch(() => false);
    if (errorMessage) {
      const errorText = await page.getByTestId("error-message").textContent() ?? "";
      throw new Error(`Story arc creation failed: ${errorText}`);
    }
  }
});

Then('story arc "The Ancient Prophecy" appears in the story arcs list', async ({ page }) => {
  await expect(
    page.getByRole("listitem").filter({ hasText: "The Ancient Prophecy" }).first()
  ).toBeVisible({ timeout: 3000 });
});
