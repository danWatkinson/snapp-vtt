import { Page } from "@playwright/test";
import { STABILITY_WAIT_MEDIUM } from "./constants";
import { safeWait } from "./pageUtils";

// Re-export event waiting functions for backward compatibility
export {
  waitForSimpleEvent,
  waitForEventWithNameFilter,
  waitForEventWithIdFilter
} from "./eventWaiting";

// Re-export DOM utilities for backward compatibility
export {
  isVisibleSafely,
  isHiddenSafely,
  getAttributeSafely,
  waitForLoadStateSafely,
  getBoundingBoxSafely,
  waitForStateSafely,
  waitForLocatorSafely
} from "./domUtils";

// Re-export storage utilities for backward compatibility
export {
  getStoredValue,
  storeValue,
  getStoredCampaignName,
  getStoredWorldName,
  clearAllStorage
} from "./storageUtils";

// Re-export name utilities for backward compatibility
export {
  matchesName,
  getUniqueCampaignName,
  getUniqueUsername
} from "./nameUtils";

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

// Re-export page utilities for backward compatibility
export {
  isPageClosedSafely,
  safeWait
} from "./pageUtils";

/**
 * Navigate to a URL and wait for the page to be ready.
 * This is a common pattern used across step definitions.
 * 
 * @param page - Playwright page object
 * @param url - URL to navigate to (default: "/")
 * @param options - Optional navigation options
 */
export async function navigateAndWaitForReady(
  page: Page,
  url: string = "/",
  options?: {
    waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
    timeout?: number;
    waitForNetworkIdle?: boolean;
    networkIdleTimeout?: number;
    stabilityWait?: number;
  }
): Promise<void> {
  const {
    waitUntil = "domcontentloaded",
    timeout = 15000,
    waitForNetworkIdle = true,
    networkIdleTimeout = 5000,
    stabilityWait = STABILITY_WAIT_MEDIUM
  } = options || {};
  
  await page.goto(url, { waitUntil, timeout });
  
  if (waitForNetworkIdle) {
    await page.waitForLoadState("networkidle", { timeout: networkIdleTimeout }).catch(() => {});
  }
  
  await safeWait(page, stabilityWait);
}
