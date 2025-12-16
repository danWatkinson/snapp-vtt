import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("Game master can create a Scene within a Session", async ({ page }) => {
  await loginAsAdmin(page);

  // Go to Campaigns tab
  await page.getByRole("tab", { name: "Campaigns" }).click();

  // Ensure "Rise of the Dragon King" campaign exists
  const hasCampaignTab = await page
    .getByRole("tab", { name: "Rise of the Dragon King" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasCampaignTab) {
    await page.getByRole("button", { name: "Create campaign" }).click();
    await page.getByLabel("Campaign name").fill("Rise of the Dragon King");
    await page
      .getByLabel("Summary")
      .fill("A long-running campaign about ancient draconic power returning.");
    await page.getByRole("button", { name: "Save campaign" }).click();
    
    await expect(
      page.getByRole("tab", { name: "Rise of the Dragon King" }).first()
    ).toBeVisible();
  }

  // Select campaign and open sessions view via nested campaign view tabs
  await page.getByRole("tab", { name: "Rise of the Dragon King" }).first().click();
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

  // Ensure Eldoria world exists (for scene to reference)
  await page.getByRole("tab", { name: "World" }).click();
  
  // Wait for worlds section to load (either list or empty state)
  await Promise.race([
    page.getByRole("button", { name: "Create world" }).waitFor().catch(() => null),
    page.getByText("No worlds have been created yet.").waitFor().catch(() => null),
    page.getByRole("tab").first().waitFor().catch(() => null)
  ]);
  
  const hasEldoriaTab = await page
    .getByRole("tab", { name: "Eldoria" })
    .isVisible()
    .catch(() => false);

  if (!hasEldoriaTab) {
    await page.getByRole("button", { name: "Create world" }).click();
    await page.getByLabel("World name").fill("Eldoria");
    await page.getByLabel("Description").fill("A high-fantasy realm.");
    await page.getByRole("button", { name: "Save world" }).click();
    
    // Wait for either success status or error message
    await Promise.race([
      page.getByTestId("status-message").waitFor({ timeout: 5000 }).catch(() => null),
      page.getByTestId("error-message").waitFor({ timeout: 5000 }).catch(() => null)
    ]);

    // Check for errors - if it's "already exists", that's fine, just verify it's in the list
    const errorMessage = await page.getByTestId("error-message").isVisible().catch(() => false);
    if (errorMessage) {
      const errorText = await page.getByTestId("error-message").textContent() ?? "";
      // If world already exists, reload and verify its tab appears
      if (errorText.includes("already exists")) {
        await page.waitForTimeout(500);
        await expect(
          page.getByRole("tab", { name: "Eldoria" })
        ).toBeVisible({ timeout: 10000 });
      } else {
        throw new Error(`World creation failed: ${errorText}`);
      }
    } else {
      // No error, wait for world tab to appear
      await expect(
        page.getByRole("tab", { name: "Eldoria" })
      ).toBeVisible({ timeout: 10000 });
    }
  }

  // Go back to Campaigns tab
  await page.getByRole("tab", { name: "Campaigns" }).click();

  // Reopen campaign's sessions view via nested campaign view tabs
  await page.getByRole("tab", { name: "Rise of the Dragon King" }).first().click();
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

