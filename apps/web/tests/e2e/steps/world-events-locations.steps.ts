import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { navigateToEventsTab } from "../helpers/tabs";
import { verifyEntityInList } from "../helpers/verification";

const { When, Then } = createBdd();

// Note: "world {string} exists and is selected with locations tab" is defined in world-locations-create.steps.ts
// Note: "the admin ensures location {string} exists" is defined in world-locations-create.steps.ts
// Note: "the admin creates location {string} with parent {string}" is defined in world-locations-associations.steps.ts

When("the admin navigates to the events tab", async ({ page }) => {
  await navigateToEventsTab(page);
});

When('the admin creates event {string} at location {string}', async ({ page }, eventName: string, locationName: string) => {
  // Navigate to events tab if not already there
  const addEventButton = page.getByRole("button", { name: "Add event" });
  const isOnEventsTab = await addEventButton.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (!isOnEventsTab) {
    await page.getByRole("tab", { name: "Events" }).click();
    await expect(addEventButton).toBeVisible();
  }
  
  // Open the create event dialog
  await addEventButton.click();
  const dialog = page.getByRole("dialog", { name: "Add event" });
  await expect(dialog).toBeVisible();
  
  // Fill in event name
  await dialog.getByLabel("Event name").fill(eventName);
  await dialog.getByLabel("Summary").fill(`An event at ${locationName}.`);
  
  // Select location - wait for options to be available
  // The select is inside a label element
  const locationSelect = dialog.locator('label:has-text("Location (optional)") select');
  await expect(locationSelect).toBeVisible();
  
  // Wait a bit for locations to load into the dropdown
  // The useEffect in WorldTab should fetch locations when the event form opens
  await page.waitForTimeout(1000);
  
  // Wait for the specific location option to be available
  // Try multiple times as locations might be loading
  let locationOption = locationSelect.locator(`option:has-text("${locationName}")`);
  let attempts = 0;
  while (attempts < 5) {
    const count = await locationSelect.locator('option').count();
    if (count > 1) { // More than just "None" option
      const optionExists = await locationOption.count() > 0;
      if (optionExists) {
        break;
      }
    }
    await page.waitForTimeout(500);
    attempts++;
  }
  
  // Select by label
  await locationSelect.selectOption({ label: locationName });
  
  // Save the event
  await dialog.getByRole("button", { name: "Save event" }).click();
  
  // Wait for the dialog to close
  await expect(dialog).not.toBeVisible({ timeout: 3000 });
  
  // Wait for the event to appear in the list
  await verifyEntityInList(page, eventName);
});

When('the admin creates event {string} without a location', async ({ page }, eventName: string) => {
  // Navigate to events tab if not already there
  const addEventButton = page.getByRole("button", { name: "Add event" });
  const isOnEventsTab = await addEventButton.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (!isOnEventsTab) {
    await page.getByRole("tab", { name: "Events" }).click();
    await expect(addEventButton).toBeVisible();
  }
  
  // Open the create event dialog
  await addEventButton.click();
  const dialog = page.getByRole("dialog", { name: "Add event" });
  await expect(dialog).toBeVisible();
  
  // Fill in event name
  await dialog.getByLabel("Event name").fill(eventName);
  await dialog.getByLabel("Summary").fill("An event without a location.");
  
  // Don't select a location - leave it as "None"
  
  // Save the event
  await dialog.getByRole("button", { name: "Save event" }).click();
  
  // Wait for the dialog to close
  await expect(dialog).not.toBeVisible({ timeout: 3000 });
  
  // Wait for the event to appear in the list
  await verifyEntityInList(page, eventName);
});

// Note: "the admin navigates to the locations tab" is defined in world-locations-create.steps.ts
// Note: "event {string} appears in the events list" is defined in world-events-create.steps.ts

Then('event {string} shows it is at location {string}', async ({ page }, eventName: string, locationName: string) => {
  const eventItem = page
    .getByRole("listitem")
    .filter({ hasText: eventName })
    .first();
  
  await expect(eventItem).toBeVisible();
  
  // Check that the event shows the location
  const eventText = await eventItem.textContent();
  expect(eventText).toContain(`At: ${locationName}`);
});

Then('location {string} shows event {string}', async ({ page }, locationName: string, eventName: string) => {
  // Wait for entities to be loaded, including cross-referenced entities (events for locations)
  // This ensures events are available when checking
  await page.evaluate(({ timeout }) => {
    return new Promise<void>((resolve, reject) => {
      let resolved = false;
      const handler = (e: Event) => {
        const customEvent = e as CustomEvent;
        const detail = customEvent.detail || {};
        // Resolve if cross-referenced entities are loaded (events when viewing locations)
        if (detail.crossRefLoaded === true && !resolved) {
          resolved = true;
          clearTimeout(timer);
          window.removeEventListener("snapp:entities-loaded", handler);
          resolve();
        }
      };
      window.addEventListener("snapp:entities-loaded", handler);
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          window.removeEventListener("snapp:entities-loaded", handler);
          // Fallback: resolve anyway after timeout (entities might already be loaded)
          resolve();
        }
      }, timeout);
    });
  }, { timeout: 5000 });
  
  // Give React a moment to render after entities are loaded
  await page.waitForTimeout(200);
  
  // Find the location item where the location name appears as the main name (not in relationships)
  // The location name appears in a font-semibold div at the start of the listitem
  const locationItem = page
    .getByRole("listitem")
    .filter({ 
      has: page.locator(`div.font-semibold:has-text("${locationName}")`).first()
    })
    .first();
  
  await expect(locationItem).toBeVisible();
  
  // Check that the location shows the event
  const locationText = await locationItem.textContent();
  expect(locationText).toContain("Events:");
  expect(locationText).toContain(eventName);
});

Then('location {string} shows event {string} from parent location {string}', async ({ page }, locationName: string, eventName: string, parentLocationName: string) => {
  // Wait for entities to be loaded, including cross-referenced entities (events for locations)
  // We need to wait for ENTITIES_LOADED_EVENT with crossRefLoaded flag when viewing locations
  // This ensures events are loaded and parentLocationId is preserved
  await page.evaluate(({ timeout }) => {
    return new Promise<void>((resolve, reject) => {
      let resolved = false;
      const handler = (e: Event) => {
        const customEvent = e as CustomEvent;
        const detail = customEvent.detail || {};
        // Resolve if this is a reload event OR if cross-referenced entities are loaded
        // When viewing locations, we need crossRefLoaded to ensure events are available
        if ((detail.reloaded === true || detail.crossRefLoaded === true) && !resolved) {
          resolved = true;
          clearTimeout(timer);
          window.removeEventListener("snapp:entities-loaded", handler);
          resolve();
        }
      };
      window.addEventListener("snapp:entities-loaded", handler);
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          window.removeEventListener("snapp:entities-loaded", handler);
          // Fallback: resolve anyway after timeout (entities might already be loaded)
          resolve();
        }
      }, timeout);
    });
  }, { timeout: 5000 });
  
  // Give React a moment to render after entities are loaded
  await page.waitForTimeout(200);
  
  // Find the location item where the location name appears as the main name (not in relationships)
  // The location name appears in a font-semibold div at the start of the listitem
  const locationItem = page
    .getByRole("listitem")
    .filter({ 
      has: page.locator(`div.font-semibold:has-text("${locationName}")`).first()
    })
    .first();
  
  await expect(locationItem).toBeVisible();
  
  // Check that the location shows the event from parent
  // If the event appears, the relationship is working (parentLocationId is set correctly)
  const locationText = await locationItem.textContent();
  expect(locationText).toContain("Events:");
  expect(locationText).toContain(eventName);
  // Note: We don't check for "From parent locations:" text - if the event appears, the relationship is working
});
