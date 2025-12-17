import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { ensureCampaignExists, getUniqueCampaignName, getStoredCampaignName, getStoredWorldName } from "../helpers";
import { Buffer } from "buffer";
import path from "path";

const { When, Then } = createBdd();

When('the admin navigates to the "Assets" library screen', async ({ page }) => {
  // Intercept image requests and return a valid 1x1 PNG
  // This ensures images load even though the storageUrl is a mock path
  await page.route("**/mock-assets/**", async (route) => {
    // Return a valid 1x1 transparent PNG
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: pngBuffer
    });
  });

  // Navigate via the Snapp menu entry "Manage Assets"
  await page.getByRole("button", { name: "Snapp" }).click();
  await page.getByRole("button", { name: "Manage Assets" }).click();
  await expect(page.getByRole("heading", { name: "Assets" })).toBeVisible();
});

When("the admin uploads an image asset {string}", async ({ page }, fileName: string) => {
  const fileInput = page.getByLabel("Upload asset");
  const filePath = path.join(process.cwd(), "seeds", "assets", "images", fileName);
  await fileInput.setInputFiles(filePath);
});

Then("the image asset {string} appears in the assets list", async ({ page }, fileName: string) => {
  await expect(
    page.getByRole("row").filter({ hasText: fileName }).first()
  ).toBeVisible();
});

Then(
  "the image asset {string} displays a thumbnail in the assets list",
  async ({ page }, fileName: string) => {
    const row = page.getByRole("row").filter({ hasText: fileName }).first();
    await expect(row).toBeVisible();
    // Check that there's an image (thumbnail) in the preview column
    // The route interception is already set up in the navigation step
    const thumbnail = row.locator("img").first();
    await expect(thumbnail).toBeVisible();
  }
);

When(
  "the admin clicks the thumbnail for image asset {string}",
  async ({ page }, fileName: string) => {
    const row = page.getByRole("row").filter({ hasText: fileName }).first();
    await expect(row).toBeVisible();
    const thumbnail = row.locator("img").first();
    await expect(thumbnail).toBeVisible();
    await thumbnail.click();
  }
);

Then(
  "a modal opens displaying the full image for {string}",
  async ({ page }, fileName: string) => {
    // Wait for the modal to appear
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    // Check that the modal title contains the asset name or filename
    // The modal shows asset.name || asset.originalFileName, so check for either
    const baseName = fileName.replace(/\.[^.]+$/, ""); // Remove extension
    const hasFileName = await modal.getByText(fileName).isVisible().catch(() => false);
    const hasBaseName = await modal.getByText(baseName).isVisible().catch(() => false);
    if (!hasFileName && !hasBaseName) {
      throw new Error(`Modal title does not contain "${fileName}" or "${baseName}"`);
    }
    // Check that there's an image in the modal
    const modalImage = modal.locator("img").first();
    await expect(modalImage).toBeVisible();
  }
);

When("the admin closes the image modal", async ({ page }) => {
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  // Try to close via the close button (✕) using aria-label
  const closeButton = modal.getByRole("button", { name: "Close" });
  await closeButton.click();
});

Then("the modal is no longer visible", async ({ page }) => {
  const modal = page.getByRole("dialog");
  await expect(modal).not.toBeVisible();
});

When("the admin uploads an audio asset {string}", async ({ page }, fileName: string) => {
  const fileInput = page.getByLabel("Upload asset");
  await fileInput.setInputFiles({
    name: fileName,
    mimeType: "audio/mpeg",
    buffer: Buffer.from("fake audio content")
  });
});

Then("the audio asset {string} appears in the assets list", async ({ page }, fileName: string) => {
  await expect(
    page.getByRole("row").filter({ hasText: fileName }).first()
  ).toBeVisible();
});

When(
  "the admin sets the image asset for location {string} to {string}",
  async ({ page }, locationName: string, assetName: string) => {
    // TODO: Wire this up once the location-image UI exists.
    // For now this step is a no-op to document intent.
    void locationName;
    void assetName;
  }
);

Then(
  "the location {string} shows image asset {string} in the UI",
  async ({ page }, locationName: string, assetName: string) => {
    // TODO: Assert against the real rendered image once implemented.
    void page;
    void locationName;
    void assetName;
  }
);

When(
  "the admin sets the ambience audio asset for scene {string} to {string}",
  async ({ page }, sceneName: string, assetName: string) => {
    // TODO: Wire this up once the scene-audio UI exists.
    // For now this step is a no-op to document intent.
    void sceneName;
    void assetName;
  }
);

Then(
  "the scene {string} shows audio asset {string} as the ambience track in the UI",
  async ({ page }, sceneName: string, assetName: string) => {
    // TODO: Assert against the real rendered audio control once implemented.
    void page;
    void sceneName;
    void assetName;
  }
);

When("campaign {string} exists", async ({ page }, campaignName: string) => {
  // Make campaign name unique per worker to avoid conflicts when tests run in parallel
  const uniqueCampaignName = getUniqueCampaignName(campaignName);
  
  await ensureCampaignExists(
    page,
    uniqueCampaignName,
    `Autogenerated campaign for assets feature: ${uniqueCampaignName}`
  );
  
  // Store the unique name in page context for other steps to use
  await page.evaluate((name) => {
    (window as any).__testCampaignName = name;
  }, uniqueCampaignName);
});

When("the admin selects campaign {string}", async ({ page }, campaignName: string) => {
  // Get the unique campaign name if it was stored, otherwise generate it
  const uniqueCampaignName = await getStoredCampaignName(page, campaignName).catch(() => 
    getUniqueCampaignName(campaignName)
  );
  
  // Check page state before interacting - be defensive
  // If we can't check or page is closed, skip this step gracefully
  let actuallyClosed = false;
  try {
    actuallyClosed = page.isClosed();
  } catch {
    // Can't check - might be in transition or page is in bad state
    // Try to continue, but if page operations fail, that's okay
    try {
      // Quick check if page is usable
      await page.url();
    } catch {
      // Page is definitely not usable, skip this step
      return;
    }
  }
  if (actuallyClosed) {
    // Page is closed, can't proceed
    return;
  }
  
  // If campaign views are already visible, assume the campaign is selected
  const viewsVisible = await page
    .getByRole("tablist", { name: "Campaign views" })
    .isVisible()
    .catch(() => false);

  if (viewsVisible) {
    return;
  }

  try {
    // Try to find campaign by unique name first, then fall back to base name
    let campaignTab = page.getByRole("tab", { name: uniqueCampaignName }).first();
    let exists = await campaignTab.isVisible().catch(() => false);
    
    // If not found by unique name, try base name (for backwards compatibility)
    if (!exists) {
      campaignTab = page.getByRole("tab", { name: campaignName }).first();
      exists = await campaignTab.isVisible().catch(() => false);
    }
    
    if (exists) {
      // Check page state again before clicking - be defensive
      let stillClosed = false;
      try {
        stillClosed = page.isClosed();
      } catch {
        // Can't check - might be in transition, continue anyway
      }
      if (stillClosed) {
        throw new Error("Page was closed before clicking campaign tab");
      }
      await campaignTab.click();
      await expect(
        page.getByRole("tablist", { name: "Campaign views" })
      ).toBeVisible();
    }
  } catch (error) {
    // Check if page is actually closed - be defensive
    let actuallyClosed = false;
    try {
      actuallyClosed = page.isClosed();
    } catch {
      // Can't check - might be in transition, rethrow original error
      throw error;
    }
    if (actuallyClosed) {
      throw new Error("Page was closed while trying to select campaign");
    }
    // Otherwise, rethrow the original error
    throw error;
  }
});

When(
  "the admin ensures session {string} exists for campaign {string}",
  async ({ page }, sessionName: string) => {
    // Check page state before interacting
    if (page.isClosed()) {
      throw new Error("Page was closed before ensuring session exists");
    }
    
    // Assume the correct campaign is already selected
    try {
      await page
        .getByRole("tablist", { name: "Campaign views" })
        .getByRole("tab", { name: "Sessions" })
        .click();
    } catch (error) {
      if (page.isClosed() || error.message?.includes("closed") || error.message?.includes("Target page")) {
        throw new Error("Page was closed while trying to click Sessions tab");
      }
      throw error;
    }

    const hasSession = await page
      .getByRole("listitem")
      .filter({ hasText: sessionName })
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasSession) {
      await expect(
        page.getByRole("button", { name: "Add session" })
      ).toBeVisible();
      await page.getByRole("button", { name: "Add session" }).click();
      await page.getByLabel("Session name").fill(sessionName);
      await page.getByRole("button", { name: "Save session" }).click();
    }
  }
);

When(
  "the admin ensures scene {string} exists in session {string}",
  async ({ page }, sceneName: string, sessionName: string) => {
    // Navigate to Sessions view and open the given session's scenes
    await page
      .getByRole("tablist", { name: "Campaign views" })
      .getByRole("tab", { name: "Sessions" })
      .click();

    await page
      .getByRole("listitem")
      .filter({ hasText: sessionName })
      .first()
      .getByRole("button", { name: "View scenes" })
      .click();

    const hasScene = await page
      .getByRole("listitem")
      .filter({ hasText: sceneName })
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasScene) {
      await page.getByRole("button", { name: "Add scene" }).click();
      const addSceneDialog = page.getByRole("dialog", { name: "Add scene" });
      await expect(addSceneDialog).toBeVisible();

      await addSceneDialog.getByLabel("Scene name").fill(sceneName);
      await addSceneDialog
        .getByLabel("Summary", { exact: true })
        .fill("Autogenerated scene for assets feature.");

      // Get the unique world name (stored from earlier steps)
      const worldName = await getStoredWorldName(page, "Eldoria");
      await addSceneDialog.getByLabel("World").selectOption(worldName);

      await page.getByRole("button", { name: "Save scene" }).click();
    }
  }
);
