import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("World builder can add a Location to a World via popup", async ({ page }) => {
  await loginAsAdmin(page);

  // Go to World tab
  await page.getByRole("tab", { name: "World" }).click();

  // Ensure we have a world called Eldoria – create it if needed.
  const hasEldoriaTab = await page
    .getByRole("tab", { name: "Eldoria" })
    .isVisible()
    .catch(() => false);

  if (!hasEldoriaTab) {
    await page.getByRole("button", { name: "Create world" }).click();
    await expect(
      page.getByRole("dialog", { name: "Create world" })
    ).toBeVisible();

    await page.getByLabel("World name").fill("Eldoria");
    await page
      .getByLabel("Description")
      .fill("A high-fantasy realm of magic and mystery.");

    await page.getByRole("button", { name: "Save world" }).click();
    
    // Wait for world tab to appear before proceeding
    await expect(
      page.getByRole("tab", { name: "Eldoria" })
    ).toBeVisible({ timeout: 10000 });
  }

  // Select Eldoria to open its details / entities view
  await page.getByRole("tab", { name: "Eldoria" }).click();

  // Switch to Locations tab (default is "All" which doesn't show Add button)
  await page.getByRole("tab", { name: "Locations" }).click();

  // Wait for the entities section to load (check for Add location button)
  await expect(
    page.getByRole("button", { name: "Add location" })
  ).toBeVisible();

  // Check if Whispering Woods already exists (from previous test run)
  const hasLocation = await page
    .getByRole("listitem")
    .filter({ hasText: "Whispering Woods" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasLocation) {
    // Add a location via popup
    await page.getByRole("button", { name: "Add location" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add location" })
    ).toBeVisible();

    await page.getByLabel("Location name").fill("Whispering Woods");
    await page
      .getByLabel("Summary")
      .fill("An ancient forest filled with secret paths and spirits.");

    await page.getByRole("button", { name: "Save location" }).click();
  }

  // Whispering Woods appears in the list for Eldoria
  await expect(
    page.getByRole("listitem").filter({ hasText: "Whispering Woods" }).first()
  ).toBeVisible();
});


