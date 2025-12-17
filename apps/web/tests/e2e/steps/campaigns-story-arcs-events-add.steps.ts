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
        .getByRole("dialog", { name: /add event to story arc/i })
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => null),
      page.getByTestId("error-message").waitFor({ timeout: 5000 }).catch(() => null)
    ]);

    const errorMessage = await page.getByTestId("error-message").isVisible().catch(() => false);
    if (errorMessage) {
      const errorText = await page.getByTestId("error-message").textContent() ?? "";
      throw new Error(`Story arc creation failed: ${errorText}`);
    }
  }
});

When('the admin views events for story arc "The Ancient Prophecy"', async ({ page }) => {
  await page
    .getByRole("listitem")
    .filter({ hasText: "The Ancient Prophecy" })
    .first()
    .getByRole("button", { name: "View events" })
    .click();

  await expect(page.getByRole("button", { name: "Add event" })).toBeVisible();
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

  await page
    .getByRole("listitem")
    .filter({ hasText: "The Ancient Prophecy" })
    .first()
    .getByRole("button", { name: "View events" })
    .click();
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
  ).toBeVisible({ timeout: 10000 });
});
