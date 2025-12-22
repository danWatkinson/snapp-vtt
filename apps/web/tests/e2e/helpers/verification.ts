import { Page, expect } from "@playwright/test";
import { VISIBILITY_TIMEOUT_MEDIUM } from "./constants";

/**
 * Verify that an entity appears in a list by checking for a listitem with matching text.
 * This is a common pattern used across many "Then" steps.
 * 
 * @param page - Playwright page object
 * @param entityName - Name of the entity to look for
 * @param timeout - Timeout in milliseconds (default: 3000)
 */
export async function verifyEntityInList(
  page: Page,
  entityName: string,
  timeout: number = VISIBILITY_TIMEOUT_MEDIUM
): Promise<void> {
  await expect(
    page.getByRole("listitem").filter({ hasText: entityName }).first()
  ).toBeVisible({ timeout });
}

/**
 * Check if an entity exists in a list without throwing an error.
 * Useful for existence checks before creation.
 * 
 * @param page - Playwright page object
 * @param entityName - Name of the entity to look for
 * @param timeout - Timeout in milliseconds (default: 1000)
 * @returns true if entity exists, false otherwise
 */
export async function entityExistsInList(
  page: Page,
  entityName: string,
  timeout: number = 1000
): Promise<boolean> {
  try {
    const entity = page.getByRole("listitem").filter({ hasText: entityName }).first();
    await expect(entity).toBeVisible({ timeout });
    return true;
  } catch {
    return false;
  }
}
