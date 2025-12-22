import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { createApiClient } from "../helpers/api";
import { isVisibleSafely } from "../helpers/utils";
import type { APIRequestContext } from "@playwright/test";

const { When, Then } = createBdd();

// Note: "world {string} exists and is selected with events tab" is defined in world-events-create.steps.ts
// Note: "the admin ensures location {string} exists" is defined in world-locations-create.steps.ts
// Note: "the admin creates event {string} at location {string}" is defined in world-events-locations.steps.ts

When('the admin links event {string} as sub-event of {string}', async ({ page, request }, subEventName: string, parentEventName: string) => {
  // Wait for page to be ready after any previous operations
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  
  // Check if we need to navigate to the Events tab
  // First, check if the Events tab exists and is visible
  let eventsTab = page.getByRole("tab", { name: "Events" });
  const eventsTabVisible = await eventsTab.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (!eventsTabVisible) {
    // Events tab not visible - might need to wait for page to fully load
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);
    eventsTab = page.getByRole("tab", { name: "Events" });
  }
  
  // Check if we're already on the Events tab
  const addEventButton = page.getByRole("button", { name: "Add event" });
  const isOnEventsTab = await addEventButton.isVisible({ timeout: 3000 }).catch(() => false);
  
  if (!isOnEventsTab) {
    // Wait for the Events tab to be visible before clicking
    await expect(eventsTab).toBeVisible({ timeout: 10000 });
    await eventsTab.click();
    await expect(addEventButton).toBeVisible({ timeout: 10000 });
  }
  
  // Wait for events to be loaded
  await page.waitForTimeout(1000);
  
  // Get all worlds first
  const api = createApiClient(request);
  const adminToken = await api.getAdminToken();
  const worldsResponse = await api.call("world", "GET", "/worlds", { token: adminToken });
  const worlds = (worldsResponse as { worlds?: any[] }).worlds || [];
  
  if (worlds.length === 0) {
    throw new Error("No worlds found. Ensure a world exists before linking events.");
  }
  
  // Try to find events in each world until we find both events
  // This handles cases where we don't know which world is selected
  let parentEvent: any = null;
  let subEvent: any = null;
  let worldId: string | null = null;
  
  for (const world of worlds) {
    const eventsResponse = await api.call("world", "GET", `/worlds/${world.id}/entities?type=event`, { token: adminToken });
    const events = (eventsResponse as { entities?: any[] }).entities || [];
    
    const foundParent = events.find((e: any) => e.name === parentEventName);
    const foundSub = events.find((e: any) => e.name === subEventName);
    
    if (foundParent && foundSub) {
      parentEvent = foundParent;
      subEvent = foundSub;
      worldId = world.id;
      break;
    }
  }
  
  if (!parentEvent || !subEvent || !worldId) {
    throw new Error(
      `Could not find events: parent=${parentEventName}, sub=${subEventName}. ` +
      `Searched ${worlds.length} world(s).`
    );
  }
  
  // Create the relationship via API
  try {
    await api.call("world", "POST", `/worlds/${worldId}/events/${parentEvent.id}/relationships`, {
      token: adminToken,
      body: {
        targetEventId: subEvent.id,
        relationshipType: "contains"
      }
    });
  } catch (error: any) {
    throw new Error(`Failed to create relationship: ${error.message || "Unknown error"}`);
  }
  
  // Wait for the relationship to be reflected in the UI
  // Since we're making API calls directly, the UI won't automatically refresh
  // We need to trigger a refresh by clicking away and back to the Events tab
  await page.waitForTimeout(500);
  
  // Click away from Events tab and back to trigger a refresh
  // First, try clicking on Locations tab (if it exists)
  const locationsTab = page.getByRole("tab", { name: "Locations" });
  const locationsTabVisible = await locationsTab.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (locationsTabVisible) {
    await locationsTab.click();
    await page.waitForTimeout(500);
  }
  
  // Now click back to Events tab to trigger a refresh
  eventsTab = page.getByRole("tab", { name: "Events" });
  await expect(eventsTab).toBeVisible({ timeout: 5000 });
  await eventsTab.click();
  
  // Wait for the Add event button to be visible (indicates tab is loaded)
  await expect(page.getByRole("button", { name: "Add event" })).toBeVisible({ timeout: 5000 });
  
  // Wait a bit more for entities to load
  await page.waitForTimeout(1000);
  
  // The relationship should now be visible after the refresh
  // We don't need to poll here - the Then steps will verify the relationships
});

Then('event {string} shows it has sub-event {string}', async ({ page }, parentEventName: string, subEventName: string) => {
  const parentEventItem = page
    .getByRole("listitem")
    .filter({ hasText: parentEventName })
    .first();
  
  await expect(parentEventItem).toBeVisible();
  
  // Check that the parent event shows the sub-event
  const eventText = await parentEventItem.textContent();
  expect(eventText).toContain("Sub-events:");
  expect(eventText).toContain(subEventName);
});

Then('event {string} shows it is part of {string}', async ({ page }, subEventName: string, parentEventName: string) => {
  // Ensure we're on the Events tab
  const addEventButton = page.getByRole("button", { name: "Add event" });
  const isOnEventsTab = await addEventButton.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (!isOnEventsTab) {
    const eventsTab = page.getByRole("tab", { name: "Events" });
    await expect(eventsTab).toBeVisible({ timeout: 5000 });
    await eventsTab.click();
    await expect(addEventButton).toBeVisible({ timeout: 5000 });
  }
  
  // Wait for entities to be loaded
  await page.waitForTimeout(1000);
  
  // Find the sub-event item more specifically
  // We need to find the list item where the sub-event name appears as the main name (in the font-semibold div)
  // not just anywhere in the text (which might match the parent event's sub-events list)
  const allEventItems = page.getByRole("listitem");
  const itemCount = await allEventItems.count();
  
  let subEventItem = null;
  for (let i = 0; i < itemCount; i++) {
    const item = allEventItems.nth(i);
    const itemText = await item.textContent();
    
    // Check if this item's main name (first line, before any "At:" or "Sub-events:") matches the sub-event name
    // The main name should be in a font-semibold div
    const mainName = await item.locator('.font-semibold').first().textContent().catch(() => null);
    
    if (mainName && mainName.trim() === subEventName) {
      subEventItem = item;
      break;
    }
    
    // Fallback: check if the item starts with the sub-event name (not just contains it)
    if (itemText && itemText.trim().startsWith(subEventName)) {
      // Make sure it's not the parent event (which would have "Sub-events:" in it)
      if (!itemText.includes("Sub-events:")) {
        subEventItem = item;
        break;
      }
    }
  }
  
  if (!subEventItem) {
    throw new Error(`Could not find sub-event item for "${subEventName}"`);
  }
  
  await expect(subEventItem).toBeVisible({ timeout: 5000 });
  
  // Wait for the relationship to appear in the UI
  // Poll for the "Part of:" text to appear (with a reasonable timeout)
  let relationshipVisible = false;
  const maxAttempts = 10; // 5 seconds total
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const eventText = await subEventItem.textContent();
    if (eventText && eventText.includes("Part of:") && eventText.includes(parentEventName)) {
      relationshipVisible = true;
      break;
    }
    if (attempt < maxAttempts - 1) {
      await page.waitForTimeout(500);
    }
  }
  
  if (!relationshipVisible) {
    // If relationship still not visible, log the current state for debugging
    const currentText = await subEventItem.textContent();
    throw new Error(
      `Relationship not visible in UI. ` +
      `Sub-event: ${subEventName}, Parent: ${parentEventName}. ` +
      `Current sub-event text: ${currentText}`
    );
  }
  
  // Verify the relationship is displayed correctly
  const eventText = await subEventItem.textContent();
  expect(eventText).toContain("Part of:");
  expect(eventText).toContain(parentEventName);
});

When('the admin views event {string}', async ({ page }, eventName: string) => {
  // Navigate to events tab if not already there
  const addEventButton = page.getByRole("button", { name: "Add event" });
  const isOnEventsTab = await isVisibleSafely(addEventButton, 1000);
  
  if (!isOnEventsTab) {
    await page.getByRole("tab", { name: "Events" }).click();
    await expect(addEventButton).toBeVisible();
  }
  
  // Find and click on the event (if there's a click action)
  // For now, just ensure it's visible - viewing might just mean scrolling to it
  const eventItem = page
    .getByRole("listitem")
    .filter({ hasText: eventName })
    .first();
  
  await expect(eventItem).toBeVisible();
  
  // Scroll the event into view
  await eventItem.scrollIntoViewIfNeeded();
});

Then('event {string} displays sub-events:', async ({ page }, eventName: string, dataTable: any) => {
  const eventItem = page
    .getByRole("listitem")
    .filter({ hasText: eventName })
    .first();
  
  await expect(eventItem).toBeVisible();
  
  const eventText = await eventItem.textContent();
  expect(eventText).toContain("Sub-events:");
  
  // Check each sub-event from the data table
  const expectedSubEvents = dataTable.raw().map((row: string[]) => row[0]);
  for (const subEventName of expectedSubEvents) {
    expect(eventText).toContain(subEventName);
  }
});
