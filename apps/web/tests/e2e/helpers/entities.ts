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
import { waitForSimpleEvent, waitForEventWithNameFilter, waitForEventWithIdFilter, isVisibleSafely, isHiddenSafely } from "./utils";
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
      const worldTab = worldContextTablist.getByRole("tab", { name: new RegExp(worldName, "i") });
      await expect(worldTab).toBeVisible({ timeout });
    }
  ).catch(async (error) => {
    // If both failed, check if world tab exists anyway
    const worldContextTablist = page.getByRole("tablist", { name: "World context" });
    const isVisible = await isVisibleSafely(worldContextTablist);
    if (isVisible) {
      const worldTab = worldContextTablist.getByRole("tab", { name: new RegExp(worldName, "i") });
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
  // Wait for event with name filter, with modal close as fallback
  await waitForEventWithNameFilter(
    page,
    CAMPAIGN_CREATED_EVENT,
    "entityName",
    campaignName,
    timeout,
    `Timeout waiting for campaign "{name}" to be created after ${timeout}ms`,
    async () => {
      // Fallback: Wait for modal to close (campaign creation closes the modal)
      await waitForModalClose(page, "campaign", timeout);
    }
  ).catch(async (error) => {
    // If both failed, check if modal is closed anyway
    const dialog = page.getByRole("dialog", { name: /create campaign/i });
    const isHidden = await isHiddenSafely(dialog);
    if (isHidden) {
      // Modal is closed, that's good enough
      return;
    }
    // Neither event nor modal close - rethrow
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
