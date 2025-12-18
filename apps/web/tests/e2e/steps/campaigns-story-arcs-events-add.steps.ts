import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { selectWorldAndEnterPlanningMode } from "../helpers";
// Note: "the campaign \"Rise of the Dragon King\" exists" is defined in campaigns-create.steps.ts
// Note: "the admin navigates to the \"Story Arcs\" planning screen" and
// "the admin navigates to the story arcs view" are defined in campaigns-story-arcs-add.steps.ts

const { When, Then } = createBdd();

When('story arc "The Ancient Prophecy" exists', async ({ page }) => {
  const hasStoryArc = await page
    .getByRole("listitem")
    .filter({ hasText: "The Ancient Prophecy" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasStoryArc) {
    await page.getByRole("button", { name: "Add story arc" }).click();
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
    await expect(
      page.getByRole("listitem").filter({ hasText: "The Ancient Prophecy" }).first()
    ).toBeVisible({ timeout: 3000 });
    
    // Wait a bit more for the UI to fully render the button
    await page.waitForTimeout(500);
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
  // Wait a moment for the list to fully render
  await page.waitForTimeout(200);
  
  await page
    .getByRole("listitem")
    .filter({ hasText: "The Ancient Prophecy" })
    .first()
    .getByRole("button", { name: "View events" })
    .click({ timeout: 3000 });

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
    // Wait a moment for the list to fully render
    await page.waitForTimeout(200);

    await page
      .getByRole("listitem")
      .filter({ hasText: "The Ancient Prophecy" })
      .first()
      .getByRole("button", { name: "View events" })
      .click({ timeout: 10000 });

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
