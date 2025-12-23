import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { createApiClient } from "../helpers/api";
import { isVisibleSafely } from "../helpers/utils";
import type { APIRequestContext } from "@playwright/test";

const { When, Then } = createBdd();

// Note: "world {string} exists and is selected with factions tab" is defined in world-entities-create.steps.ts
// Note: "the admin ensures faction {string} exists" is defined in world-entities-create.steps.ts
// Note: "the admin creates faction {string}" is defined in world-entities-create.steps.ts

When('the admin links faction {string} as sub-faction of {string}', async ({ page, request }, subFactionName: string, parentFactionName: string) => {
  // Wait for page to be ready after any previous operations
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  
  // Check if we need to navigate to the Factions tab
  // First, check if the Factions tab exists and is visible
  let factionsTab = page.getByRole("tab", { name: "Factions" });
  const factionsTabVisible = await factionsTab.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (!factionsTabVisible) {
    // Factions tab not visible - might need to wait for page to fully load
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);
    factionsTab = page.getByRole("tab", { name: "Factions" });
  }
  
  // Check if we're already on the Factions tab
  const addFactionButton = page.getByRole("button", { name: "Add faction" });
  const isOnFactionsTab = await addFactionButton.isVisible({ timeout: 3000 }).catch(() => false);
  
  if (!isOnFactionsTab) {
    // Wait for the Factions tab to be visible before clicking
    await expect(factionsTab).toBeVisible({ timeout: 10000 });
    await factionsTab.click();
    await expect(addFactionButton).toBeVisible({ timeout: 10000 });
  }
  
  // Wait for factions to be loaded
  await page.waitForTimeout(1000);
  
  // Get all worlds first
  const api = createApiClient(request);
  const adminToken = await api.getAdminToken();
  const worldsResponse = await api.call("world", "GET", "/worlds", { token: adminToken });
  const worlds = (worldsResponse as { worlds?: any[] }).worlds || [];
  
  if (worlds.length === 0) {
    throw new Error("No worlds found. Ensure a world exists before linking factions.");
  }
  
  // Try to find factions in each world until we find both factions
  // This handles cases where we don't know which world is selected
  let parentFaction: any = null;
  let subFaction: any = null;
  let worldId: string | null = null;
  
  for (const world of worlds) {
    const factionsResponse = await api.call("world", "GET", `/worlds/${world.id}/entities?type=faction`, { token: adminToken });
    const factions = (factionsResponse as { entities?: any[] }).entities || [];
    
    const foundParent = factions.find((f: any) => f.name === parentFactionName);
    const foundSub = factions.find((f: any) => f.name === subFactionName);
    
    if (foundParent && foundSub) {
      parentFaction = foundParent;
      subFaction = foundSub;
      worldId = world.id;
      break;
    }
  }
  
  if (!parentFaction || !subFaction || !worldId) {
    throw new Error(
      `Could not find factions: parent=${parentFactionName}, sub=${subFactionName}. ` +
      `Searched ${worlds.length} world(s).`
    );
  }
  
  // Create the relationship via API
  try {
    await api.call("world", "POST", `/worlds/${worldId}/factions/${parentFaction.id}/relationships`, {
      token: adminToken,
      body: {
        targetFactionId: subFaction.id,
        relationshipType: "contains"
      }
    });
  } catch (error: any) {
    throw new Error(`Failed to create relationship: ${error.message || "Unknown error"}`);
  }
  
  // Wait for the relationship to be reflected in the UI
  // Since we're making API calls directly, the UI won't automatically refresh
  // We need to trigger a refresh by clicking away and back to the Factions tab
  await page.waitForTimeout(500);
  
  // Click away from Factions tab and back to trigger a refresh
  // First, try clicking on Locations tab (if it exists)
  const locationsTab = page.getByRole("tab", { name: "Locations" });
  const locationsTabVisible = await locationsTab.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (locationsTabVisible) {
    await locationsTab.click();
    await page.waitForTimeout(500);
  }
  
  // Now click back to Factions tab to trigger a refresh
  factionsTab = page.getByRole("tab", { name: "Factions" });
  await expect(factionsTab).toBeVisible({ timeout: 5000 });
  await factionsTab.click();
  
  // Wait for the Add faction button to be visible (indicates tab is loaded)
  await expect(page.getByRole("button", { name: "Add faction" })).toBeVisible({ timeout: 5000 });
  
  // Wait a bit more for entities to load
  await page.waitForTimeout(1000);
  
  // The relationship should now be visible after the refresh
  // We don't need to poll here - the Then steps will verify the relationships
});

Then('faction {string} shows it has sub-faction {string}', async ({ page }, parentFactionName: string, subFactionName: string) => {
  // Find the faction item by its main name (in the font-semibold div)
  const allFactionItems = page.getByRole("listitem");
  const itemCount = await allFactionItems.count();
  
  let parentFactionItem = null;
  for (let i = 0; i < itemCount; i++) {
    const item = allFactionItems.nth(i);
    const mainName = await item.locator('.font-semibold').first().textContent().catch(() => null);
    if (mainName && mainName.trim() === parentFactionName) {
      parentFactionItem = item;
      break;
    }
  }
  
  if (!parentFactionItem) {
    // Fallback to filter approach
    parentFactionItem = page
      .getByRole("listitem")
      .filter({ hasText: parentFactionName })
      .first();
  }
  
  await expect(parentFactionItem).toBeVisible();
  
  // Poll for the "Sub-factions:" text to appear (relationships might take time to load)
  let subFactionsVisible = false;
  const maxAttempts = 20; // 10 seconds total
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const factionText = await parentFactionItem.textContent();
    if (factionText && factionText.includes("Sub-factions:") && factionText.includes(subFactionName)) {
      subFactionsVisible = true;
      break;
    }
    
    // If we're halfway through and still no sub-factions, try refreshing again
    if (attempt === Math.floor(maxAttempts / 2)) {
      const locationsTab = page.getByRole("tab", { name: "Locations" });
      const locationsTabVisible = await locationsTab.isVisible({ timeout: 2000 }).catch(() => false);
      if (locationsTabVisible) {
        await locationsTab.click();
        await page.waitForTimeout(500);
        const factionsTab = page.getByRole("tab", { name: "Factions" });
        await factionsTab.click();
        await expect(page.getByRole("button", { name: "Add faction" })).toBeVisible({ timeout: 5000 });
        // Re-find the faction item after refresh
        const allFactionItemsAfterRefresh = page.getByRole("listitem");
        const itemCountAfterRefresh = await allFactionItemsAfterRefresh.count();
        for (let i = 0; i < itemCountAfterRefresh; i++) {
          const item = allFactionItemsAfterRefresh.nth(i);
          const mainName = await item.locator('.font-semibold').first().textContent().catch(() => null);
          if (mainName && mainName.trim() === parentFactionName) {
            parentFactionItem = item;
            break;
          }
        }
      }
    }
    
    if (attempt < maxAttempts - 1) {
      await page.waitForTimeout(500);
    }
  }
  
  if (!subFactionsVisible) {
    const currentText = await parentFactionItem.textContent();
    throw new Error(
      `Sub-factions not visible in UI. ` +
      `Faction: ${parentFactionName}, Sub-faction: ${subFactionName}. ` +
      `Current faction text: ${currentText}`
    );
  }
  
  // Verify the sub-factions are displayed correctly
  const factionText = await parentFactionItem.textContent();
  expect(factionText).toContain("Sub-factions:");
  expect(factionText).toContain(subFactionName);
});

Then('faction {string} shows it is part of {string}', async ({ page }, subFactionName: string, parentFactionName: string) => {
  // Ensure we're on the Factions tab
  const addFactionButton = page.getByRole("button", { name: "Add faction" });
  const isOnFactionsTab = await addFactionButton.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (!isOnFactionsTab) {
    const factionsTab = page.getByRole("tab", { name: "Factions" });
    await expect(factionsTab).toBeVisible({ timeout: 5000 });
    await factionsTab.click();
    await expect(addFactionButton).toBeVisible({ timeout: 5000 });
  }
  
  // Wait for entities to be loaded
  await page.waitForTimeout(1000);
  
  // Find the sub-faction item more specifically
  // We need to find the list item where the sub-faction name appears as the main name (in the font-semibold div)
  // not just anywhere in the text (which might match the parent faction's sub-factions list)
  const allFactionItems = page.getByRole("listitem");
  const itemCount = await allFactionItems.count();
  
  let subFactionItem = null;
  for (let i = 0; i < itemCount; i++) {
    const item = allFactionItems.nth(i);
    const itemText = await item.textContent();
    
    // Check if this item's main name (first line, before any "Sub-factions:") matches the sub-faction name
    // The main name should be in a font-semibold div
    const mainName = await item.locator('.font-semibold').first().textContent().catch(() => null);
    
    if (mainName && mainName.trim() === subFactionName) {
      subFactionItem = item;
      break;
    }
    
    // Fallback: check if the item starts with the sub-faction name (not just contains it)
    if (itemText && itemText.trim().startsWith(subFactionName)) {
      // Make sure it's not the parent faction (which would have "Sub-factions:" in it)
      if (!itemText.includes("Sub-factions:")) {
        subFactionItem = item;
        break;
      }
    }
  }
  
  if (!subFactionItem) {
    throw new Error(`Could not find sub-faction item for "${subFactionName}"`);
  }
  
  await expect(subFactionItem).toBeVisible({ timeout: 5000 });
  
  // Wait for the relationship to appear in the UI
  // Poll for the "Part of:" text to appear (with a reasonable timeout)
  let relationshipVisible = false;
  const maxAttempts = 10; // 5 seconds total
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const factionText = await subFactionItem.textContent();
    if (factionText && factionText.includes("Part of:") && factionText.includes(parentFactionName)) {
      relationshipVisible = true;
      break;
    }
    if (attempt < maxAttempts - 1) {
      await page.waitForTimeout(500);
    }
  }
  
  if (!relationshipVisible) {
    // If relationship still not visible, log the current state for debugging
    const currentText = await subFactionItem.textContent();
    throw new Error(
      `Relationship not visible in UI. ` +
      `Sub-faction: ${subFactionName}, Parent: ${parentFactionName}. ` +
      `Current sub-faction text: ${currentText}`
    );
  }
  
  // Verify the relationship is displayed correctly
  const factionText = await subFactionItem.textContent();
  expect(factionText).toContain("Part of:");
  expect(factionText).toContain(parentFactionName);
});

When('the admin views faction {string}', async ({ page }, factionName: string) => {
  // Navigate to factions tab if not already there
  const addFactionButton = page.getByRole("button", { name: "Add faction" });
  const isOnFactionsTab = await isVisibleSafely(addFactionButton, 1000);
  
  if (!isOnFactionsTab) {
    await page.getByRole("tab", { name: "Factions" }).click();
    await expect(addFactionButton).toBeVisible();
  }
  
  // Find and click on the faction (if there's a click action)
  // For now, just ensure it's visible - viewing might just mean scrolling to it
  const factionItem = page
    .getByRole("listitem")
    .filter({ hasText: factionName })
    .first();
  
  await expect(factionItem).toBeVisible();
  
  // Scroll the faction into view
  await factionItem.scrollIntoViewIfNeeded();
});

Then('faction {string} displays sub-factions:', async ({ page }, factionName: string, dataTable: any) => {
  const factionItem = page
    .getByRole("listitem")
    .filter({ hasText: factionName })
    .first();
  
  await expect(factionItem).toBeVisible();
  
  const factionText = await factionItem.textContent();
  expect(factionText).toContain("Sub-factions:");
  
  // Check each sub-faction from the data table
  const expectedSubFactions = dataTable.raw().map((row: string[]) => row[0]);
  for (const subFactionName of expectedSubFactions) {
    expect(factionText).toContain(subFactionName);
  }
});
