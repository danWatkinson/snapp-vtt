import { Page, expect } from "@playwright/test";
import { MAIN_TAB_CHANGED_EVENT } from "../../../../lib/auth/authEvents";
import { DEFAULT_EVENT_TIMEOUT } from "../constants";
import { isVisibleSafely, safeWait } from "../utils";

/**
 * Wait for the main tab to change using transition events.
 * 
 * @param page - Playwright page object
 * @param tab - Name of the tab to wait for ("World", "Campaigns", "Sessions", "Assets", "Users")
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForMainTab(
  page: Page,
  tab: "World" | "Campaigns" | "Sessions" | "Assets" | "Users",
  timeout: number = DEFAULT_EVENT_TIMEOUT
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ tab, timeout, eventName }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventTab = customEvent.detail?.tab;
          
          if (eventTab === tab && !resolved) {
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
            reject(new Error(`Timeout waiting for main tab "${tab}" to be activated after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { tab, timeout, eventName: MAIN_TAB_CHANGED_EVENT }
  );

  // Fallback: Wait for tab-specific UI elements to appear
  const domPromise = (async () => {
    // Map tab names to data-component attributes or headings
    const tabToSelector: Record<string, string> = {
      World: '[data-component="WorldTab"]',
      Campaigns: '[data-component="CampaignsTab"]',
      Sessions: '[data-component="SessionsTab"]',
      Assets: '[data-component="AssetsTab"]',
      Users: '[data-component="UsersTab"]'
    };
    
    const selector = tabToSelector[tab];
    if (selector) {
      await page.waitForSelector(selector, { timeout });
    } else {
      // Fallback: wait a bit for any tab change
      await safeWait(page, timeout);
    }
  })();

  // Wait for EITHER the event OR the DOM element to be ready
  await Promise.race([
    eventPromise.catch(() => Promise.resolve()), // Don't fail if event doesn't fire
    domPromise
  ]);
}
