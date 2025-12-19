import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { selectWorldAndEnterPlanningMode, getUniqueCampaignName } from "../helpers";
import { safeWait } from "../helpers/utils";
import { STABILITY_WAIT_SHORT, STABILITY_WAIT_MEDIUM } from "../helpers/constants";
// Note: "the campaign \"Rise of the Dragon King\" exists" is defined in campaigns-create.steps.ts
// Note: "the admin navigates to the \"Story Arcs\" planning screen" and
// "the admin navigates to the story arcs view" are defined in campaigns-story-arcs-add.steps.ts

const { When, Then } = createBdd();

When('story arc "The Ancient Prophecy" exists', async ({ page }) => {
  // Navigate to story arcs view first (if not already there)
  const addStoryArcButton = page.getByRole("button", { name: "Add story arc" });
  const isOnStoryArcsView = await addStoryArcButton.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (!isOnStoryArcsView) {
    // Use already-imported utilities from top of file
    const campaignViews = page.getByRole("tablist", { name: "Campaign views" });
    const isCampaignSelected = await campaignViews.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (!isCampaignSelected) {
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
      
      // Navigate to Campaigns planning screen
      await selectWorldAndEnterPlanningMode(page, "Campaigns");
      
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
        .getByRole("dialog", { name: /add story arc/i })
        .waitFor({ state: "hidden", timeout: 3000 })
        .catch(() => null),
      page.getByTestId("error-message").waitFor({ timeout: 3000 }).catch(() => null)
    ]);

    const errorMessage = await page.getByTestId("error-message").isVisible().catch(() => false);
    if (errorMessage) {
      const errorText = await page.getByTestId("error-message").textContent() ?? "";
      throw new Error(`Story arc creation failed: ${errorText}`);
    }
    
    // Wait for the story arc to appear in the list
    const storyArcItem = page.getByRole("listitem").filter({ hasText: "The Ancient Prophecy" }).first();
    await expect(storyArcItem).toBeVisible({ timeout: 3000 });
    
    // Wait for the "View events" button to be visible (indicates UI is fully rendered)
    await expect(storyArcItem.getByRole("button", { name: "View events" })).toBeVisible({ timeout: 3000 });
  }
});

When('the admin views events for story arc "The Ancient Prophecy"', async ({ page }) => {
  // Ensure we're in the story arcs view first
  await page
    .getByRole("tablist", { name: "Campaign views" })
    .getByRole("tab", { name: "Story arcs" })
    .click();
  
  // Wait for the story arcs list to be ready
  await expect(page.getByRole("button", { name: "Add story arc" })).toBeVisible({ timeout: 3000 });
  
  // Check if we're already viewing events (story arc might be auto-selected)
  const addEventButton = page.getByRole("button", { name: "Add event" });
  const alreadyViewingEvents = await addEventButton.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (alreadyViewingEvents) {
    // Already viewing events for a story arc - verify it's the right one
    // The heading should show the story arc name or we can check the events list
    // For now, just verify we're in the events view
    return;
  }
  
  // Not viewing events yet - click the "View events" button
  // Wait for the button to be visible (indicates list is fully rendered)
  const viewEventsButton = page
    .getByRole("listitem")
    .filter({ hasText: "The Ancient Prophecy" })
    .first()
    .getByRole("button", { name: "View events" });
  await expect(viewEventsButton).toBeVisible({ timeout: 3000 });
  await viewEventsButton.click();

  await expect(page.getByRole("button", { name: "Add event" })).toBeVisible({ timeout: 3000 });
});

When('world event "The Prophecy Revealed" exists', async ({ page }) => {
  await selectWorldAndEnterPlanningMode(page, "World Entities");
  await page
    .getByRole("tablist", { name: "Entity types" })
    .getByRole("tab", { name: "Events" })
    .click();

  const hasWorldEvent = await page
    .getByRole("listitem")
    .filter({ hasText: "The Prophecy Revealed" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasWorldEvent) {
    await page.getByRole("button", { name: "Add event" }).click();
    await expect(page.getByRole("dialog", { name: "Add event" })).toBeVisible();

    const worldEventDialog = page.getByRole("dialog", { name: "Add event" });
    await worldEventDialog.getByLabel("Event name").fill("The Prophecy Revealed");
    await worldEventDialog
      .getByLabel("Summary")
      .fill("The ancient prophecy is discovered in a hidden temple.");
    await worldEventDialog.getByRole("button", { name: "Save event" }).click();
  }

  // Return to Story Arcs planning view
  await page
    .getByRole("tablist", { name: "World planning views" })
    .getByRole("tab", { name: "Story Arcs" })
    .click();
  await page
    .getByRole("tablist", { name: "Campaign views" })
    .getByRole("tab", { name: "Story arcs" })
    .click();

  // Wait for the story arcs list to be ready
  await expect(page.getByRole("button", { name: "Add story arc" })).toBeVisible({ timeout: 3000 });

  // Check if we're already viewing events (story arc might be auto-selected)
  const addEventButton = page.getByRole("button", { name: "Add event" });
  const alreadyViewingEvents = await addEventButton.isVisible({ timeout: 1000 }).catch(() => false);

  if (!alreadyViewingEvents) {
    // Not viewing events yet - click the "View events" button
    // Wait for the button to be visible (indicates list is fully rendered)
    const viewEventsButton = page
      .getByRole("listitem")
      .filter({ hasText: "The Ancient Prophecy" })
      .first()
      .getByRole("button", { name: "View events" });
    await expect(viewEventsButton).toBeVisible({ timeout: 3000 });
    await viewEventsButton.click();

    await expect(page.getByRole("button", { name: "Add event" })).toBeVisible({ timeout: 3000 });
  }
});

When('the admin adds event "The Prophecy Revealed" to the story arc', async ({ page }) => {
  const hasEventInArc = await page
    .getByRole("listitem")
    .filter({ hasText: "The Prophecy Revealed" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasEventInArc) {
    await page.getByRole("button", { name: "Add event" }).click();
    await expect(page.getByRole("dialog", { name: "Add event to story arc" })).toBeVisible();

    const addToArcDialog = page.getByRole("dialog", { name: "Add event to story arc" });
    await addToArcDialog.getByLabel("Event").selectOption("The Prophecy Revealed");
    await addToArcDialog.getByRole("button", { name: "Save" }).click();
  }
});

Then('event "The Prophecy Revealed" appears in the story arc\'s events list', async ({ page }) => {
  await expect(
    page.getByRole("listitem").filter({ hasText: "The Prophecy Revealed" }).first()
  ).toBeVisible({ timeout: 3000 });
});
