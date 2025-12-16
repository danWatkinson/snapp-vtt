import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("World builder can add an Event to a World via popup", async ({ page }) => {
  await loginAsAdmin(page);

  // Switch to World tab
  await page.getByRole("tab", { name: "World" }).click();

  // Ensure Eldoria exists (create if needed)
  const hasEldoriaTab = await page
    .getByRole("tab", { name: "Eldoria" })
    .isVisible()
    .catch(() => false);

  if (!hasEldoriaTab) {
    await page.getByRole("button", { name: "Create world" }).click();
    await page.getByLabel("World name").fill("Eldoria");
    await page.getByLabel("Description").fill("A high-fantasy realm.");
    await page.getByRole("button", { name: "Save world" }).click();

    // Wait for either success status or error message
    await Promise.race([
      page.getByTestId("status-message").waitFor({ timeout: 5000 }).catch(() => null),
      page.getByTestId("error-message").waitFor({ timeout: 5000 }).catch(() => null)
    ]);

    // Check for errors - if it's "already exists", that's fine, just verify it's in the list
    const errorMessage = await page.getByTestId("error-message").isVisible().catch(() => false);
    if (errorMessage) {
      const errorText = await page.getByTestId("error-message").textContent() ?? "";
      // If world already exists, just verify it's in the list
      if (errorText.includes("already exists")) {
        await expect(
          page.getByRole("tab", { name: "Eldoria" })
        ).toBeVisible({ timeout: 5000 });
      } else {
        throw new Error(`World creation failed: ${errorText}`);
      }
    } else {
      // No error, wait for world tab to appear
      await expect(
        page.getByRole("tab", { name: "Eldoria" })
      ).toBeVisible({ timeout: 10000 });
    }
  }

  // Select Eldoria to open its entity view
  await page.getByRole("tab", { name: "Eldoria" }).click();

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

