import { test, expect } from "@playwright/test";
import { loginAsAdmin, selectWorldAndEnterPlanningMode, ensureCampaignExists } from "./helpers";

test("Game master can add Events to a Story Arc", async ({ page }) => {
  await loginAsAdmin(page);

  // Select a world and enter planning mode, then navigate to Story Arcs sub-tab
  await selectWorldAndEnterPlanningMode(page, "Story Arcs");

  // Ensure "Rise of the Dragon King" campaign exists
  await ensureCampaignExists(
    page,
    "Rise of the Dragon King",
    "A long-running campaign about ancient draconic power returning."
  );

  // ensureCampaignExists already selects the campaign, so just navigate to story arcs view
  await page
    .getByRole("tablist", { name: "Campaign views" })
    .getByRole("tab", { name: "Story arcs" })
    .click();

  // Wait for the story arcs section to load
  await expect(
    page.getByRole("button", { name: "Add story arc" })
  ).toBeVisible();

  // Ensure "The Ancient Prophecy" story arc exists
  const hasStoryArc = await page
    .getByRole("listitem")
    .filter({ hasText: "The Ancient Prophecy" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasStoryArc) {
    await page.getByRole("button", { name: "Add story arc" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add story arc" })
    ).toBeVisible();

    await page.getByLabel("Story arc name").fill("The Ancient Prophecy");
    await page
      .getByLabel("Summary")
      .fill("An ancient prophecy foretells the return of the dragon king.");
    await page.getByRole("button", { name: "Save story arc" }).click();
    
    // Wait for modal to close (success) or error message
    await Promise.race([
      page.getByRole("dialog", { name: /add event to story arc/i }).waitFor({ state: "hidden", timeout: 5000 }).catch(() => null),
      page.getByTestId("error-message").waitFor({ timeout: 5000 }).catch(() => null)
    ]);
    
    // If there's an error, fail the test
    const errorMessage = await page.getByTestId("error-message").isVisible().catch(() => false);
    if (errorMessage) {
      const errorText = await page.getByTestId("error-message").textContent() ?? "";
      throw new Error(`Story arc creation failed: ${errorText}`);
    }
  }

  // Click on the story arc to view its events
  await page
    .getByRole("listitem")
    .filter({ hasText: "The Ancient Prophecy" })
    .first()
    .getByRole("button", { name: "View events" })
    .click();

  // Wait for the events section to load
  await expect(
    page.getByRole("button", { name: "Add event" })
  ).toBeVisible();

  // Ensure we have a world event that can be attached to the story arc
  // Switch to planning view for world entities and create \"The Prophecy Revealed\" if needed
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
    await expect(
      page.getByRole("dialog", { name: "Add event" })
    ).toBeVisible();

    const worldEventDialog = page.getByRole("dialog", { name: "Add event" });
    await worldEventDialog.getByLabel("Event name").fill("The Prophecy Revealed");
    await worldEventDialog
      .getByLabel("Summary")
      .fill("The ancient prophecy is discovered in a hidden temple.");
    await worldEventDialog.getByRole("button", { name: "Save event" }).click();
  }

  // Return to Story Arcs planning view for this world and campaign
  await page
    .getByRole("tablist", { name: "World planning views" })
    .getByRole("tab", { name: "Story Arcs" })
    .click();
  // Campaign is already selected, just navigate to story arcs view
  await page
    .getByRole("tablist", { name: "Campaign views" })
    .getByRole("tab", { name: "Story arcs" })
    .click();
  
  // Click on the story arc to view its events
  await page
    .getByRole("listitem")
    .filter({ hasText: "The Ancient Prophecy" })
    .first()
    .getByRole("button", { name: "View events" })
    .click();

  // Check if "The Prophecy Revealed" is already in the story arc
  const hasEventInArc = await page
    .getByRole("listitem")
    .filter({ hasText: "The Prophecy Revealed" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasEventInArc) {
    // Add the event to the story arc
    await page.getByRole("button", { name: "Add event" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add event to story arc" })
    ).toBeVisible();

    // Select existing event from dropdown
    const addToArcDialog = page.getByRole("dialog", { name: "Add event to story arc" });
    await addToArcDialog.getByLabel("Event").selectOption("The Prophecy Revealed");
    await addToArcDialog.getByRole("button", { name: "Save" }).click();
  }

  // Event appears in the story arc's events list
  await expect(
    page.getByRole("listitem").filter({ hasText: "The Prophecy Revealed" }).first()
  ).toBeVisible({ timeout: 10000 });
});