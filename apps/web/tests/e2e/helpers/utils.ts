import { Page, Locator } from "@playwright/test";
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
 * Generate a unique campaign name per worker to avoid conflicts when tests run in parallel.
 * Uses TEST_PARALLEL_INDEX to ensure each worker gets a unique name.
 */
export function getUniqueCampaignName(baseName: string): string {
  const workerIndex = process.env.TEST_PARALLEL_INDEX;
  if (workerIndex !== undefined) {
    return `${baseName} [Worker ${workerIndex}]`;
  }
  // When running sequentially (no worker index), use timestamp to ensure uniqueness
  // This prevents test isolation issues when tests run one after another
  return `${baseName}-${Date.now()}`;
}

/**
 * Generate a unique username per worker to avoid conflicts when tests run in parallel.
 * Uses TEST_PARALLEL_INDEX to ensure each worker gets a unique username.
 */
export function getUniqueUsername(baseName: string): string {
  const workerIndex = process.env.TEST_PARALLEL_INDEX;
  if (workerIndex !== undefined) {
    return `${baseName}-${workerIndex}`;
  }
  // If no worker index, use timestamp to ensure uniqueness
  return `${baseName}-${Date.now()}`;
}

/**
 * Get the unique campaign name that was stored in the page context.
 * This is used to retrieve the actual campaign name when tests need to reference it.
 */
export async function getStoredCampaignName(page: Page, baseName: string): Promise<string> {
  try {
    const storedName = await page.evaluate(() => {
      return (window as any).__testCampaignName;
    });
    if (storedName) {
      return storedName;
    }
  } catch {
    // Can't retrieve - fall back to unique name generation
  }
  // Fall back to generating unique name if not stored
  return getUniqueCampaignName(baseName);
}

/**
 * Get the unique world name that was stored in the page context.
 * This is used to retrieve the actual world name when tests need to reference it.
 */
export async function getStoredWorldName(
  page: Page,
  baseName: string = "Eldoria"
): Promise<string> {
  try {
    const storedName = await page.evaluate(() => {
      return (window as any).__testWorldName;
    });
    if (storedName) {
      return storedName;
    }
  } catch {
    // If we can't retrieve it, fall back to generating it
  }
  // Fall back to generating the unique name
  return getUniqueCampaignName(baseName);
}

/**
 * Check if an event name matches a search name using flexible matching.
 * Supports exact match, forward match (event contains search), and reverse match (search contains event).
 * 
 * @param eventName - The name from the event (e.g., from customEvent.detail.entityName)
 * @param searchName - The name being searched for
 * @returns True if the names match using any of the matching strategies
 */
export function matchesName(eventName: string, searchName: string): boolean {
  const event = (eventName || "").trim().toLowerCase();
  const search = (searchName || "").trim().toLowerCase();
  
  if (!event || !search) {
    return false;
  }
  
  // Exact match
  if (event === search) {
    return true;
  }
  
  // Forward match: event contains search
  if (event.includes(search)) {
    return true;
  }
  
  // Reverse match: search contains event
  if (search.includes(event)) {
    return true;
  }
  
  return false;
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

/**
 * Safely check if a locator is visible, returning false instead of throwing on timeout.
 * This is a common pattern used throughout the test helpers for defensive checks.
 * 
 * @param locator - Playwright locator to check
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 * @returns True if visible, false if not visible or timeout occurs
 */
export async function isVisibleSafely(
  locator: Locator,
  timeout: number = 1000
): Promise<boolean> {
  try {
    return await locator.isVisible({ timeout });
  } catch {
    return false;
  }
}

/**
 * Safely check if a locator is hidden, returning true instead of throwing on timeout.
 * This is a common pattern used throughout the test helpers for defensive checks.
 * 
 * @param locator - Playwright locator to check
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 * @returns True if hidden or timeout occurs, false if visible
 */
export async function isHiddenSafely(
  locator: Locator,
  timeout: number = 1000
): Promise<boolean> {
  try {
    return await locator.isHidden({ timeout });
  } catch {
    return true;
  }
}

/**
 * Safely get an attribute value from a locator, returning null instead of throwing on error.
 * This is a common pattern used throughout the test helpers for defensive attribute checks.
 * 
 * @param locator - Playwright locator to get attribute from
 * @param attributeName - Name of the attribute to get
 * @returns The attribute value, or null if not found or error occurs
 */
export async function getAttributeSafely(
  locator: Locator,
  attributeName: string
): Promise<string | null> {
  try {
    return await locator.getAttribute(attributeName);
  } catch {
    return null;
  }
}

/**
 * Safely wait for a page load state, ignoring errors.
 * This is a common pattern used throughout the test helpers for defensive page state checks.
 * 
 * @param page - Playwright page object
 * @param state - Load state to wait for ("load", "domcontentloaded", "networkidle")
 * @param timeout - Maximum time to wait in milliseconds (default: 3000)
 */
export async function waitForLoadStateSafely(
  page: Page,
  state: "load" | "domcontentloaded" | "networkidle" = "domcontentloaded",
  timeout: number = 3000
): Promise<void> {
  try {
    await page.waitForLoadState(state, { timeout });
  } catch {
    // Ignore errors - page might already be in the desired state
  }
}

/**
 * Safely get bounding box from a locator, returning null instead of throwing on error.
 * This is a common pattern used throughout the test helpers for defensive position checks.
 * 
 * @param locator - Playwright locator to get bounding box from
 * @returns The bounding box, or null if not found or error occurs
 */
export async function getBoundingBoxSafely(
  locator: Locator
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  try {
    return await locator.boundingBox();
  } catch {
    return null;
  }
}

/**
 * Create a timeout promise that resolves to a default value after a delay.
 * Useful for Promise.race patterns where you want a fallback timeout.
 * 
 * @param ms - Milliseconds to wait before resolving
 * @param defaultValue - Value to resolve with (default: false)
 * @returns Promise that resolves to defaultValue after ms
 */
export function createTimeoutPromise<T = boolean>(
  ms: number,
  defaultValue: T = false as T
): Promise<T> {
  return new Promise<T>(resolve => setTimeout(() => resolve(defaultValue), ms));
}

/**
 * Safely wait for a locator to reach a specific state, returning null instead of throwing on timeout.
 * Useful for Promise.race patterns where you want to wait for multiple things and any one succeeding is fine.
 * 
 * @param locator - Playwright locator to wait for
 * @param state - State to wait for ("visible", "hidden", "attached", "detached")
 * @param timeout - Maximum time to wait in milliseconds
 * @returns Promise that resolves when state is reached, or null on timeout
 */
export async function waitForStateSafely(
  locator: Locator,
  state: "visible" | "hidden" | "attached" | "detached",
  timeout: number
): Promise<void | null> {
  try {
    await locator.waitFor({ state, timeout });
  } catch {
    return null;
  }
}

/**
 * Safely wait for a locator with a timeout, returning null instead of throwing on timeout.
 * Useful for Promise.race patterns where you want to wait for multiple things and any one succeeding is fine.
 * 
 * @param locator - Playwright locator to wait for
 * @param timeout - Maximum time to wait in milliseconds
 * @returns Promise that resolves when locator is ready, or null on timeout
 */
export async function waitForLocatorSafely(
  locator: Locator,
  timeout: number
): Promise<void | null> {
  try {
    await locator.waitFor({ timeout });
  } catch {
    return null;
  }
}

/**
 * Safely await a promise, ignoring any errors.
 * Useful for event promises where you don't want to fail if the event doesn't fire.
 * 
 * @param promise - Promise to await safely
 * @returns Promise that resolves when the input promise resolves or rejects (ignoring errors)
 */
export async function awaitSafely(promise: Promise<unknown>): Promise<void> {
  await promise.catch(() => {});
}

/**
 * Safely await a promise that returns a boolean, defaulting to false on error.
 * Useful for Promise.race patterns where you want a boolean result.
 * 
 * @param promise - Promise that resolves to a boolean
 * @returns Promise that resolves to the boolean result, or false on error
 */
export async function awaitSafelyBoolean(promise: Promise<boolean>): Promise<boolean> {
  return await promise.catch(() => false);
}

/**
 * Safely check if a page is closed, returning false instead of throwing on error.
 * This is a common pattern used throughout the test helpers for defensive page state checks.
 * 
 * @param page - Playwright page object
 * @returns True if page is closed, false if open or error occurs
 */
export async function isPageClosedSafely(page: Page): Promise<boolean> {
  try {
    return page.isClosed();
  } catch {
    return false;
  }
}

/**
 * Safely wait for a timeout, checking if page is closed.
 * Simplified version that just checks if page is closed before waiting.
 * 
 * @param page - Playwright page object
 * @param ms - Milliseconds to wait (capped at 2000ms to avoid test timeouts)
 */
export async function safeWait(page: Page, ms: number): Promise<void> {
  // Quick check if page is closed - if so, don't wait
  if (await isPageClosedSafely(page)) {
    return;
  }
  
  // Cap the wait to avoid test timeout issues
  const cappedMs = Math.min(ms, 2000);
  
  try {
    await page.waitForTimeout(cappedMs);
  } catch {
    // If wait fails (e.g., page closed during wait), just return silently
    // The calling code will handle any issues that arise
  }
}
