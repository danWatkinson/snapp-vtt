import { Page } from "@playwright/test";
import { getUniqueCampaignName } from "./nameUtils";

/**
 * Generic helper to get a stored value from page context.
 * Falls back to a provided default value if not stored.
 * 
 * @param page - Playwright page object
 * @param key - Key in window object (e.g., "__testWorldName")
 * @param defaultValue - Default value if not stored
 * @returns The stored value or default
 */
export async function getStoredValue<T>(
  page: Page,
  key: string,
  defaultValue: T
): Promise<T> {
  try {
    const stored = await page.evaluate((k) => {
      return (window as any)[k];
    }, key);
    if (stored !== undefined && stored !== null) {
      return stored;
    }
  } catch {
    // Can't retrieve - fall back to default
  }
  return defaultValue;
}

/**
 * Store a value in page context for later retrieval.
 * 
 * @param page - Playwright page object
 * @param key - Key in window object (e.g., "__testWorldName")
 * @param value - Value to store
 */
export async function storeValue<T>(
  page: Page,
  key: string,
  value: T
): Promise<void> {
  await page.evaluate(({ k, v }) => {
    (window as any)[k] = v;
  }, { k: key, v: value });
}

/**
 * Get the unique campaign name that was stored in the page context.
 * This is used to retrieve the actual campaign name when tests need to reference it.
 */
export async function getStoredCampaignName(page: Page, baseName: string): Promise<string> {
  // Try to get stored campaign name with retry logic (page context might not be ready)
  let campaignName: string | null = null;
  for (let i = 0; i < 5; i++) {
    try {
      campaignName = await page.evaluate(() => {
        return (window as any).__testCampaignName;
      });
      if (campaignName) break;
    } catch {
      // Page might not be ready yet, wait and retry
      // Use a simple timeout instead of importing safeWait to avoid circular dependency
      try {
        await page.waitForTimeout(200);
      } catch {
        // Ignore if page is closed
      }
    }
  }
  
  if (campaignName) {
    return campaignName;
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
 * Clear all storage (cookies and localStorage).
 * Useful for logging out or resetting session state.
 * 
 * @param page - Playwright page object
 */
export async function clearAllStorage(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
}
