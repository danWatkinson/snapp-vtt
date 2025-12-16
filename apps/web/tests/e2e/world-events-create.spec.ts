import { test, expect } from "@playwright/test";
import { loginAsAdmin, selectWorldAndEnterPlanningMode } from "./helpers";

test("World builder can add an Event to a World via popup", async ({ page }) => {
  await loginAsAdmin(page);

  // Ensure World planning UI is active (ModeSelector + WorldTab mounted)
  await selectWorldAndEnterPlanningMode(page, "World Entities");

  // Ensure Eldoria exists (create if needed) - check via world context selector
  const worldContextTablist = page.getByRole("tablist", { name: "World context" });
  const hasEldoriaContextTab = await worldContextTablist
    .getByRole("tab", { name: "Eldoria" })
    .isVisible()
    .catch(() => false);

  if (!hasEldoriaContextTab) {
    await page.getByRole("button", { name: "Create world" }).click();
    await page.getByLabel("World name").fill("Eldoria");
    await page.getByLabel("Description").fill("A high-fantasy realm.");
    await page.getByRole("button", { name: "Save world" }).click();
    
    // Wait for modal to close (success) or error message
    await Promise.race([
      page.getByRole("dialog", { name: /create world/i }).waitFor({ state: "hidden", timeout: 5000 }).catch(() => null),
      page.getByTestId("error-message").waitFor({ timeout: 5000 }).catch(() => null)
    ]);

    // Check for errors - if it's "already exists", that's fine, just verify it's in the list
    const errorMessage = await page.getByTestId("error-message").isVisible().catch(() => false);
    if (errorMessage) {
      const errorText = await page.getByTestId("error-message").textContent() ?? "";
      // If world already exists, just verify it's in the world context selector
      if (errorText.includes("already exists")) {
        await expect(
          worldContextTablist.getByRole("tab", { name: "Eldoria" })
        ).toBeVisible({ timeout: 5000 });
      } else {
        throw new Error(`World creation failed: ${errorText}`);
      }
    } else {
      // No error, wait for world context tab to appear
      await expect(
        worldContextTablist.getByRole("tab", { name: "Eldoria" })
      ).toBeVisible({ timeout: 10000 });
    }
  }

  // Select Eldoria in the world context selector to drive planning mode
  await worldContextTablist.getByRole("tab", { name: "Eldoria" }).click();

  // Switch to Events tab
  await page.getByRole("tab", { name: "Events" }).click();

  // Wait for the entities section to load (check for Add event button)
  await expect(
    page.getByRole("button", { name: "Add event" })
  ).toBeVisible();

  // Check if "The Great Awakening" already exists (from previous test run)
  const hasEvent = await page
    .getByRole("listitem")
    .filter({ hasText: "The Great Awakening" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasEvent) {
    // Add an event via popup
    await page.getByRole("button", { name: "Add event" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add event" })
    ).toBeVisible();

    await page.getByLabel("Event name").fill("The Great Awakening");
    await page.getByLabel("Summary").fill("Ancient dragons awaken from their slumber.");
    await page.getByRole("button", { name: "Save event" }).click();
  }

  // Event appears in the list
  await expect(
    page.getByRole("listitem").filter({ hasText: "The Great Awakening" }).first()
  ).toBeVisible();
});

