import { test, expect } from "@playwright/test";
import { loginAsAdmin, selectWorldAndEnterPlanningMode, ensureCampaignExists } from "./helpers";

test("Game master can create a Scene within a Session", async ({ page }) => {
  await loginAsAdmin(page);

  // Select a world and enter planning mode, then navigate to Campaigns sub-tab
  await selectWorldAndEnterPlanningMode(page, "Campaigns");

  // Ensure "Rise of the Dragon King" campaign exists
  await ensureCampaignExists(
    page,
    "Rise of the Dragon King",
    "A long-running campaign about ancient draconic power returning."
  );

  // ensureCampaignExists already selects the campaign, so just navigate to sessions view
  await page
    .getByRole("tablist", { name: "Campaign views" })
    .getByRole("tab", { name: "Sessions" })
    .click();

  // Ensure "Session 1" exists
  const hasSession = await page
    .getByRole("listitem")
    .filter({ hasText: "Session 1" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasSession) {
    await expect(
      page.getByRole("button", { name: "Add session" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Add session" }).click();
    await page.getByLabel("Session name").fill("Session 1");
    await page.getByRole("button", { name: "Save session" }).click();
    
    await expect(
      page.getByRole("listitem").filter({ hasText: "Session 1" }).first()
    ).toBeVisible();
  }

  // We rely on seeded world \"Eldoria\" (or an existing world) for the scene's world reference.
  // Navigate back to sessions view (campaign is already selected)
  await page
    .getByRole("tablist", { name: "Campaign views" })
    .getByRole("tab", { name: "Sessions" })
    .click();

  // Click on Session 1 to view its scenes
  await page
    .getByRole("listitem")
    .filter({ hasText: "Session 1" })
    .first()
    .getByRole("button", { name: "View scenes" })
    .click();

  // Wait for the scenes section to load (check for Add scene button)
  await expect(
    page.getByRole("button", { name: "Add scene" })
  ).toBeVisible();

  // Check if "The Throne Room" scene already exists (from previous test run)
  const hasScene = await page
    .getByRole("listitem")
    .filter({ hasText: "The Throne Room" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasScene) {
    // Add a scene via popup
    await page.getByRole("button", { name: "Add scene" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add scene" })
    ).toBeVisible();

    const addSceneDialog = page.getByRole("dialog", { name: "Add scene" });

    await addSceneDialog.getByLabel("Scene name").fill("The Throne Room");
    await addSceneDialog
      .getByLabel("Summary", { exact: true })
      .fill("A tense negotiation with the king.");
    
    // Select Eldoria as the world
    await addSceneDialog.getByLabel("World").selectOption("Eldoria");
    
    await page.getByRole("button", { name: "Save scene" }).click();
  }

  // Scene appears in the list
  await expect(
    page.getByRole("listitem").filter({ hasText: "The Throne Room" }).first()
  ).toBeVisible();
});

