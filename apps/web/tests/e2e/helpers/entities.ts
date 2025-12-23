import { Page, expect } from "@playwright/test";
import {
  WORLD_CREATED_EVENT,
  CAMPAIGN_CREATED_EVENT,
  WORLDS_LOADED_EVENT,
  CAMPAIGNS_LOADED_EVENT,
  ENTITIES_LOADED_EVENT,
  CREATURE_CREATED_EVENT,
  FACTION_CREATED_EVENT,
  LOCATION_CREATED_EVENT,
  EVENT_CREATED_EVENT,
  WORLD_UPDATED_EVENT
} from "../../../lib/auth/authEvents";
import { DEFAULT_EVENT_TIMEOUT } from "./constants";
import { waitForSimpleEvent, waitForEventWithNameFilter, waitForEventWithIdFilter, isVisibleSafely, isHiddenSafely, safeWait } from "./utils";
import { waitForModalClose } from "./modals";

/**
 * Wait for a world to be created using transition events.
 * 
 * @param page - Playwright page object
 * @param worldName - Name of the world to wait for (can be partial match)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForWorldCreated(
  page: Page,
  worldName: string,
  timeout: number = DEFAULT_EVENT_TIMEOUT
): Promise<void> {
  // Wait for event with name filter
  await waitForEventWithNameFilter(
    page,
    WORLD_CREATED_EVENT,
    "entityName",
    worldName,
    timeout,
    `Timeout waiting for world "{name}" to be created after ${timeout}ms`,
    async () => {
      // Fallback: Wait for world to appear in the world context tablist
      const worldContextTablist = page.getByRole("tablist", { name: "World context" });
      await expect(worldContextTablist).toBeVisible({ timeout });
      // Escape regex special characters in world name (e.g., brackets from unique name generation)
      const escapedWorldName = worldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const worldTab = worldContextTablist.getByRole("tab", { name: new RegExp(escapedWorldName, "i") });
      await expect(worldTab).toBeVisible({ timeout });
    }
  ).catch(async (error) => {
    // If both failed, check if world tab exists anyway
    const worldContextTablist = page.getByRole("tablist", { name: "World context" });
    const isVisible = await isVisibleSafely(worldContextTablist);
    if (isVisible) {
      // Escape regex special characters in world name (e.g., brackets from unique name generation)
      const escapedWorldName = worldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const worldTab = worldContextTablist.getByRole("tab", { name: new RegExp(escapedWorldName, "i") });
      const tabVisible = await isVisibleSafely(worldTab);
      if (tabVisible) {
        return; // World tab is visible, that's good enough
      }
    }
    throw error; // Neither event nor DOM, rethrow
  });
}

/**
 * Wait for a campaign to be created using transition events.
 * 
 * @param page - Playwright page object
 * @param campaignName - Name of the campaign to wait for (can be partial match)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForCampaignCreated(
  page: Page,
  campaignName: string,
  timeout: number = DEFAULT_EVENT_TIMEOUT
): Promise<void> {
  // Wait for event with name filter, with multiple fallbacks
  await waitForEventWithNameFilter(
    page,
    CAMPAIGN_CREATED_EVENT,
    "entityName",
    campaignName,
    timeout,
    `Timeout waiting for campaign "{name}" to be created after ${timeout}ms`,
    async () => {
      // Fallback: Check for campaign in CampaignSelection list or heading appearance
      // In the new UI, campaigns appear in a TabList with aria-label="Campaigns" in World view
      const campaignsList = page.getByRole("tablist", { name: "Campaigns" });
      const campaignHeading = page.locator('h3.snapp-heading').filter({ hasText: new RegExp(campaignName, "i") }).first();
      
      // Check if list exists first, then get campaign from it
      const listExists = await isVisibleSafely(campaignsList, 2000).catch(() => false);
      const campaignInList = listExists ? campaignsList.getByRole("tab", { name: new RegExp(campaignName, "i") }).first() : null;
      
      // Race between modal close, campaign in list (if list exists), and heading appearance
      const racePromises = [
        waitForModalClose(page, "campaign", timeout).catch(() => {}), // Don't fail if modal doesn't close
        expect(campaignHeading).toBeVisible({ timeout }).catch(() => {}) // Don't fail if heading check fails
      ];
      
      if (campaignInList) {
        racePromises.push(expect(campaignInList).toBeVisible({ timeout }).catch(() => {})); // Don't fail if list check fails
      }
      
      await Promise.race(racePromises);
      
      // Verify campaign actually appeared (either in list or as heading)
      const listVisibleCheck = await isVisibleSafely(campaignsList, 2000).catch(() => false);
      const inListVisible = listVisibleCheck && campaignInList ? await isVisibleSafely(campaignInList, 2000).catch(() => false) : false;
      const headingVisible = await isVisibleSafely(campaignHeading, 2000).catch(() => false);
      
      if (inListVisible || headingVisible) {
        // Campaign appeared - success!
        return;
      }
      
      // Campaign didn't appear - check if modal is closed (might indicate success)
      const dialog = page.getByRole("dialog", { name: /create campaign/i });
      const isHidden = await isHiddenSafely(dialog, 1000);
      if (isHidden) {
        // Modal is closed - campaign might have been created, verify it exists
        // Re-check list existence and campaign
        const listExistsFinal = await isVisibleSafely(campaignsList, 2000).catch(() => false);
        const finalListCheck = listExistsFinal ? await isVisibleSafely(campaignsList.getByRole("tab", { name: new RegExp(campaignName, "i") }).first(), 2000).catch(() => false) : false;
        const finalHeadingCheck = await isVisibleSafely(campaignHeading, 2000).catch(() => false);
        if (finalListCheck || finalHeadingCheck) {
          return; // Campaign exists
        }
      }
      
      // Neither campaign appeared nor modal closed - this is an error
      throw new Error(`Campaign "${campaignName}" was not created. Modal may still be open.`);
    }
  ).catch(async (error) => {
    // If both event and fallback failed, do a final check
    const dialog = page.getByRole("dialog", { name: /create campaign/i });
    const isHidden = await isHiddenSafely(dialog, 1000);
    
    // Check if campaign actually exists (maybe event didn't fire but creation succeeded)
    const campaignTab = page.getByRole("tab", { name: new RegExp(campaignName, "i") }).first();
    const campaignHeading = page.locator('h3.snapp-heading').filter({ hasText: new RegExp(campaignName, "i") }).first();
    const tabVisible = await isVisibleSafely(campaignTab, 2000);
    const headingVisible = await isVisibleSafely(campaignHeading, 2000);
    
    if (tabVisible || headingVisible) {
      // Campaign exists - that's what matters, even if events didn't fire
      return;
    }
    
    if (isHidden) {
      // Modal is closed but campaign doesn't exist - might be a timing issue
      // Wait a bit more and check again
      await safeWait(page, 500);
      const finalTabCheck = await isVisibleSafely(campaignTab, 2000);
      const finalHeadingCheck = await isVisibleSafely(campaignHeading, 2000);
      if (finalTabCheck || finalHeadingCheck) {
        return; // Campaign exists now
      }
    }
    
    // Neither event nor campaign appearance - rethrow
    throw error;
  });
}

/**
 * Wait for worlds to be loaded using transition events.
 * 
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForWorldsLoaded(
  page: Page,
  timeout: number = DEFAULT_EVENT_TIMEOUT
): Promise<void> {
  await waitForSimpleEvent(
    page,
    WORLDS_LOADED_EVENT,
    timeout,
    async () => {
      // Fallback: Check if worlds are already loaded (check for world context tablist)
      const worldContextTablist = page.getByRole("tablist", { name: "World context" });
      await expect(worldContextTablist).toBeVisible({ timeout });
    }
  );
}

/**
 * Wait for campaigns to be loaded using transition events.
 * 
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForCampaignsLoaded(
  page: Page,
  timeout: number = DEFAULT_EVENT_TIMEOUT
): Promise<void> {
  // Wait for the event - no meaningful DOM fallback available
  await waitForSimpleEvent(page, CAMPAIGNS_LOADED_EVENT, timeout);
}

/**
 * Wait for entities to be loaded for a specific world using transition events.
 * 
 * @param page - Playwright page object
 * @param worldId - Optional world ID to wait for (if not provided, waits for any entity load)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForEntitiesLoaded(
  page: Page,
  worldId?: string,
  timeout: number = DEFAULT_EVENT_TIMEOUT
): Promise<void> {
  await waitForEventWithIdFilter(
    page,
    ENTITIES_LOADED_EVENT,
    "worldId",
    worldId,
    timeout,
    `Timeout waiting for entities to be loaded${worldId ? ` (worldId: ${worldId})` : ""} after ${timeout}ms`
  );
}

/**
 * Wait for an entity (creature, faction, location, event) to be created using transition events.
 * 
 * @param page - Playwright page object
 * @param entityType - Type of entity ("creature", "faction", "location", "event")
 * @param entityName - Name of the entity to wait for (can be partial match)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForEntityCreated(
  page: Page,
  entityType: "creature" | "faction" | "location" | "event",
  entityName: string,
  timeout: number = DEFAULT_EVENT_TIMEOUT
): Promise<void> {
  // Map entity type to event name
  const eventMap: Record<string, string> = {
    creature: CREATURE_CREATED_EVENT,
    faction: FACTION_CREATED_EVENT,
    location: LOCATION_CREATED_EVENT,
    event: EVENT_CREATED_EVENT
  };
  const eventName = eventMap[entityType];
  if (!eventName) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }

  // Wait for event with name filter
  await waitForEventWithNameFilter(
    page,
    eventName,
    "entityName",
    entityName,
    timeout,
    `Timeout waiting for ${eventName} "{name}" to be created after ${timeout}ms`,
    async () => {
      // Fallback: Wait for modal to close (entity creation closes the modal)
      await waitForModalClose(page, "entity", timeout);
    }
  );
}

/**
 * Wait for a world to be updated using transition events.
 * 
 * @param page - Playwright page object
 * @param worldId - Optional world ID to wait for (if not provided, waits for any world update)
 * @param updateType - Optional update type to filter by (e.g., "splashImageSet", "splashImageCleared")
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForWorldUpdated(
  page: Page,
  worldId?: string,
  updateType?: string,
  timeout: number = DEFAULT_EVENT_TIMEOUT
): Promise<void> {
  // For world updates, we need to filter by both worldId and updateType
  // Use a custom event promise since we have multiple filter criteria
  const eventPromise = page.evaluate(
    ({ timeout, eventName, worldId, updateType }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventWorldId = customEvent.detail?.worldId;
          const eventUpdateType = customEvent.detail?.updateType;
          
          // If worldId is specified, only resolve if it matches
          // If updateType is specified, also match update type
          const worldMatch = !worldId || eventWorldId === worldId;
          const typeMatch = !updateType || eventUpdateType === updateType;
          
          if (worldMatch && typeMatch && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for world${worldId ? ` "${worldId}"` : ""} to be updated${updateType ? ` (type: ${updateType})` : ""} after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { timeout, eventName: WORLD_UPDATED_EVENT, worldId, updateType }
  );

  // Wait for the event - no meaningful DOM fallback available
  await eventPromise;
}
