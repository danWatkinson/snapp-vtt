import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { selectWorldAndEnterPlanningMode, ensureModeSelectorVisible } from "../helpers";
// Note: common.steps.ts is automatically loaded by playwright-bdd (no import needed)

const { When, Then } = createBdd();

When('the admin navigates to the "World Entities" planning screen', async ({ page }) => {
  await selectWorldAndEnterPlanningMode(page, "World Entities");
});

When(
  'the admin creates a world named {string} with description {string}',
  async ({ page }, worldName: string, description: string) => {
    await ensureModeSelectorVisible(page);

    // Check if world already exists
    const worldContextTablist = page.getByRole("tablist", { name: "World context" });
    const hasWorld = await worldContextTablist
      .getByRole("tab", { name: worldName })
      .isVisible()
      .catch(() => false);

    if (hasWorld) {
      // World already exists, skip creation
      return;
    }

    // Open create world popup via Snapp menu
    await page.getByRole("button", { name: /^Snapp/i }).click();
    await page.getByRole("button", { name: "Create world" }).click();
    await expect(
      page.getByRole("dialog", { name: "Create world" })
    ).toBeVisible();

    // Fill in world details
    await page.getByLabel("World name").fill(worldName);
    await page.getByLabel("Description").fill(description);

    // Submit
    await page.getByRole("button", { name: "Save world" }).click();

    // Wait for modal to close (success) or error message
    await Promise.race([
      page.getByRole("dialog", { name: "Create world" }).waitFor({ state: "hidden", timeout: 5000 }).catch(() => null),
      page.getByTestId("error-message").waitFor({ timeout: 5000 }).catch(() => null)
    ]);

    // Check for errors - if it's "already exists", that's fine
    const errorMessage = await page.getByTestId("error-message").isVisible().catch(() => false);
    if (errorMessage) {
      const errorText = await page.getByTestId("error-message").textContent() ?? "";
      if (!errorText.includes("already exists")) {
        throw new Error(`World creation failed: ${errorText}`);
      }
    }
  }
);

Then(
  'the UI shows {string} in the world context selector',
  async ({ page }, worldName: string) => {
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

    const worldContextTablist = page.getByRole("tablist", { name: "World context" });
    await expect(
      worldContextTablist.getByRole("tab", { name: worldName })
    ).toBeVisible({ timeout: 10000 });
  }
);
