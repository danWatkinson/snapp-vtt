import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("World builder can add beginning and ending timestamps to Events", async ({
  page
}) => {
  await loginAsAdmin(page);

  // Go to World tab
  await page.getByRole("tab", { name: "World" }).click();

  // Ensure Eldoria world exists
  const hasEldoriaTab = await page
    .getByRole("tab", { name: "Eldoria" })
    .isVisible()
    .catch(() => false);

  if (!hasEldoriaTab) {
    await page.getByRole("button", { name: "Create world" }).click();
    await page.getByLabel("World name").fill("Eldoria");
    await page.getByLabel("Description").fill("A high-fantasy realm.");
    await page.getByRole("button", { name: "Save world" }).click();

    // Wait for world to appear
    await Promise.race([
      page.getByTestId("status-message").waitFor({ timeout: 5000 }).catch(() => null),
      page.getByTestId("error-message").waitFor({ timeout: 5000 }).catch(() => null)
    ]);

    const errorMessage = await page.getByTestId("error-message").isVisible().catch(() => false);
    if (errorMessage) {
      const errorText = await page.getByTestId("error-message").textContent() ?? "";
      if (!errorText.includes("already exists")) {
        throw new Error(`World creation failed: ${errorText}`);
      }
      await page.waitForTimeout(500);
      await expect(
        page.getByRole("tab", { name: "Eldoria" })
      ).toBeVisible({ timeout: 10000 });
    } else {
      await expect(
        page.getByRole("tab", { name: "Eldoria" })
      ).toBeVisible({ timeout: 10000 });
    }
  }

  // Select Eldoria to open its entities
  await page.getByRole("tab", { name: "Eldoria" }).click();

  // Switch to Events tab
  await page.getByRole("tab", { name: "Events" }).click();

  // Check if "The Great War" event already exists
  const hasEvent = await page
    .getByRole("listitem")
    .filter({ hasText: "The Great War" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasEvent) {
    // Add an event with timestamps
    await page.getByRole("button", { name: "Add event" }).click();
    await expect(page.getByRole("dialog", { name: "Add event" })).toBeVisible();

    await page.getByLabel("Event name").fill("The Great War");
    await page
      .getByLabel("Summary")
      .fill("A massive conflict that reshaped the continent.");

    // Set beginning timestamp (1 year ago)
    const beginningDate = new Date();
    beginningDate.setFullYear(beginningDate.getFullYear() - 1);
    await page
      .getByLabel("Beginning timestamp")
      .fill(beginningDate.toISOString().slice(0, 16));

    // Set ending timestamp (6 months ago)
    const endingDate = new Date();
    endingDate.setMonth(endingDate.getMonth() - 6);
    await page
      .getByLabel("Ending timestamp")
      .fill(endingDate.toISOString().slice(0, 16));

    await page.getByRole("button", { name: "Save event" }).click();
  }

  // Event appears in the list
  await expect(
    page.getByRole("listitem").filter({ hasText: "The Great War" }).first()
  ).toBeVisible({ timeout: 10000 });
});

