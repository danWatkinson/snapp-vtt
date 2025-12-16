import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("World builder can create a world via popup in the World tab", async ({ page }) => {
  await loginAsAdmin(page);

  // Switch to World tab
  await page.getByRole("tab", { name: "World" }).click();

  // If Eldoria already exists (from a prior test run), don't recreate it.
  const hasEldoriaTab = await page
    .getByRole("tab", { name: "Eldoria" })
    .isVisible()
    .catch(() => false);

  if (hasEldoriaTab) {
    await expect(page.getByRole("tab", { name: "Eldoria" })).toBeVisible();
    return;
  }

  // Open create world popup
  await page.getByRole("button", { name: "Create world" }).click();
  await expect(
    page.getByRole("dialog", { name: "Create world" })
  ).toBeVisible();

  // Fill in world details
  await page.getByLabel("World name").fill("Eldoria");
  await page.getByLabel("Description").fill("A high-fantasy realm of magic.");

  // Submit and see world appear in list
  await page.getByRole("button", { name: "Save world" }).click();

  // Wait for either success status or error message
  await Promise.race([
    page.getByTestId("status-message").waitFor({ timeout: 5000 }).catch(() => null),
    page.getByTestId("error-message").waitFor({ timeout: 5000 }).catch(() => null)
  ]);

  // Check for errors - if it's "already exists", that's fine, just verify it's present
  const errorMessage = await page.getByTestId("error-message").isVisible().catch(() => false);
  if (errorMessage) {
    const errorText = await page.getByTestId("error-message").textContent() ?? "";
    // If world already exists, reload world tabs and verify we have an Eldoria tab
    if (errorText.includes("already exists")) {
      // Wait a bit for the worlds tabs to update after the error
      await page.waitForTimeout(500);
      await expect(
        page.getByRole("tab", { name: "Eldoria" })
      ).toBeVisible({ timeout: 10000 });
      return;
    }
    throw new Error(`World creation failed: ${errorText}`);
  }

  // Wait for world to appear as a tab
  await expect(
    page.getByRole("tab", { name: "Eldoria" })
  ).toBeVisible({ timeout: 10000 });
});


