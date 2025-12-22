import { Page, Locator } from "@playwright/test";

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
