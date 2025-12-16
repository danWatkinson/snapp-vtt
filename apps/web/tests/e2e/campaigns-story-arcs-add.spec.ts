import { test, expect } from "@playwright/test";
import { loginAsAdmin, selectWorldAndEnterPlanningMode, ensureCampaignExists } from "./helpers";

test("Game master can add Story Arcs to a Campaign", async ({ page }) => {
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

  // Check if "The Ancient Prophecy" story arc already exists (from previous test run)
  const hasStoryArc = await page
    .getByRole("listitem")
    .filter({ hasText: "The Ancient Prophecy" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasStoryArc) {
    // Add a story arc via popup
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
      page.getByRole("dialog", { name: /create story arc/i }).waitFor({ state: "hidden", timeout: 5000 }).catch(() => null),
      page.getByTestId("error-message").waitFor({ timeout: 5000 }).catch(() => null)
    ]);
    
    // If there's an error, fail the test
    const errorMessage = await page.getByTestId("error-message").isVisible().catch(() => false);
    if (errorMessage) {
      const errorText = await page.getByTestId("error-message").textContent() ?? "";
      throw new Error(`Story arc creation failed: ${errorText}`);
    }
  }

  // Story arc appears in the list
  await expect(
    page.getByRole("listitem").filter({ hasText: "The Ancient Prophecy" }).first()
  ).toBeVisible({ timeout: 10000 });
});
