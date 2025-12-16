import { test, expect } from "@playwright/test";
import { loginAsAdmin, selectWorldAndEnterPlanningMode } from "./helpers";

test("World builder can view all entities associated with a World", async ({
  page
}) => {
  await loginAsAdmin(page);

  // Ensure World planning UI is active (ModeSelector + WorldTab mounted)
  await selectWorldAndEnterPlanningMode(page, "World Entities");

  // Ensure Eldoria exists - check via world context selector
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

    await Promise.race([
      page.getByTestId("status-message").waitFor({ timeout: 5000 }).catch(() => null),
      page.getByTestId("error-message").waitFor({ timeout: 5000 }).catch(() => null)
    ]);

    const errorMessage = await page.getByTestId("error-message").isVisible().catch(() => false);
    if (errorMessage) {
      const errorText = await page.getByTestId("error-message").textContent() ?? "";
      if (errorText.includes("already exists")) {
        await expect(
          worldContextTablist.getByRole("tab", { name: "Eldoria" })
        ).toBeVisible({ timeout: 5000 });
      } else {
        throw new Error(`World creation failed: ${errorText}`);
      }
    } else {
      await expect(
        worldContextTablist.getByRole("tab", { name: "Eldoria" })
      ).toBeVisible({ timeout: 10000 });
    }
  }

  // Select Eldoria in the world context selector to drive planning mode
  await worldContextTablist.getByRole("tab", { name: "Eldoria" }).click();

  // Switch to "All" tab to see everything
  await page.getByRole("tab", { name: "All" }).click();

  // Verify we can see entities from different types
  // (We'll check for at least one entity type being visible, or a message saying no entities)
  const hasAnyEntities = await page
    .getByRole("listitem")
    .first()
    .isVisible()
    .catch(() => false);

  const hasEmptyMessage = await page
    .getByText("No entities have been added to this world yet.")
    .isVisible()
    .catch(() => false);

  // Either we see entities or an empty message - both are valid
  expect(hasAnyEntities || hasEmptyMessage).toBe(true);

  // If there are entities, verify we can see entity names
  if (hasAnyEntities) {
    // At least one entity should be visible
    await expect(page.getByRole("listitem").first()).toBeVisible();
  }
});

