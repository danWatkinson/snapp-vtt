import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { getStoredWorldName } from "../helpers";
import { safeWait } from "../helpers/utils";
// Note: "the admin navigates to the Campaigns planning screen" and "the campaign Rise of the Dragon King exists" 
// are defined in campaigns-create.steps.ts

const { When, Then } = createBdd();

When('session "Session 1" exists in the campaign', async ({ page }) => {
  const hasSession = await page
    .getByRole("listitem")
    .filter({ hasText: "Session 1" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasSession) {
    await expect(page.getByRole("button", { name: "Add session" })).toBeVisible();
    await page.getByRole("button", { name: "Add session" }).click();
    await page.getByLabel("Session name").fill("Session 1");
    await page.getByRole("button", { name: "Save session" }).click();

    await expect(
      page.getByRole("listitem").filter({ hasText: "Session 1" }).first()
    ).toBeVisible();
  }
});

When('the admin views scenes for session "Session 1"', async ({ page }) => {
  await page
    .getByRole("tablist", { name: "Campaign views" })
    .getByRole("tab", { name: "Sessions" })
    .click();

  await page
    .getByRole("listitem")
    .filter({ hasText: "Session 1" })
    .first()
    .getByRole("button", { name: "View scenes" })
    .click();

  await expect(page.getByRole("button", { name: "Add scene" })).toBeVisible();
});

When('the admin ensures scene "The Throne Room" exists in the session', async ({ page }) => {
  const hasScene = await page
    .getByRole("listitem")
    .filter({ hasText: "The Throne Room" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasScene) {
    await page.getByRole("button", { name: "Add scene" }).click();
    await expect(page.getByRole("dialog", { name: "Add scene" })).toBeVisible();

    const addSceneDialog = page.getByRole("dialog", { name: "Add scene" });

    await addSceneDialog.getByLabel("Scene name").fill("The Throne Room");
    await addSceneDialog.getByLabel("Summary", { exact: true }).fill("A tense negotiation with the king.");

    // Get the unique world name (stored from earlier steps)
    const uniqueWorldName = await getStoredWorldName(page, "Eldoria");
    const worldSelect = addSceneDialog.getByLabel("World");
    
    // Wait for the dropdown to be populated with options
    await expect(worldSelect).toBeVisible({ timeout: 3000 });
    
    // Wait for at least one option with a value (not the placeholder) to be available
    // Options in select dropdowns are typically hidden, so check for existence instead of visibility
    const validOption = worldSelect.locator("option[value]:not([value=''])").first();
    await expect(validOption).toHaveCount(1, { timeout: 5000 });
    // Also verify the option has text content
    const optionText = await validOption.textContent({ timeout: 1000 }).catch(() => "");
    if (!optionText || optionText.trim() === "") {
      throw new Error("World dropdown option found but has no text content");
    }
    
    // Get all available world options
    const options = await worldSelect.locator("option").all();
    const optionTexts = await Promise.all(
      options.map(opt => opt.textContent().catch(() => ""))
    );
    
    // Try to find a matching world option
    // First try unique name, then base name, then any world containing "Eldoria"
    let selectedOption: string | null = null;
    
    // Try exact match with unique name
    const uniqueIndex = optionTexts.findIndex(text => text === uniqueWorldName);
    if (uniqueIndex >= 0) {
      const optionValue = await options[uniqueIndex].getAttribute("value");
      if (optionValue) {
        selectedOption = optionValue;
      }
    }
    
    // If no unique match, try base name
    if (!selectedOption) {
      const baseIndex = optionTexts.findIndex(text => text === "Eldoria");
      if (baseIndex >= 0) {
        const optionValue = await options[baseIndex].getAttribute("value");
        if (optionValue) {
          selectedOption = optionValue;
        }
      }
    }
    
    // If still no match, try any world containing "Eldoria"
    if (!selectedOption) {
      const eldoriaIndex = optionTexts.findIndex(text => text?.includes("Eldoria"));
      if (eldoriaIndex >= 0) {
        const optionValue = await options[eldoriaIndex].getAttribute("value");
        if (optionValue) {
          selectedOption = optionValue;
        }
      }
    }
    
    // If we found an option, select it by value
    if (selectedOption) {
      await worldSelect.selectOption(selectedOption);
    } else {
      // Last resort: select the first available option
      if (options.length > 0) {
        const firstValue = await options[0].getAttribute("value");
        if (firstValue) {
          await worldSelect.selectOption(firstValue);
        } else {
          throw new Error(`Could not select world: no options available or no matching world found. Available options: ${optionTexts.join(", ")}`);
        }
      } else {
        throw new Error(`Could not select world: dropdown has no options`);
      }
    }

    await page.getByRole("button", { name: "Save scene" }).click();
    
    // Wait for the dialog to close - check for errors first
    // Wait a bit for any error messages or dialog state changes
    await safeWait(page, 500);
    
    const errorMessage = page.getByTestId("error-message");
    const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasError) {
      const errorText = await errorMessage.textContent();
      throw new Error(`Scene creation failed: ${errorText || "Unknown error"}`);
    }
    
    // Wait for the dialog to close - this indicates successful creation
    await expect(page.getByRole("dialog", { name: "Add scene" })).toBeHidden({ timeout: 10000 });
    
    // Wait for the scene to appear in the list - this ensures the creation actually succeeded
    // and the list has been updated
    await expect(
      page.getByRole("listitem").filter({ hasText: "The Throne Room" }).first()
    ).toBeVisible({ timeout: 10000 });
  }
});

Then('scene "The Throne Room" appears in the scenes list', async ({ page }) => {
  await expect(
    page.getByRole("listitem").filter({ hasText: "The Throne Room" }).first()
  ).toBeVisible({ timeout: 10000 });
});
