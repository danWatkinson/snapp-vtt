import { Page } from "@playwright/test";
import { getStoredValue } from "../utils";

/**
 * Store a world name in page context for later retrieval.
 */
export async function storeWorldName(page: Page, worldName: string): Promise<void> {
  await page.evaluate((name) => {
    (window as any).__testWorldName = name;
  }, worldName);
}

/**
 * Get the stored world name from page context.
 * This retrieves the world name that was stored via storeWorldName.
 */
export async function getStoredWorldName(page: Page, baseName: string): Promise<string> {
  return await getStoredValue<string>(page, "__testWorldName", baseName);
}
