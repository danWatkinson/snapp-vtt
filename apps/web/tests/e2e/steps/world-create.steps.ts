import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { selectWorldAndEnterPlanningMode, ensureModeSelectorVisible, waitForModalOpen, waitForWorldCreated, waitForModalClose, closeModalIfOpen, handleAlreadyExistsError, getUniqueCampaignName, getStoredWorldName, safeWait, STABILITY_WAIT_MEDIUM } from "../helpers";
// Note: common.steps.ts is automatically loaded by playwright-bdd (no import needed)

const { When, Then } = createBdd();

When('the admin navigates to the "World Entities" planning screen', async ({ page }) => {
  await selectWorldAndEnterPlanningMode(page, "World Entities");
});

When(
  'the admin creates a world named {string} with description {string}',
  async ({ page }, worldName: string, description: string) => {
    // Navigate to World Entities planning screen if not already there
    const planningTabs = page.getByRole("tablist", { name: "World planning views" });
    const isInPlanningMode = await planningTabs.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (!isInPlanningMode) {
      // Retry logic for planning mode activation
      let planningModeActivated = false;
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await selectWorldAndEnterPlanningMode(page, "World Entities");
          planningModeActivated = true;
          break;
        } catch (error) {
          lastError = error as Error;
          
          // Check if we're actually in planning mode (maybe the event didn't fire)
          const planningTabsCheck = page.getByRole("tablist", { name: "World planning views" });
          const isActuallyInPlanningMode = await planningTabsCheck.isVisible({ timeout: 3000 }).catch(() => false);
          if (isActuallyInPlanningMode) {
            // We're in planning mode despite the error - that's okay
            planningModeActivated = true;
            break;
          }
          
          // If this isn't the last attempt, wait a bit and try again
          if (attempt < 2) {
            await safeWait(page, STABILITY_WAIT_MEDIUM);
          }
        }
      }
      
      if (!planningModeActivated && lastError) {
        throw lastError;
      }
    }
    
    await ensureModeSelectorVisible(page);

    // Make world name unique per worker to avoid conflicts in parallel execution
    const uniqueWorldName = getUniqueCampaignName(worldName);
    
    // Check if world already exists (check for unique name)
    const worldContextTablist = page.getByRole("tablist", { name: "World context" });
    const hasWorld = await worldContextTablist
      .getByRole("tab", { name: uniqueWorldName })
      .isVisible()
      .catch(() => false);

    if (hasWorld) {
      // World already exists, skip creation but store the name for later steps
      await page.evaluate((name) => {
        (window as any).__testWorldName = name;
      }, uniqueWorldName);
      return;
    }

    // Open create world popup via Snapp menu
    await page.getByRole("button", { name: /^Snapp/i }).click();
    await page.getByRole("button", { name: "Create world" }).click();
    
    // Wait for modal to open using transition event
    await waitForModalOpen(page, "world", 5000);

    // Fill in world details
    const nameInput = page.getByLabel("World name");
    const descriptionInput = page.getByLabel("Description");
    
    // Ensure inputs are visible and enabled
    await expect(nameInput).toBeVisible({ timeout: 2000 });
    await expect(descriptionInput).toBeVisible({ timeout: 2000 });
    
    // Clear and fill name (use unique name to avoid conflicts)
    await nameInput.clear();
    await nameInput.fill(uniqueWorldName);
    
    // Verify the name was filled
    const filledName = await nameInput.inputValue();
    if (filledName !== uniqueWorldName) {
      throw new Error(`Failed to fill world name. Expected "${uniqueWorldName}", got "${filledName}"`);
    }
    
    // Store the unique name for later steps to use
    await page.evaluate((name) => {
      (window as any).__testWorldName = name;
    }, uniqueWorldName);
    
    // Clear and fill description
    await descriptionInput.clear();
    await descriptionInput.fill(description);
    
    // Verify the description was filled
    const filledDescription = await descriptionInput.inputValue();
    if (filledDescription !== description) {
      throw new Error(`Failed to fill description. Expected "${description}", got "${filledDescription}"`);
    }
    
    // Set up event listener BEFORE clicking submit
    // This ensures we don't miss the event if it fires quickly
    // Reduced timeout from 10000ms to 5000ms for better performance
    const worldCreatedPromise = waitForWorldCreated(page, uniqueWorldName, 5000);

    // Submit - wait for button to be enabled (indicates form validation passed)
    const saveButton = page.getByRole("button", { name: "Save world" });
    await expect(saveButton).toBeEnabled({ timeout: 2000 });
    
    // Click save button
    await saveButton.click();

    // Wait for world creation event (this fires after API success + state update)
    // The helper includes DOM fallback, so this is more reliable than waiting for modal close
    try {
      await worldCreatedPromise;
      // World was created successfully - event fired
      // Modal should be closed automatically, but if not, close it
      await closeModalIfOpen(page, "world", "Create world");
    } catch (error) {
      // Event didn't fire - check for errors
      const errorMessage = page.getByTestId("error-message");
      const hasError = await errorMessage.isVisible().catch(() => false);
      if (hasError) {
        const errorText = await errorMessage.textContent().catch(() => "") ?? "";
        // Handle "already exists" errors gracefully
        await handleAlreadyExistsError(page, errorText, "world", "Create world");
        return; // World already exists, that's fine
      }
      // No error but event didn't fire - rethrow original error
      throw error;
    }
  }
);

Then(
  'the UI shows {string} in the world context selector',
  async ({ page }, worldName: string) => {
    // Get the unique world name that was stored during creation
    const uniqueWorldName = await getStoredWorldName(page, worldName);
    
    // Check if ModeSelector is visible (if not, we need to leave current world first)
    const modeSelectorVisible = await page
      .getByRole("tablist", { name: "World context" })
      .isVisible()
      .catch(() => false);

    if (!modeSelectorVisible) {
      // A world is currently selected, so we need to leave it first
      await page.getByRole("button", { name: /^Snapp/i }).click();
      await page.getByRole("button", { name: "Leave World" }).click();
      // Wait for ModeSelector to appear
      await expect(
        page.getByRole("tablist", { name: "World context" })
      ).toBeVisible({ timeout: 3000 });
    }

    const worldContextTablist = page.getByRole("tablist", { name: "World context" });
    // Check for the unique world name that was created
    await expect(
      worldContextTablist.getByRole("tab", { name: uniqueWorldName })
    ).toBeVisible({ timeout: 3000 });
  }
);
