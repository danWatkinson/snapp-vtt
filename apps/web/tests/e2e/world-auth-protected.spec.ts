import { test, expect } from "@playwright/test";
import { loginAsAdmin, selectWorldAndEnterPlanningMode } from "./helpers";

test("World creation requires authentication", async ({ page }) => {
  await page.goto("/");

  // Should only see splash/login entry point, not application tabs
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "World" })).not.toBeVisible();
  
  // Cannot access world creation without logging in
  // This test verifies that unauthenticated users cannot see application content
});

test("Authenticated user with gm role can create a world", async ({ page }) => {
  await loginAsAdmin(page);

  // Enter World planning context (ensures ModeSelector + WorldTab are active)
  await selectWorldAndEnterPlanningMode(page, "World Entities");

  // Create a world via the ModeSelector / World create dialog
  const worldName = "Authenticated Test World";
  const hasWorld = await page
    .getByText(worldName)
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasWorld) {
    // Open Create world via the Snapp menu in the banner
    await page.getByRole("button", { name: /Snapp/i }).click();
    await page.getByRole("button", { name: "Create world" }).click();
    await expect(page.getByRole("dialog", { name: /create world/i })).toBeVisible();
    
    await page.getByLabel("World name").fill(worldName);
    await page.getByLabel("Description").fill("A test world created by authenticated user");
    await page.getByRole("button", { name: "Save world" }).click();

    // Wait a moment for the operation to complete
    await page.waitForTimeout(2000);
    
    // Check if there's an error message
    const errorVisible = await page.getByTestId("error-message").isVisible().catch(() => false);
    if (errorVisible) {
      const errorText = await page.getByTestId("error-message").textContent();
      if (errorText && errorText.includes("already exists")) {
        // "already exists" is acceptable - close the modal and continue
        const cancelButton = page
          .getByRole("dialog", { name: /create world/i })
          .getByRole("button", { name: /cancel/i });
        if (await cancelButton.isVisible().catch(() => false)) {
          await cancelButton.click();
        } else {
          await page.keyboard.press("Escape");
        }
        await expect(page.getByRole("dialog", { name: /create world/i })).not.toBeVisible({ timeout: 2000 });
      } else {
        throw new Error(`World creation failed with error: ${errorText}`);
      }
    } else {
      // No error - wait for modal to close (success case)
      await expect(page.getByRole("dialog", { name: /create world/i })).not.toBeVisible({
        timeout: 8000
      });
      
      // Success is verified by modal closing and world appearing in list
    }
    // The real verification is that the world appears in the list below
  }

  // Verify world appears in list
  await expect(
    page.getByText(worldName).first()
  ).toBeVisible({ timeout: 5000 });
});
