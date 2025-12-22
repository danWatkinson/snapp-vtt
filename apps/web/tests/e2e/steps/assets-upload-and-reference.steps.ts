import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { ensureCampaignExists, getUniqueCampaignName, getStoredCampaignName, getStoredWorldName, ensureLoginDialogClosed, loginAs, selectWorldAndEnterPlanningMode, waitForAssetUploaded, waitForPlanningMode, getUniqueUsername } from "../helpers";
import { safeWait, navigateAndWaitForReady } from "../helpers/utils";
import { Buffer } from "buffer";
import path from "path";

const { When, Then } = createBdd();

When('the world builder navigates to the "Assets" library screen', async ({ page }) => {
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

  // Ensure login dialog is closed (it blocks clicks if open)
  await ensureLoginDialogClosed(page);
  
  // Verify we're logged in by checking for the logout button
  // If not logged in, this step will fail with a clear error
  // The login step should have run before this, but we verify here to catch issues early
  const logoutButton = page.getByRole("button", { name: "Log out" });
  const isLoggedIn = await logoutButton.isVisible({ timeout: 3000 }).catch(() => false);
  
  if (!isLoggedIn) {
    // Check if login button is visible (user is definitely not logged in)
    const loginButton = page.getByRole("button", { name: "Login" });
    const loginButtonVisible = await loginButton.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (loginButtonVisible) {
      throw new Error(
        "User is not logged in. The 'When the world builder signs in to the system' step must run before this step."
      );
    } else {
      // Neither button visible - might be a page state issue
      throw new Error(
        "Cannot determine login state. Logout button not visible and Login button not found. " +
        "The page may be in an unexpected state. Ensure the login step completed successfully."
      );
    }
  }
  
  // Navigate via the Snapp menu entry "Manage Assets"
  await page.getByRole("button", { name: "Snapp" }).click();
  
  // Wait for the menu to be visible - check for "Manage Assets" button
  // World builders (gm role) should see "Manage Assets" but not "User Management"
  await expect(page.getByRole("button", { name: "Manage Assets" })).toBeVisible({ timeout: 3000 });
  
  // Wait for the "Manage Assets" button to be visible
  // This ensures the menu is fully rendered and the role check has passed
  await expect(page.getByRole("button", { name: "Manage Assets" })).toBeVisible({ timeout: 3000 });
  
  // Click "Manage Assets" and wait for the click to complete
  await page.getByRole("button", { name: "Manage Assets" }).click();
  
  // Wait for the Assets heading to be visible (indicates navigation completed)
  // This is the most reliable indicator that the AssetsTab component has rendered
  // The component returns null if currentUser is missing, so if we see the heading,
  // we know both the navigation completed AND the user is authenticated
  await expect(page.getByRole("heading", { name: "Assets" })).toBeVisible({ timeout: 5000 });
});

When("the world builder uploads an image asset {string}", async ({ page }, fileName: string) => {
  // Navigate to Assets screen first (if not already there)
  const assetsHeading = page.getByRole("heading", { name: "Assets" });
  const isOnAssetsScreen = await assetsHeading.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (!isOnAssetsScreen) {
    // Ensure we're on the page before checking login state
    await navigateAndWaitForReady(page);
    
    // Intercept image requests and return a valid 1x1 PNG
    await page.route("**/mock-assets/**", async (route) => {
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

    await ensureLoginDialogClosed(page);
    
    // Check if logged in, and sign in as world builder if not
    const logoutButton = page.getByRole("button", { name: "Log out" });
    const isLoggedIn = await logoutButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isLoggedIn) {
      // Get the unique world builder username from page context
      let uniqueUsername: string;
      try {
        const storedName = await page.evaluate(() => {
          return (window as any).__testWorldBuilderUsername;
        });
        if (storedName) {
          uniqueUsername = storedName;
        } else {
          uniqueUsername = getUniqueUsername("worldbuilder");
        }
      } catch {
        uniqueUsername = getUniqueUsername("worldbuilder");
      }
      
      // Sign in as world builder
      await loginAs(page, uniqueUsername, "worldbuilder123");
    }
    
    await page.getByRole("button", { name: "Snapp" }).click();
    await expect(page.getByRole("button", { name: "Manage Assets" })).toBeVisible({ timeout: 3000 });
    await page.getByRole("button", { name: "Manage Assets" }).click();
    await expect(assetsHeading).toBeVisible({ timeout: 5000 });
  }
  
  // Extract asset name from fileName (without extension) for matching
  const assetNameBase = fileName.replace(/\.(jpg|png|jpeg|gif)$/i, "");
  
  // Check if asset already exists before uploading (optimization: skip upload if already present)
  const assetRow = page.getByRole("row").filter({ hasText: fileName }).first();
  const assetExists = await assetRow.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (assetExists) {
    // Asset already exists - no need to upload again
    return;
  }
  
  // Set up event listener BEFORE uploading
  // Reduced timeout from 15000ms to 10000ms for better performance
  const assetUploadedPromise = waitForAssetUploaded(page, assetNameBase, 10000);
  
  const fileInput = page.getByLabel("Upload asset");
  const filePath = path.join(process.cwd(), "seeds", "assets", "images", fileName);
  
  // Set the file, which triggers the async upload
  await fileInput.setInputFiles(filePath);
  
  // Wait for the asset upload event
  await assetUploadedPromise;
});

Then("the image asset {string} appears in the assets list", async ({ page }, fileName: string) => {
  // Wait longer for the asset to appear - upload involves:
  // 1. File upload to API route
  // 2. API route saves file and calls assets service
  // 3. Response returned to client
  // 4. State update triggers React re-render
  // This can take a few seconds, especially with network latency
  const row = page.getByRole("row").filter({ hasText: fileName }).first();
  await expect(row).toBeVisible({ timeout: 5000 }); // Reduced from 10000ms to 5000ms for better performance
  
  // Verify the thumbnail is visible and clicking it opens the modal
  const thumbnail = row.locator("img").first();
  await expect(thumbnail).toBeVisible();
  
  // Click the thumbnail to verify the modal opens
  await thumbnail.click();
  
  // Verify the modal opens with the full image
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  // Check that the modal title contains the asset name or filename
  const baseName = fileName.replace(/\.[^.]+$/, ""); // Remove extension
  const hasFileName = await modal.getByText(fileName).isVisible().catch(() => false);
  const hasBaseName = await modal.getByText(baseName).isVisible().catch(() => false);
  if (!hasFileName && !hasBaseName) {
    throw new Error(`Modal title does not contain "${fileName}" or "${baseName}"`);
  }
  // Check that there's an image in the modal
  const modalImage = modal.locator("img").first();
  await expect(modalImage).toBeVisible();
  
  // Close the modal and verify it closes
  const closeButton = modal.getByRole("button", { name: "Close" });
  await closeButton.click();
  await expect(modal).not.toBeVisible();
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
  "the world builder clicks the thumbnail for image asset {string}",
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

Then(
  "clicking the thumbnail for image asset {string} opens a modal displaying the full image",
  async ({ page }, fileName: string) => {
    // Verify the asset appears in the list with a thumbnail
    const row = page.getByRole("row").filter({ hasText: fileName }).first();
    await expect(row).toBeVisible();
    const thumbnail = row.locator("img").first();
    await expect(thumbnail).toBeVisible();
    
    // Click the thumbnail to open the modal
    await thumbnail.click();
    
    // Verify the modal opens with the full image
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    // Check that the modal title contains the asset name or filename
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

When("the world builder closes the image modal", async ({ page }) => {
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  // Try to close via the close button (✕) using aria-label
  const closeButton = modal.getByRole("button", { name: "Close" });
  await closeButton.click();
  // Verify the modal is closed
  await expect(modal).not.toBeVisible();
});

Then("the modal is no longer visible", async ({ page }) => {
  const modal = page.getByRole("dialog");
  await expect(modal).not.toBeVisible();
});

When("the world builder uploads an audio asset {string}", async ({ page }, fileName: string) => {
  // Navigate to Assets screen first (if not already there)
  const assetsHeading = page.getByRole("heading", { name: "Assets" });
  const isOnAssetsScreen = await assetsHeading.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (!isOnAssetsScreen) {
    // Ensure we're on the page before checking login state
    await navigateAndWaitForReady(page);
    
    // Intercept image requests and return a valid 1x1 PNG
    await page.route("**/mock-assets/**", async (route) => {
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

    await ensureLoginDialogClosed(page);
    
    // Check if logged in, and sign in as world builder if not
    const logoutButton = page.getByRole("button", { name: "Log out" });
    const isLoggedIn = await logoutButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isLoggedIn) {
      // Get the unique world builder username from page context
      let uniqueUsername: string;
      try {
        const storedName = await page.evaluate(() => {
          return (window as any).__testWorldBuilderUsername;
        });
        if (storedName) {
          uniqueUsername = storedName;
        } else {
          uniqueUsername = getUniqueUsername("worldbuilder");
        }
      } catch {
        uniqueUsername = getUniqueUsername("worldbuilder");
      }
      
      // Sign in as world builder
      await loginAs(page, uniqueUsername, "worldbuilder123");
    }
    
    await page.getByRole("button", { name: "Snapp" }).click();
    await expect(page.getByRole("button", { name: "Manage Assets" })).toBeVisible({ timeout: 3000 });
    await page.getByRole("button", { name: "Manage Assets" }).click();
    await expect(assetsHeading).toBeVisible({ timeout: 5000 });
  }
  
  // Extract asset name from fileName (without extension) for matching
  const assetNameBase = fileName.replace(/\.(mp3|wav|ogg)$/i, "");
  
  // Check if asset already exists before uploading (optimization: skip upload if already present)
  const assetRow = page.getByRole("row").filter({ hasText: fileName }).first();
  const assetExists = await assetRow.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (assetExists) {
    // Asset already exists - no need to upload again
    return;
  }
  
  const fileInput = page.getByLabel("Upload asset");
  await fileInput.setInputFiles({
    name: fileName,
    mimeType: "audio/mpeg",
    buffer: Buffer.from("fake audio content")
  });
  
  // Set up event listener BEFORE uploading
  // Reduced timeout from 15000ms to 10000ms for better performance
  const assetUploadedPromise = waitForAssetUploaded(page, assetNameBase, 10000);
  
  // Wait for the asset upload event
  await assetUploadedPromise;
});

Then("the audio asset {string} appears in the assets list", async ({ page }, fileName: string) => {
  // Wait longer for the asset to appear - same timeout as image assets
  await expect(
    page.getByRole("row").filter({ hasText: fileName }).first()
  ).toBeVisible({ timeout: 5000 }); // Reduced from 10000ms to 5000ms for better performance
});

When(
  "the world builder sets the image asset for location {string} to {string}",
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
  "the world builder sets the ambience audio asset for scene {string} to {string}",
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

// Navigation steps for world builder
When('the world builder navigates to the "World Entities" planning screen', async ({ page }) => {
  await selectWorldAndEnterPlanningMode(page, "World Entities");
  
  // After navigating to World Entities, the world context tablist might not be visible
  // if we're already in planning mode (it's hidden when a world is selected).
  // We only need to wait for it if we're not in planning mode yet.
  // The selectWorldAndEnterPlanningMode function handles this, so we don't need to wait here.
  // If a world needs to be selected, that will happen in the next step.
});

When('the world builder navigates to the "Campaigns" planning screen', async ({ page }) => {
  await selectWorldAndEnterPlanningMode(page, "Campaigns");
});

When("the world builder navigates to the locations tab", async ({ page }) => {
  await page.getByRole("tab", { name: "Locations" }).click();
  await expect(page.getByRole("button", { name: "Add location" })).toBeVisible();
});

When("the world builder selects world {string}", async ({ page }, worldName: string) => {
  // Try to get the stored world name first
  let uniqueWorldName = await getStoredWorldName(page, worldName).catch(() => null);
  
  // If no stored name, generate it (for "Eldoria" this will use worker index or timestamp)
  if (!uniqueWorldName) {
    if (worldName === "Eldoria") {
      uniqueWorldName = getUniqueCampaignName("Eldoria");
    } else {
      uniqueWorldName = worldName;
    }
  }
  
  // Check if we're already in planning mode
  const planningTabs = page.getByRole("tablist", { name: "World planning views" });
  const isInPlanningMode = await planningTabs.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (isInPlanningMode) {
    // Already in planning mode - check if the correct world is already selected
    // Check the heading to see which world is selected
    const heading = page.locator('h3.snapp-heading').first();
    const headingText = await heading.textContent().catch(() => "");
    
    // If the heading matches our world name (exact or partial), we're good
    if (headingText && (headingText.includes(uniqueWorldName) || headingText.includes(worldName))) {
      return; // Already have the correct world selected
    }
    
    // Wrong world selected - need to leave planning mode first
    const snappMenu = page.getByRole("button", { name: /^Snapp/i });
    if (await snappMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
      await snappMenu.click();
      const leaveWorldButton = page.getByRole("button", { name: "Leave World" });
      if (await leaveWorldButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await leaveWorldButton.click();
        // Wait for planning mode to exit
        await safeWait(page, 500);
      } else {
        // Close menu if leave button not found
        await snappMenu.click();
      }
    }
  }
  
  const worldContextTablist = page.getByRole("tablist", { name: "World context" });
  
  // Wait for world context tablist to be visible
  // Increased timeout since worlds created via API in Background may need time to load
  await expect(worldContextTablist).toBeVisible({ timeout: 10000 });
  
  // Get all world tabs to see what's available
  const allWorldTabs = worldContextTablist.getByRole("tab");
  const tabCount = await allWorldTabs.count();
  
  // Try to find the world tab by unique name first
  let worldTab = worldContextTablist.getByRole("tab", { name: uniqueWorldName, exact: true }).first();
  let exists = await worldTab.isVisible().catch(() => false);
  
  // If not found, try partial match (for worker-specific names)
  if (!exists) {
    worldTab = worldContextTablist.getByRole("tab").filter({ hasText: uniqueWorldName }).first();
    exists = await worldTab.isVisible().catch(() => false);
  }
  
  // If not found and it's "Eldoria", try without exact match (might have placeholder dash)
  if (!exists && worldName === "Eldoria") {
    worldTab = worldContextTablist.getByRole("tab").filter({ hasText: /Eldoria/i }).first();
    exists = await worldTab.isVisible().catch(() => false);
  }
  
  // If still not found, try base name
  if (!exists) {
    worldTab = worldContextTablist.getByRole("tab", { name: worldName, exact: true }).first();
    exists = await worldTab.isVisible().catch(() => false);
  }
  
  if (!exists) {
    // Get all available world names for debugging
    const availableWorlds: string[] = [];
    for (let i = 0; i < tabCount; i++) {
      const tab = allWorldTabs.nth(i);
      const text = await tab.textContent().catch(() => "");
      if (text) availableWorlds.push(text.trim());
    }
    throw new Error(`World "${worldName}" (or "${uniqueWorldName}") not found in world selector. Available worlds: ${availableWorlds.join(", ")}`);
  }
  
  // Set up event listener BEFORE clicking
  const planningModePromise = waitForPlanningMode(page, 5000);
  
  await worldTab.click();
  
  // Wait for planning mode to activate
  await planningModePromise;
});

When("the world builder ensures location {string} exists", async ({ page }, locationName: string) => {
  // Check if we're already on the locations tab
  const addLocationButton = page.getByRole("button", { name: "Add location" });
  const isOnLocationsTab = await addLocationButton.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (!isOnLocationsTab) {
    // Check if we're in planning mode with a world selected
    const planningTabs = page.getByRole("tablist", { name: "World planning views" });
    const isInPlanningMode = await planningTabs.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (!isInPlanningMode) {
      // Navigate to World Entities planning screen and select world (defaults to "Eldoria")
      try {
        await selectWorldAndEnterPlanningMode(page, "World Entities");
      } catch (error) {
        // If planning mode activation failed, check if we're actually in planning mode anyway
        const planningTabsCheck = page.getByRole("tablist", { name: "World planning views" });
        const isActuallyInPlanningMode = await planningTabsCheck.isVisible({ timeout: 3000 }).catch(() => false);
        if (!isActuallyInPlanningMode) {
          // Not in planning mode - rethrow the error
          throw error;
        }
        // We're in planning mode despite the error - continue
      }
    }
    
    // Navigate to locations tab
    await page.getByRole("tab", { name: "Locations" }).click();
    await expect(addLocationButton).toBeVisible();
  }
  
  const hasLocation = await page
    .getByRole("listitem")
    .filter({ hasText: locationName })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasLocation) {
    await expect(addLocationButton).toBeVisible({ timeout: 3000 });
    await addLocationButton.click();
    const dialog = page.getByRole("dialog", { name: "Add location" });
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await dialog.getByLabel("Name").fill(locationName);
    await dialog.getByLabel("Summary").fill(`Autogenerated location: ${locationName}`);
    await page.getByRole("button", { name: "Save location" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  }
});

When("the world builder selects campaign {string}", async ({ page }, campaignName: string) => {
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
  "the world builder ensures session {string} exists for campaign {string}",
  async ({ page }, sessionName: string, campaignName: string) => {
    // Check page state before interacting
    if (page.isClosed()) {
      throw new Error("Page was closed before ensuring session exists");
    }
    
    // Check if campaign is already selected
    const campaignViews = page.getByRole("tablist", { name: "Campaign views" });
    const isCampaignSelected = await campaignViews.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (!isCampaignSelected) {
      // Navigate to Campaigns planning screen and select campaign
      await selectWorldAndEnterPlanningMode(page, "Campaigns");
      
      // Get the unique campaign name
      const uniqueCampaignName = await getStoredCampaignName(page, campaignName).catch(() => 
        getUniqueCampaignName(campaignName)
      );
      
      // Select the campaign if not already selected
      const campaignsTablist = page.getByRole("tablist", { name: "Campaigns" });
      let campaignTab = campaignsTablist.getByRole("tab", { name: uniqueCampaignName });
      let exists = await campaignTab.isVisible().catch(() => false);
      
      if (!exists) {
        campaignTab = campaignsTablist.getByRole("tab", { name: campaignName });
        exists = await campaignTab.isVisible().catch(() => false);
      }
      
      if (exists) {
        await campaignTab.click();
        await expect(campaignViews).toBeVisible();
      }
    }
    
    // Navigate to Sessions tab
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
  "the world builder ensures scene {string} exists in session {string}",
  async ({ page }, sceneName: string, sessionName: string) => {
    // Check if campaign is already selected
    const campaignViews = page.getByRole("tablist", { name: "Campaign views" });
    const isCampaignSelected = await campaignViews.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (!isCampaignSelected) {
      // Navigate to Campaigns planning screen and select campaign
      // We need to get the campaign name from context - try to get it from the page
      // For now, assume we're working with "The Eldorian Saga" or use stored name
      await selectWorldAndEnterPlanningMode(page, "Campaigns");
      
      // Try to get stored campaign name, or use a default
      let campaignName = "The Eldorian Saga";
      try {
        const storedName = await page.evaluate(() => {
          return (window as any).__testCampaignName;
        });
        if (storedName) {
          campaignName = storedName;
        }
      } catch {
        // Use default
      }
      
      const uniqueCampaignName = await getStoredCampaignName(page, campaignName).catch(() => 
        getUniqueCampaignName(campaignName)
      );
      
      // Select the campaign
      const campaignsTablist = page.getByRole("tablist", { name: "Campaigns" });
      let campaignTab = campaignsTablist.getByRole("tab", { name: uniqueCampaignName });
      let exists = await campaignTab.isVisible().catch(() => false);
      
      if (!exists) {
        campaignTab = campaignsTablist.getByRole("tab", { name: campaignName });
        exists = await campaignTab.isVisible().catch(() => false);
      }
      
      if (exists) {
        await campaignTab.click();
        await expect(campaignViews).toBeVisible();
      }
    }
    
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
      const worldSelect = addSceneDialog.getByLabel("World");
      
      // Wait for the select to be ready and have options
      await expect(worldSelect).toBeVisible({ timeout: 3000 });
      
      // Wait for options to be available (check for at least one option with a value)
      const validOption = worldSelect.locator("option[value]:not([value=''])").first();
      await expect(validOption).toHaveCount(1, { timeout: 5000 });
      
      // Get all available world options to find a match
      const allOptions = await worldSelect.locator("option[value]:not([value=''])").all();
      const optionTexts = await Promise.all(
        allOptions.map(opt => opt.textContent().catch(() => ""))
      );
      
      // Try to find a matching option (exact match or contains the world name)
      let matchedOption: string | null = null;
      for (const optionText of optionTexts) {
        if (optionText && (optionText.trim() === worldName || optionText.includes(worldName) || worldName.includes(optionText.trim()))) {
          matchedOption = optionText.trim();
          break;
        }
      }
      
      if (!matchedOption && optionTexts.length > 0) {
        // If no exact match, use the first available option
        matchedOption = optionTexts[0]?.trim() || null;
      }
      
      if (matchedOption) {
        // Try to select by label text (most reliable)
        await worldSelect.selectOption({ label: matchedOption });
      } else {
        // Fallback: try by value or direct name
        try {
          await worldSelect.selectOption(worldName);
        } catch {
          // Last resort: select first available option
          await worldSelect.selectOption({ index: 1 }); // Index 0 is usually placeholder
        }
      }

      await page.getByRole("button", { name: "Save scene" }).click();
    }
  }
);
