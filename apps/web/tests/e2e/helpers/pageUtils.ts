import { Page } from "@playwright/test";

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
