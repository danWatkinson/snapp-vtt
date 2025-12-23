import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { ensureModeSelectorVisible, waitForWorldCreated, waitForError, waitForModalClose, closeModalIfOpen, handleAlreadyExistsError } from "../helpers";

const { Then, When } = createBdd();

Then("the world tab is not visible", async ({ page }) => {
  await expect(page.getByRole("tab", { name: "World" })).not.toBeVisible();
});

When('the admin creates a world named "Authenticated Test World"', async ({ page }) => {
  const worldName = "Authenticated Test World";
  
  await ensureModeSelectorVisible(page);

  const hasWorld = await page
    .getByText(worldName)
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasWorld) {
    await page.getByRole("button", { name: /Snapp/i }).click();
    await page.getByRole("button", { name: "Create world" }).click();
    await expect(page.getByRole("dialog", { name: /create world/i })).toBeVisible();

    await page.getByLabel("World name").fill(worldName);
    await page.getByLabel("Description").fill("A test world created by authenticated user");
    
    // Set up event listeners BEFORE clicking submit
    // Reduced timeout from 10000ms to 5000ms for better performance
    const worldCreatedPromise = waitForWorldCreated(page, worldName, 5000);
    const errorPromise = waitForError(page, undefined, 5000).catch(() => null);
    
    await page.getByRole("button", { name: "Save world" }).click();

    // Wait for either world creation or error
    try {
      await Promise.race([
        worldCreatedPromise,
        errorPromise.then(async (errorMsg) => {
          if (errorMsg) {
            // Handle "already exists" errors gracefully
            await handleAlreadyExistsError(page, errorMsg, "world", /create world/i);
          }
        })
      ]);
      // Success - world was created or error was handled
    } catch (error: unknown) {
      // If error doesn't include "already exists", close modal and rethrow
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage?.includes("already exists")) {
        await closeModalIfOpen(page, "world", /create world/i);
        throw error;
      }
    }
  }
});

Then('the world "Authenticated Test World" appears in the worlds list', async ({ page }) => {
  // The world should appear in the World context selector (tablist)
  const worldContextTablist = page.getByRole("tablist", { name: "World context" });
  await expect(
    worldContextTablist.getByRole("tab", { name: "Authenticated Test World" })
  ).toBeVisible({ timeout: 3000 });
});
