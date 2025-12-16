import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("Game master can add Events to a Story Arc", async ({ page }) => {
  await loginAsAdmin(page);

  // Go to Campaigns tab
  await page.getByRole("tab", { name: "Campaigns" }).click();

  // Ensure "Rise of the Dragon King" campaign exists
  const hasCampaignTab = await page
    .getByRole("tab", { name: "Rise of the Dragon King" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasCampaignTab) {
    await page.getByRole("button", { name: "Create campaign" }).click();
    await page.getByLabel("Campaign name").fill("Rise of the Dragon King");
    await page
      .getByLabel("Summary")
      .fill("A long-running campaign about ancient draconic power returning.");
    await page.getByRole("button", { name: "Save campaign" }).click();
    
    await expect(
      page.getByRole("tab", { name: "Rise of the Dragon King" }).first()
    ).toBeVisible();
  }

  // Select campaign and open story arcs view via nested tabs
  await page.getByRole("tab", { name: "Rise of the Dragon King" }).first().click();
  await page.getByRole("tab", { name: "Story arcs" }).click();

  // Wait for the story arcs section to load
  await expect(
    page.getByRole("button", { name: "Add story arc" })
  ).toBeVisible();

  // Ensure "The Ancient Prophecy" story arc exists
  const hasStoryArc = await page
    .getByRole("listitem")
    .filter({ hasText: "The Ancient Prophecy" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasStoryArc) {
    await page.getByRole("button", { name: "Add story arc" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add story arc" })
    ).toBeVisible();

    await page.getByLabel("Story arc name").fill("The Ancient Prophecy");
    await page
      .getByLabel("Summary")
      .fill("An ancient prophecy foretells the return of the dragon king.");
    await page.getByRole("button", { name: "Save story arc" }).click();
    
    // Wait for either success status or error message
    await Promise.race([
      page.getByTestId("status-message").waitFor({ timeout: 5000 }).catch(() => null),
      page.getByTestId("error-message").waitFor({ timeout: 5000 }).catch(() => null)
    ]);
    
    // If there's an error, fail the test
    const errorMessage = await page.getByTestId("error-message").isVisible().catch(() => false);
    if (errorMessage) {
      const errorText = await page.getByTestId("error-message").textContent() ?? "";
      throw new Error(`Story arc creation failed: ${errorText}`);
    }
  }

  // Click on the story arc to view its events
  await page
    .getByRole("listitem")
    .filter({ hasText: "The Ancient Prophecy" })
    .first()
    .getByRole("button", { name: "View events" })
    .click();

  // Wait for the events section to load
  await expect(
    page.getByRole("button", { name: "Add event" })
  ).toBeVisible();

  // Ensure we have a world with an event
  await page.getByRole("tab", { name: "World" }).click();
  
  // Wait for worlds section to load
  await Promise.race([
    page.getByRole("button", { name: "Create world" }).waitFor().catch(() => null),
    page.getByText("No worlds have been created yet.").waitFor().catch(() => null),
    page.getByRole("tab").first().waitFor().catch(() => null)
  ]);
  
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
      // Wait a bit for the worlds tab row to update after the error
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

  // Select Eldoria's entities and add an event if needed
  await page.getByRole("tab", { name: "Eldoria" }).click();

  // Switch to Events tab
  await page.getByRole("tab", { name: "Events" }).click();

  // Check if "The Prophecy Revealed" event exists
  const hasEvent = await page
    .getByRole("listitem")
    .filter({ hasText: "The Prophecy Revealed" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasEvent) {
    await page.getByRole("button", { name: "Add event" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add event" })
    ).toBeVisible();

    await page.getByLabel("Event name").fill("The Prophecy Revealed");
    await page
      .getByLabel("Summary")
      .fill("The ancient prophecy is discovered in a hidden temple.");
    await page.getByRole("button", { name: "Save event" }).click();
  }

  // Go back to Campaigns tab and story arcs view via nested tabs
  await page.getByRole("tab", { name: "Campaigns" }).click();
  await page.getByRole("tab", { name: "Rise of the Dragon King" }).first().click();
  await page.getByRole("tab", { name: "Story arcs" }).click();
  
  // Click on the story arc to view its events
  await page
    .getByRole("listitem")
    .filter({ hasText: "The Ancient Prophecy" })
    .first()
    .getByRole("button", { name: "View events" })
    .click();

  // Check if "The Prophecy Revealed" is already in the story arc
  const hasEventInArc = await page
    .getByRole("listitem")
    .filter({ hasText: "The Prophecy Revealed" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasEventInArc) {
    // Add the event to the story arc
    await page.getByRole("button", { name: "Add event" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add event to story arc" })
    ).toBeVisible();

    // Select existing event from dropdown
    const addToArcDialog = page.getByRole("dialog", { name: "Add event to story arc" });
    await addToArcDialog.getByLabel("Event").selectOption("The Prophecy Revealed");
    await addToArcDialog.getByRole("button", { name: "Save" }).click();
  }

  // Event appears in the story arc's events list
  await expect(
    page.getByRole("listitem").filter({ hasText: "The Prophecy Revealed" }).first()
  ).toBeVisible({ timeout: 10000 });
});

