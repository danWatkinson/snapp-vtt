import { Page } from "@playwright/test";
import { DEFAULT_EVENT_TIMEOUT } from "./constants";

/**
 * Generic helper to wait for a simple event (no filtering needed).
 * Used for "loaded" events that don't require matching specific details.
 * 
 * @param page - Playwright page object
 * @param eventName - Name of the event to wait for
 * @param timeout - Maximum time to wait in milliseconds
 * @param domFallback - Optional function to check DOM state as fallback
 * @returns Promise that resolves when event fires or DOM check passes
 */
export async function waitForSimpleEvent(
  page: Page,
  eventName: string,
  timeout: number = DEFAULT_EVENT_TIMEOUT,
  domFallback?: () => Promise<void>
): Promise<void> {
  const eventPromise = page.evaluate(
    ({ timeout, eventName }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          if (!resolved) {
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
            reject(new Error(`Timeout waiting for ${eventName} after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { timeout, eventName }
  );

  if (domFallback) {
    const domPromise = domFallback();
    await Promise.race([eventPromise, domPromise]).catch((error) => {
      throw error;
    });
  } else {
    await eventPromise;
  }
}

/**
 * Generic helper to wait for an event with name-based filtering.
 * This reduces duplication in event waiting patterns that filter by entity/user/asset names.
 * 
 * @param page - Playwright page object
 * @param eventName - Name of the event to wait for
 * @param detailPath - Path to the name field in event detail (e.g., "entityName", "username", "assetName")
 * @param searchName - Name to search for (can be partial match)
 * @param timeout - Maximum time to wait in milliseconds
 * @param errorMessage - Custom error message for timeout (can include {name} placeholder)
 * @param domFallback - Optional function to check DOM state as fallback
 * @returns Promise that resolves when matching event fires or DOM check passes
 */
export async function waitForEventWithNameFilter(
  page: Page,
  eventName: string,
  detailPath: string,
  searchName: string,
  timeout: number = DEFAULT_EVENT_TIMEOUT,
  errorMessage?: string,
  domFallback?: () => Promise<void>
): Promise<void> {
  const eventPromise = page.evaluate(
    ({ timeout, eventName, detailPath, searchName }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const detail = customEvent.detail || {};
          
          // Get the name from the detail using the path (supports nested paths like "user.username")
          const eventNameValue = detailPath.split('.').reduce((obj, key) => obj?.[key], detail);
          const eventNameStr = (eventNameValue || "").trim().toLowerCase();
          const searchNameStr = searchName.trim().toLowerCase();
          
          // Use matchesName logic inline (can't import utility in browser context)
          const exactMatch = eventNameStr === searchNameStr;
          const forwardMatch = eventNameStr.includes(searchNameStr);
          const reverseMatch = searchNameStr.includes(eventNameStr);
          
          if (eventNameStr && (exactMatch || forwardMatch || reverseMatch) && !resolved) {
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
            const msg = errorMessage?.replace("{name}", searchName) || 
                       `Timeout waiting for ${eventName} "${searchName}" after ${timeout}ms`;
            reject(new Error(msg));
          }
        }, timeout);
      });
    },
    { 
      timeout, 
      eventName,
      detailPath,
      searchName
    }
  );

  if (domFallback) {
    await Promise.race([eventPromise, domFallback()]).catch(async (error) => {
      // If both failed, that's an error
      throw error;
    });
  } else {
    await eventPromise;
  }
}

/**
 * Generic helper to wait for an event with ID-based filtering.
 * Useful for events that filter by ID (worldId, campaignId, etc.)
 * 
 * @param page - Playwright page object
 * @param eventName - Name of the event to wait for
 * @param detailPath - Path to the ID field in event detail (e.g., "worldId")
 * @param filterId - Optional ID to filter by (if not provided, accepts any event)
 * @param timeout - Maximum time to wait in milliseconds
 * @param errorMessage - Custom error message for timeout
 * @returns Promise that resolves when matching event fires
 */
export async function waitForEventWithIdFilter(
  page: Page,
  eventName: string,
  detailPath: string,
  filterId?: string,
  timeout: number = DEFAULT_EVENT_TIMEOUT,
  errorMessage?: string
): Promise<void> {
  const eventPromise = page.evaluate(
    ({ timeout, eventName, detailPath, filterId }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const detail = customEvent.detail || {};
          
          // Get the ID from the detail using the path
          const eventId = detailPath.split('.').reduce((obj, key) => obj?.[key], detail);
          
          // If filterId is provided, only resolve if it matches
          // Otherwise, resolve on any event
          if (!resolved && (!filterId || eventId === filterId)) {
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
            const msg = errorMessage || 
                       `Timeout waiting for ${eventName}${filterId ? ` (id: ${filterId})` : ""} after ${timeout}ms`;
            reject(new Error(msg));
          }
        }, timeout);
      });
    },
    { 
      timeout, 
      eventName,
      detailPath,
      filterId
    }
  );

  await eventPromise;
}
