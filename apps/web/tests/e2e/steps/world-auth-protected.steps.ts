import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Then, When } = createBdd();

Then("the world tab is not visible", async ({ page }) => {
  await expect(page.getByRole("tab", { name: "World" })).not.toBeVisible();
});

When('the admin creates a world named "Authenticated Test World"', async ({ page }) => {
  const worldName = "Authenticated Test World";
  
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
    ).toBeVisible({ timeout: 5000 });
  }

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
    await page.getByRole("button", { name: "Save world" }).click();

    await page.waitForTimeout(2000);

    const errorVisible = await page.getByTestId("error-message").isVisible().catch(() => false);
    if (errorVisible) {
      const errorText = await page.getByTestId("error-message").textContent();
      if (errorText && errorText.includes("already exists")) {
        const cancelButton = page
          .getByRole("dialog", { name: /create world/i })
          .getByRole("button", { name: /cancel/i });
        if (await cancelButton.isVisible().catch(() => false)) {
          await cancelButton.click();
        } else {
          await page.keyboard.press("Escape");
        }
        await expect(page.getByRole("dialog", { name: /create world/i })).not.toBeVisible({
          timeout: 2000
        });
      } else {
        throw new Error(`World creation failed with error: ${errorText}`);
      }
    } else {
      await expect(page.getByRole("dialog", { name: /create world/i })).not.toBeVisible({
        timeout: 8000
      });
    }
  }
});

Then('the world "Authenticated Test World" appears in the worlds list', async ({ page }) => {
  await expect(page.getByText("Authenticated Test World").first()).toBeVisible({ timeout: 5000 });
});
