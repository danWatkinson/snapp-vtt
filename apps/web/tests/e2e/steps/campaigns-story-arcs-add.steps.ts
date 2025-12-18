import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { selectWorldAndEnterPlanningMode } from "../helpers";
// Note: "the campaign Rise of the Dragon King exists" is defined in campaigns-create.steps.ts

const { When, Then } = createBdd();

When('the admin navigates to the "Story Arcs" planning screen', async ({ page }) => {
  await selectWorldAndEnterPlanningMode(page, "Story Arcs");
});

When("the admin navigates to the story arcs view", async ({ page }) => {
  await page
    .getByRole("tablist", { name: "Campaign views" })
    .getByRole("tab", { name: "Story arcs" })
    .click();

  await expect(page.getByRole("button", { name: "Add story arc" })).toBeVisible();
});

When('the admin ensures story arc "The Ancient Prophecy" exists', async ({ page }) => {
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
