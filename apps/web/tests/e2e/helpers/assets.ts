import { Page, expect } from "@playwright/test";
import { ASSET_UPLOADED_EVENT } from "../../../lib/auth/authEvents";
import { DEFAULT_EVENT_TIMEOUT } from "./constants";
import { waitForEventWithNameFilter } from "./utils";

/**
 * Wait for an asset to be uploaded using transition events.
 * 
 * @param page - Playwright page object
 * @param assetName - Optional asset name to wait for (if not provided, waits for any asset upload)
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 */
export async function waitForAssetUploaded(
  page: Page,
  assetName?: string,
  timeout: number = 10000
): Promise<void> {
  if (assetName) {
    // Wait for specific asset with name filter
    await waitForEventWithNameFilter(
      page,
      ASSET_UPLOADED_EVENT,
      "assetName",
      assetName,
      timeout,
      `Timeout waiting for asset "{name}" to be uploaded after ${timeout}ms`,
      async () => {
        // Fallback: Wait for asset to appear in the assets table
        // Use .first() to avoid strict mode violations if multiple rows match
        const assetRow = page.getByRole("row").filter({ hasText: assetName }).first();
        await expect(assetRow).toBeVisible({ timeout });
      }
    );
  } else {
    // Wait for any asset upload (no name filter)
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
              reject(new Error(`Timeout waiting for asset to be uploaded after ${timeout}ms`));
            }
          }, timeout);
        });
      },
      { timeout, eventName: ASSET_UPLOADED_EVENT }
    );

    await eventPromise;
  }
}
