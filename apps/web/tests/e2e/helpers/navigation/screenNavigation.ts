import { Page, expect } from "@playwright/test";
import { VISIBILITY_TIMEOUT_MEDIUM, VISIBILITY_TIMEOUT_LONG } from "../constants";
import { ensureLoginDialogClosed } from "../auth";
import { isVisibleSafely } from "../utils";

/**
 * Navigate to the Users management screen.
 * Checks if already on the screen and navigates only if needed.
 */
export async function navigateToUsersScreen(page: Page): Promise<void> {
  // Check if already on Users screen
  const usersTab = page.locator('[data-component="UsersTab"]');
  const isOnUsersScreen = await isVisibleSafely(usersTab, 1000);
  
  if (isOnUsersScreen) {
    return; // Already on Users screen
  }
  
  // Navigate to Users screen
  await ensureLoginDialogClosed(page);
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  
  // Open Snapp menu
  await page.getByRole("button", { name: /^Snapp/i }).click();
  
  // Wait for User Management button to appear
  await expect(page.getByRole("button", { name: "User Management" })).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  
  // Click User Management
  await page.getByRole("button", { name: "User Management" }).click();
  
  // Wait for UsersTab to be visible
  await page.waitForSelector('[data-component="UsersTab"]', { timeout: VISIBILITY_TIMEOUT_MEDIUM });
}

/**
 * Navigate to the Assets management screen.
 * Checks if already on the screen and navigates only if needed.
 */
export async function navigateToAssetsScreen(page: Page): Promise<void> {
  // Check if already on Assets screen
  const assetsHeading = page.getByRole("heading", { name: "Assets" });
  const isOnAssetsScreen = await isVisibleSafely(assetsHeading, 1000);
  
  if (isOnAssetsScreen) {
    return; // Already on Assets screen
  }
  
  // Navigate to Assets screen
  await ensureLoginDialogClosed(page);
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  
  // Open Snapp menu
  await page.getByRole("button", { name: /^Snapp/i }).click();
  
  // Wait for Manage Assets button to appear
  await expect(page.getByRole("button", { name: "Manage Assets" })).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  
  // Click Manage Assets
  await page.getByRole("button", { name: "Manage Assets" }).click();
  
  // Wait for Assets heading to be visible
  await expect(page.getByRole("heading", { name: "Assets" })).toBeVisible({ timeout: VISIBILITY_TIMEOUT_LONG });
}
