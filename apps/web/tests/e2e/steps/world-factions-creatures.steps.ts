import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { createApiClient } from "../helpers/api";
import type { APIRequestContext } from "@playwright/test";

const { When, Then } = createBdd();

// Note: "world {string} exists and is selected with factions tab" is defined in world-entities-create.steps.ts
// Note: "the admin ensures faction {string} exists" is defined in world-entities-create.steps.ts
// Note: "the admin ensures creature {string} exists" is defined in world-entities-create.steps.ts
// Note: "the admin creates faction {string}" is defined in world-entities-create.steps.ts
// Note: "the admin links faction {string} as sub-faction of {string}" is defined in world-factions-nested.steps.ts

When('the admin links creature {string} as member of {string}', async ({ page, request }, creatureName: string, factionName: string) => {
  // Wait for page to be ready after any previous operations
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  
  // Check if we need to navigate to the Factions tab
  let factionsTab = page.getByRole("tab", { name: "Factions" });
  const factionsTabVisible = await factionsTab.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (!factionsTabVisible) {
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);
    factionsTab = page.getByRole("tab", { name: "Factions" });
  }
  
  // Check if we're already on the Factions tab
  const addFactionButton = page.getByRole("button", { name: "Add faction" });
  const isOnFactionsTab = await addFactionButton.isVisible({ timeout: 3000 }).catch(() => false);
  
  if (!isOnFactionsTab) {
    await expect(factionsTab).toBeVisible({ timeout: 10000 });
    await factionsTab.click();
    await expect(addFactionButton).toBeVisible({ timeout: 10000 });
  }
  
  // Wait for factions and creatures to be loaded
  await page.waitForTimeout(1000);
  
  // Get all worlds first
  const api = createApiClient(request);
  const adminToken = await api.getAdminToken();
  const worldsResponse = await api.call("world", "GET", "/worlds", { token: adminToken });
  const worldsData = worldsResponse;
  const worlds = worldsData.worlds;
  
  if (worlds.length === 0) {
    throw new Error("No worlds found. Ensure a world exists before linking creatures to factions.");
  }
  
  // Try to find faction and creature in each world until we find both
  let faction: any = null;
  let creature: any = null;
  let worldId: string | null = null;
  
  for (const world of worlds) {
    const factionsResponse = await api.call("world", "GET", `/worlds/${world.id}/entities?type=faction`, { token: adminToken });
    const factions = (factionsResponse as { entities?: any[] }).entities || [];
    
    const creaturesResponse = await api.call("world", "GET", `/worlds/${world.id}/entities?type=creature`, { token: adminToken });
    const creatures = (creaturesResponse as { entities?: any[] }).entities || [];
    
    const foundFaction = factions.find((f: any) => f.name === factionName);
    const foundCreature = creatures.find((c: any) => c.name === creatureName);
    
    if (foundFaction && foundCreature) {
      faction = foundFaction;
      creature = foundCreature;
      worldId = world.id;
      break;
    }
  }
  
  if (!faction || !creature || !worldId) {
    throw new Error(
      `Could not find faction or creature: faction=${factionName}, creature=${creatureName}. ` +
      `Searched ${worlds.length} world(s).`
    );
  }
  
  // Create the relationship via API
  try {
    await api.call("world", "POST", `/worlds/${worldId}/factions/${faction.id}/members`, {
      token: adminToken,
      body: {
        creatureId: creature.id
      }
    });
  } catch (error: any) {
    throw new Error(`Failed to create membership: ${error.message || "Unknown error"}`);
  }
  
  // Wait for the relationship to be reflected in the UI
  await page.waitForTimeout(500);
  
  // Click away from Factions tab and back to trigger a refresh
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
});

Then('faction {string} shows it has member {string}', async ({ page }, factionName: string, memberName: string) => {
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
  
  // Find the faction item more specifically
  // We need to find the list item where the faction name appears as the main name (in the font-semibold div)
  // not just anywhere in the text (which might match parent factions that contain this faction name as a sub-faction)
  const allFactionItems = page.getByRole("listitem");
  const itemCount = await allFactionItems.count();
  
  let factionItem = null;
  for (let i = 0; i < itemCount; i++) {
    const item = allFactionItems.nth(i);
    
    // Check if this item's main name (in the font-semibold div) matches the faction name
    const mainName = await item.locator('.font-semibold').first().textContent().catch(() => null);
    
    if (mainName && mainName.trim() === factionName) {
      factionItem = item;
      break;
    }
    
    // Fallback: check if the item starts with the faction name (not just contains it)
    const itemText = await item.textContent();
    if (itemText && itemText.trim().startsWith(factionName)) {
      // Make sure it's not a parent faction (which would have "Sub-factions:" in it)
      // Actually, we want to match even if it has sub-factions, as long as the main name matches
      // So let's check if the main name matches by looking at the first part before any "Sub-factions:" or "Members:"
      const mainNameFallback = itemText.split(/Sub-factions:|Members:/)[0].trim();
      if (mainNameFallback.startsWith(factionName)) {
        factionItem = item;
        break;
      }
    }
  }
  
  if (!factionItem) {
    throw new Error(`Could not find faction item for "${factionName}"`);
  }
  
  await expect(factionItem).toBeVisible({ timeout: 5000 });
  
  // Wait for the membership to appear in the UI
  // Poll for the "Members:" text to appear (with a reasonable timeout)
  let membershipVisible = false;
  const maxAttempts = 10; // 5 seconds total
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const factionText = await factionItem.textContent();
    if (factionText && factionText.includes("Members:") && factionText.includes(memberName)) {
      membershipVisible = true;
      break;
    }
    if (attempt < maxAttempts - 1) {
      await page.waitForTimeout(500);
    }
  }
  
  if (!membershipVisible) {
    // If membership still not visible, log the current state for debugging
    const currentText = await factionItem.textContent();
    throw new Error(
      `Membership not visible in UI. ` +
      `Faction: ${factionName}, Member: ${memberName}. ` +
      `Current faction text: ${currentText}`
    );
  }
  
  // Verify the membership is displayed correctly
  const factionText = await factionItem.textContent();
  expect(factionText).toContain("Members:");
  expect(factionText).toContain(memberName);
});

Then('faction {string} displays members:', async ({ page }, factionName: string, dataTable: any) => {
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
  
  // Find the faction item more specifically
  // We need to find the list item where the faction name appears as the main name (in the font-semibold div)
  // not just anywhere in the text (which might match parent factions that contain this faction name as a sub-faction)
  const allFactionItems = page.getByRole("listitem");
  const itemCount = await allFactionItems.count();
  
  let factionItem = null;
  for (let i = 0; i < itemCount; i++) {
    const item = allFactionItems.nth(i);
    
    // Check if this item's main name (in the font-semibold div) matches the faction name
    const mainName = await item.locator('.font-semibold').first().textContent().catch(() => null);
    
    if (mainName && mainName.trim() === factionName) {
      factionItem = item;
      break;
    }
    
    // Fallback: check if the item starts with the faction name (not just contains it)
    const itemText = await item.textContent();
    if (itemText && itemText.trim().startsWith(factionName)) {
      // Check if the main name matches by looking at the first part before any "Sub-factions:" or "Members:"
      const mainNameFallback = itemText.split(/Sub-factions:|Members:/)[0].trim();
      if (mainNameFallback.startsWith(factionName)) {
        factionItem = item;
        break;
      }
    }
  }
  
  if (!factionItem) {
    throw new Error(`Could not find faction item for "${factionName}"`);
  }
  
  await expect(factionItem).toBeVisible({ timeout: 5000 });
  
  // Wait for members to appear in the UI
  await page.waitForTimeout(1000);
  
  const factionText = await factionItem.textContent();
  expect(factionText).toContain("Members:");
  
  // Check each member from the data table
  const expectedMembers = dataTable.raw().map((row: string[]) => row[0]);
  for (const memberName of expectedMembers) {
    expect(factionText).toContain(memberName);
  }
});
