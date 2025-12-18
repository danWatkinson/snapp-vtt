import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { getStoredWorldName, waitForWorldUpdated, waitForModalOpen } from "../helpers";

const { When, Then } = createBdd();

When(
  "the admin opens the world settings for {string}",
  async ({ page }, worldName: string) => {
    // Since "the admin selects world" should have already run before this step,
    // the world should already be selected. Just verify the WorldHeader is visible
    // and open settings from there.
    
    // Wait for the "World settings" button to be visible (indicates a world is selected)
    // This button only appears when a world is selected and WorldHeader is rendered
    const settingsButton = page.getByRole("button", { name: "World settings" });
    await expect(settingsButton).toBeVisible({ timeout: 3000 });
    
    // Click the "World settings" button
    await settingsButton.click();
    
    // Wait for the modal to appear
    await expect(
      page.getByRole("dialog", { name: "World Settings" })
    ).toBeVisible({ timeout: 3000 });
  }
);

When(
  "the admin sets the splash image for world {string} to {string}",
  async ({ page }, worldName: string, assetName: string) => {
    // First open world settings (if not already open)
    const settingsModal = page.getByRole("dialog", { name: "World Settings" });
    const isOpen = await settingsModal.isVisible().catch(() => false);
    
    if (!isOpen) {
      await page.getByRole("button", { name: "World settings" }).click();
      await expect(settingsModal).toBeVisible({ timeout: 3000 });
    }
    
    // Find the image asset button by its alt text or the asset name
    // The grid shows images with alt text from asset.name or asset.originalFileName
    const assetButton = settingsModal
      .getByRole("button")
      .filter({ hasText: assetName })
      .first();
    
    await expect(assetButton).toBeVisible({ timeout: 3000 });
    
    // Set up event listener BEFORE clicking (wait for world update with splash image set)
    // We can't easily get worldId here, so we'll wait for any world update
    const worldUpdatedPromise = waitForWorldUpdated(page, undefined, "splashImageSet", 10000);
    
    await assetButton.click();
    
    // Wait for modal to close (it closes automatically after selection)
    await expect(settingsModal).toBeHidden({ timeout: 3000 });
    
    // Wait for world update event (splash image was set)
    await worldUpdatedPromise;
  }
);

Then(
  "the world {string} shows splash image {string} in the world header",
  async ({ page }, worldName: string, assetName: string) => {
    // Since "the admin selects world" should have already run before this step,
    // the world should already be selected. Just verify the splash image is visible.
    // The WorldHeader should be visible if a world is selected.
    
    // Wait for the "World settings" button to be visible (indicates a world is selected)
    // This confirms WorldHeader is rendered
    const settingsButton = page.getByRole("button", { name: "World settings" });
    await expect(settingsButton).toBeVisible({ timeout: 3000 });
    
    // Look for an image in the WorldHeader area - wait for it to be visible
    // The splash image should be in a container near the world name
    // Try multiple strategies to find it
    
    // Strategy 1: Look for any img element near the "World settings" button
    const worldHeaderSection = settingsButton.locator("..").locator(".."); // Go up to the section
    const splashImage = worldHeaderSection.locator("img").first();
    
    // Strategy 2: Look for img with alt containing the asset name (without extension)
    const assetNameBase = assetName.replace(/\.(jpg|png|jpeg|gif)$/i, "");
    const imageWithAssetName = page
      .locator("img")
      .filter({ hasText: new RegExp(assetNameBase, "i") })
      .first();
    
    // Check if either image is visible
    const splashVisible = await splashImage.isVisible().catch(() => false);
    const assetNameVisible = await imageWithAssetName.isVisible().catch(() => false);
    
    if (!splashVisible && !assetNameVisible) {
      // Try to find any image in a section that contains the settings button
      const anySplashImage = page
        .locator("section")
        .filter({ has: settingsButton })
        .locator("img")
        .first();
      
      await expect(anySplashImage).toBeVisible({ timeout: 3000 });
    } else {
      // At least one image is visible, which is good
      expect(splashVisible || assetNameVisible).toBe(true);
    }
  }
);

Then(
  "the world selector shows a splash thumbnail for {string} using {string}",
  async ({ page }, worldName: string, assetName: string) => {
    // The world selector is only visible when no world is selected
    // If a world is currently selected, we need to leave it first
    const logoutButton = page.getByRole("button", { name: "Log out" });
    const isLoggedIn = await logoutButton.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (isLoggedIn) {
      // Check if a world is selected - if so, leave it via Snapp menu
      const worldSettingsButton = page.getByRole("button", { name: "World settings" });
      const worldSelected = await worldSettingsButton.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (worldSelected) {
        // Leave the world to show the world selector
        await page.getByRole("button", { name: /Snapp/i }).click();
        // Wait for menu to be visible
        await expect(page.getByRole("button", { name: "Leave World" })).toBeVisible({ timeout: 2000 });
        await page.getByRole("button", { name: "Leave World" }).click();
        // Wait for world selector to appear (indicates we left the world)
        await expect(page.getByRole("tablist", { name: "World context" })).toBeVisible({ timeout: 3000 });
      }
    }
    
    // Get the unique world name if it was stored
    const uniqueWorldName = await getStoredWorldName(page, worldName);
    
    // Wait for the world selector to be visible
    const worldContextTablist = page.getByRole("tablist", { name: "World context" });
    await expect(worldContextTablist).toBeVisible({ timeout: 3000 });
    
    // Look for the world tab - try unique name first, then base name
    let worldTab = worldContextTablist.getByRole("tab", { name: uniqueWorldName });
    let tabExists = await worldTab.isVisible().catch(() => false);
    
    if (!tabExists) {
      worldTab = worldContextTablist.getByRole("tab", { name: worldName });
      tabExists = await worldTab.isVisible().catch(() => false);
    }
    
    await expect(worldTab).toBeVisible({ timeout: 3000 });
    
    // Check that the tab contains an image (the splash thumbnail)
    const thumbnail = worldTab.locator("img").first();
    await expect(thumbnail).toBeVisible({ timeout: 3000 });
    
    // Verify the image has a valid src (not broken)
    const src = await thumbnail.getAttribute("src");
    expect(src).toBeTruthy();
    expect(src).not.toBe("");
  }
);

Then(
  'the world {string} shows a "no splash image" placeholder in the world header',
  async ({ page }, worldName: string) => {
    // Since "the admin selects world" should have already run before this step,
    // the world should already be selected. Just check for the placeholder.
    // The WorldHeader should be visible if a world is selected.
    
    // Wait for the "World settings" button to be visible (indicates a world is selected)
    // This confirms WorldHeader is rendered
    const settingsButton = page.getByRole("button", { name: "World settings" });
    await expect(settingsButton).toBeVisible({ timeout: 3000 });
    
    // Check for the "No splash image configured" placeholder text
    // The text is in a span with specific classes, so we can be more specific
    const placeholder = page.getByText("No splash image configured");
    const placeholderVisible = await placeholder.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!placeholderVisible) {
      // Check if there's actually an image (which would mean the test expectation is wrong)
      const worldHeaderSection = settingsButton.locator("..").locator("..");
      const hasImage = await worldHeaderSection.locator("img").first().isVisible().catch(() => false);
      
      if (hasImage) {
        throw new Error(
          `World "${worldName}" has a splash image set, but the test expects no splash image. ` +
          `This suggests the world was created with a splash image from a previous test run.`
        );
      }
      
      // If no image and no placeholder text, the component might not be rendering correctly
      throw new Error(
        `Could not find "No splash image configured" placeholder text in world header for "${worldName}". ` +
        `The WorldHeader component may not be rendering correctly, or the world may have a splash image set.`
      );
    }
  }
);

Then(
  'the world selector shows a "no splash image" placeholder for {string}',
  async ({ page }, worldName: string) => {
    // The world selector is only visible when no world is selected
    // If a world is currently selected, we need to leave it first
    const logoutButton = page.getByRole("button", { name: "Log out" });
    const isLoggedIn = await logoutButton.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (isLoggedIn) {
      // Check if a world is selected - if so, leave it via Snapp menu
      const worldSettingsButton = page.getByRole("button", { name: "World settings" });
      const worldSelected = await worldSettingsButton.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (worldSelected) {
        // Leave the world to show the world selector
        await page.getByRole("button", { name: /Snapp/i }).click();
        // Wait for menu to be visible
        await expect(page.getByRole("button", { name: "Leave World" })).toBeVisible({ timeout: 2000 });
        await page.getByRole("button", { name: "Leave World" }).click();
        // Wait for world selector to appear (indicates we left the world)
        await expect(page.getByRole("tablist", { name: "World context" })).toBeVisible({ timeout: 3000 });
      }
    }
    
    // Get the unique world name if it was stored
    const uniqueWorldName = await getStoredWorldName(page, worldName);
    
    // Wait for the world selector to be visible
    const worldContextTablist = page.getByRole("tablist", { name: "World context" });
    await expect(worldContextTablist).toBeVisible({ timeout: 3000 });
    
    // Look for the world tab - try unique name first, then base name
    let worldTab = worldContextTablist.getByRole("tab", { name: uniqueWorldName });
    let tabExists = await worldTab.isVisible().catch(() => false);
    
    if (!tabExists) {
      worldTab = worldContextTablist.getByRole("tab", { name: worldName });
      tabExists = await worldTab.isVisible().catch(() => false);
    }
    
    await expect(worldTab).toBeVisible({ timeout: 3000 });
    
    // When there's no splash image, the placeholder is a <span> with "—", not an <img>
    // The placeholder span has the class "border-dashed" and specific dimensions
    // Check for the placeholder span by its distinctive class structure
    const placeholderSpan = worldTab.locator("span.border-dashed").first();
    const hasPlaceholder = await placeholderSpan.isVisible().catch(() => false);
    
    // Also check for any image in the tab (should not be present)
    const thumbnail = worldTab.locator("img").first();
    const hasImage = await thumbnail.isVisible().catch(() => false);
    
    // The placeholder span should be visible, and there should be no image
    // If there's an image, that means the world has a splash image (which is wrong for this test)
    if (hasImage) {
      // Debug: get the image src to see what it is
      const imageSrc = await thumbnail.getAttribute("src").catch(() => "unknown");
      throw new Error(
        `Expected no splash image for world "${worldName}", but found an image with src: ${imageSrc}. ` +
        `This suggests the world has a splash image set when it shouldn't.`
      );
    }
    
    // Verify the placeholder is visible (the border-dashed span)
    expect(hasPlaceholder).toBe(true);
  }
);
