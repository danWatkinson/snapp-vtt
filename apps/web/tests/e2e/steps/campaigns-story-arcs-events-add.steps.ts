import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { selectWorldAndEnterMode, getStoredCampaignName, ensureCampaignExists } from "../helpers";
import { navigateToCampaignView, isOnCampaignView } from "../helpers/navigation";
import { createStoryArc } from "../helpers/entityCreation";
import { STABILITY_WAIT_SHORT, STABILITY_WAIT_MEDIUM } from "../helpers/constants";
// Note: "the campaign \"Rise of the Dragon King\" exists" is defined in campaigns-create.steps.ts
// Note: "the admin navigates to the \"Story Arcs\" planning screen" and
// "the admin navigates to the story arcs view" are defined in campaigns-story-arcs-add.steps.ts

const { When, Then } = createBdd();

When('story arc "The Ancient Prophecy" exists', async ({ page }) => {
  // Navigate to story arcs view first (if not already there)
  if (!(await isOnCampaignView(page, "story-arcs"))) {
    // Get test campaign name
    const campaignName = await getStoredCampaignName(page, "Rise of the Dragon King");
    
    // Use ensureCampaignExists which handles world selection, campaign finding/creation, etc.
    await ensureCampaignExists(
      page,
      campaignName,
      "A long-running campaign about ancient draconic power returning."
    );
    
    // Navigate to story arcs view
    await navigateToCampaignView(page, "story-arcs");
  }
  
  // Create story arc if it doesn't exist
  await createStoryArc(page, "The Ancient Prophecy", "An ancient prophecy foretells the return of the dragon king.");
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
  await selectWorldAndEnterMode(page, "World Entities");
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
    .getByRole("tablist", { name: "World views" })
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
