import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { loginAsAdmin, loginAs, ensureLoginDialogClosed, waitForAssetUploaded } from "../helpers";
import { navigateToAssetsScreen } from "../helpers/navigation";
import { createApiClient } from "../helpers/api";
import { ensureTestUser, getStoredTestUsername } from "../helpers/users";
import { navigateAndWaitForReady } from "../helpers/utils";
import { STABILITY_WAIT_LONG } from "../helpers/constants";
import { Buffer } from "buffer";
import path from "path";
import type { Page } from "@playwright/test";

const { Given, When } = createBdd();

Given('there is an admin user', async ({ page, request }) => {
    // Ensure admin user exists with admin role via API
    // This will bootstrap the admin user if it doesn't exist
    const api = createApiClient(request);
    try {
      await api.ensureUserExists("admin", "admin123", ["admin"]);
    } catch (err) {
      const error = err as Error;
      if (error.message.includes("Cannot connect") || error.message.includes("ECONNREFUSED")) {
        throw new Error(
          `Cannot connect to auth service. Ensure the auth service is running (npm run dev:auth).`
        );
      }
      throw err;
    }
  }
);

When('the admin signs in to the system', async ({ page }) => {
  // Ensure we start with a clean page state
  // Increase timeout to handle server load when running with multiple workers
  // Use a longer stability wait for login to ensure page is fully ready
  await navigateAndWaitForReady(page, "/", {
    stabilityWait: STABILITY_WAIT_LONG
  });
  
  // Wait for page to be fully ready before attempting login
  // Additional wait to ensure React has fully rendered and state is settled
  await page.waitForTimeout(1000);
  
  // Check if already logged in after navigation (page state might have changed)
  const logoutButton = page.getByRole("button", { name: "Log out" });
  const alreadyLoggedIn = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (alreadyLoggedIn) {
    // Already logged in - no need to login again
    return;
  }
  
  // Ensure login dialog is closed before attempting to open it
  await ensureLoginDialogClosed(page);
  
  // Double-check we're not logged in after ensuring dialog is closed
  const stillNotLoggedIn = !(await logoutButton.isVisible({ timeout: 1000 }).catch(() => false));
  if (!stillNotLoggedIn) {
    // We're logged in now - no need to login again
    return;
  }
  
  // Retry login up to 3 times to handle race conditions
  let loginSucceeded = false;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await loginAsAdmin(page);
      loginSucceeded = true;
      break;
    } catch (loginError) {
      lastError = loginError as Error;
      
      // Check if we're actually logged in (maybe login succeeded but threw an error)
      const logoutButtonAfterAttempt = page.getByRole("button", { name: "Log out" });
      const isLoggedIn = await logoutButtonAfterAttempt.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isLoggedIn) {
        // We're logged in - the error was likely just a timeout or race condition
        loginSucceeded = true;
        break;
      }
      
      // If this isn't the last attempt, wait a bit longer and try again
      if (attempt < 2) {
        // Close any open dialogs and wait before retry
        await ensureLoginDialogClosed(page);
        await page.waitForTimeout(1000); // Longer delay before retry
      }
    }
  }
  
  if (!loginSucceeded && lastError) {
    // Not logged in after all retries - throw a more descriptive error
    throw new Error(
      `Login failed for admin user after 3 attempts. ` +
      `The loginAs function reported an error: ${lastError.message}. ` +
      `Please verify the admin user exists and the credentials are correct.`
    );
  }
  
  // Double-check login succeeded (loginAs should have already verified this)
  // This is a defensive check to ensure the UI has fully updated
  // Wait for page to be in a stable state (no loading indicators)
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  
  // Verify login succeeded by checking for logout button
  const logoutButtonFinal = page.getByRole("button", { name: "Log out" });
  await expect(logoutButtonFinal).toBeVisible({ timeout: 3000 });
});

Given('there is a world builder', async ({ page, request }) => {
  try {
    await ensureTestUser(page, request, "worldbuilder", "worldbuilder123", ["gm"], "__testWorldBuilderUsername");
  } catch (err) {
    const error = err as Error;
    if (error.message.includes("Cannot connect") || error.message.includes("ECONNREFUSED")) {
      throw new Error(
        `Cannot connect to auth service. Ensure the auth service is running (npm run dev:auth).`
      );
    }
    throw err;
  }
});

When('the world builder signs in to the system', async ({ page }) => {
  // Get the unique world builder username from page context
  const uniqueUsername = await getStoredTestUsername(page, "worldbuilder", "__testWorldBuilderUsername");
  const password = "worldbuilder123";
  
  // Ensure we start with a clean page state
  // Increase timeout to handle server load when running with multiple workers
  await navigateAndWaitForReady(page);
  
  // loginAs already handles logout if user is logged in
  // No need to clear storage or reload - let loginAs handle it
  try {
    await loginAs(page, uniqueUsername, password);
  } catch (loginError) {
    // loginAs should have already waited for logout button, but if it failed,
    // check if we're actually logged in
    const checkLogoutButton = page.getByRole("button", { name: "Log out" });
    const isLoggedIn = await checkLogoutButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isLoggedIn) {
      // Login definitely failed - provide detailed error
      throw new Error(
        `Login failed for user ${uniqueUsername}. ` +
        `The loginAs function reported an error: ${loginError instanceof Error ? loginError.message : String(loginError)}. ` +
        `Please verify the user was created successfully and the credentials are correct.`
      );
    }
    // If we're logged in, the error was likely just a timeout - continue
  }
  
  // Double-check login succeeded (loginAs should have already verified this)
  // This is a defensive check to ensure the UI has fully updated
  // Wait for page to be in a stable state (no loading indicators)
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  
  // Verify login succeeded by checking for logout button
  const logoutButton = page.getByRole("button", { name: "Log out" });
  await expect(logoutButton).toBeVisible({ timeout: 3000 });
});

Given('there is a game master user', async ({ page, request }) => {
  try {
    await ensureTestUser(page, request, "gamemaster", "gamemaster123", ["gm"], "__testGameMasterUsername");
  } catch (err) {
    const error = err as Error;
    if (error.message.includes("Cannot connect") || error.message.includes("ECONNREFUSED")) {
      throw new Error(
        `Cannot connect to auth service. Ensure the auth service is running (npm run dev:auth).`
      );
    }
    throw err;
  }
});

When('the game master signs in to the system', async ({ page }) => {
  // Get the unique game master username from page context
  const uniqueUsername = await getStoredTestUsername(page, "gamemaster", "__testGameMasterUsername");
  const password = "gamemaster123";
  
  // Ensure we start with a clean page state
  // Increase timeout to handle server load when running with multiple workers
  await navigateAndWaitForReady(page);
  
  // loginAs already handles logout if user is logged in
  // No need to clear storage or reload - let loginAs handle it
  try {
    await loginAs(page, uniqueUsername, password);
  } catch (loginError) {
    // loginAs should have already waited for logout button, but if it failed,
    // check if we're actually logged in
    const checkLogoutButton = page.getByRole("button", { name: "Log out" });
    const isLoggedIn = await checkLogoutButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isLoggedIn) {
      // Login definitely failed - provide detailed error
      throw new Error(
        `Login failed for user ${uniqueUsername}. ` +
        `The loginAs function reported an error: ${loginError instanceof Error ? loginError.message : String(loginError)}. ` +
        `Please verify the user was created successfully and the credentials are correct.`
      );
    }
    // If we're logged in, the error was likely just a timeout - continue
  }
  
  // Double-check login succeeded (loginAs should have already verified this)
  // This is a defensive check to ensure the UI has fully updated
  // Wait for page to be in a stable state (no loading indicators)
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  
  // Verify login succeeded by checking for logout button
  const logoutButton = page.getByRole("button", { name: "Log out" });
  await expect(logoutButton).toBeVisible({ timeout: 3000 });
});

// Admin steps for features that still use admin (e.g., world-splash-image.feature)
// These reuse the same implementation as world builder steps since both admin and gm roles can access assets
When('the admin navigates to the {string} library screen', async ({ page }, libraryName: string) => {
  if (libraryName !== "Assets") {
    throw new Error(`Library screen "${libraryName}" not yet implemented`);
  }
  
  // Reuse the same implementation as world builder (admin also has access to assets)
  await page.route("**/mock-assets/**", async (route) => {
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: pngBuffer
    });
  });

  await ensureLoginDialogClosed(page);
  
  const logoutButton = page.getByRole("button", { name: "Log out" });
  const isLoggedIn = await logoutButton.isVisible({ timeout: 3000 }).catch(() => false);
  
  if (!isLoggedIn) {
    const loginButton = page.getByRole("button", { name: "Login" });
    const loginButtonVisible = await loginButton.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (loginButtonVisible) {
      throw new Error(
        "User is not logged in. The 'When the admin signs in to the system' step must run before this step."
      );
    } else {
      throw new Error(
        "Cannot determine login state. Logout button not visible and Login button not found. " +
        "The page may be in an unexpected state. Ensure the login step completed successfully."
      );
    }
  }
  
  await navigateToAssetsScreen(page);
});

When('the admin uploads an image asset {string}', async ({ page }, fileName: string) => {
  // Navigate to Assets screen first (if not already there)
  await navigateToAssetsScreen(page);
  
  // Set up image route interception before any image requests
  // Intercept image requests and return a valid 1x1 PNG
  await page.route("**/mock-assets/**", async (route) => {
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: pngBuffer
    });
  });
  
  // Extract asset name from fileName (without extension) for matching
  const assetNameBase = fileName.replace(/\.(jpg|png|jpeg|gif)$/i, "");
  
  // Check if asset already exists before uploading (optimization: skip upload if already present)
  const assetRow = page.getByRole("row").filter({ hasText: fileName }).first();
  const assetExists = await assetRow.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (assetExists) {
    // Asset already exists - no need to upload again
    return;
  }
  
  // Set up event listener BEFORE uploading
  // Reduced timeout from 15000ms to 10000ms for better performance
  const assetUploadedPromise = waitForAssetUploaded(page, assetNameBase, 10000);
  
  const fileInput = page.getByLabel("Upload asset");
  const filePath = path.join(process.cwd(), "seeds", "assets", "images", fileName);
  
  await fileInput.setInputFiles(filePath);
  
  // Wait for the asset upload event
  await assetUploadedPromise;
});

When("no campaign is selected", async ({ page }) => {
  // Silently check if a campaign is currently selected
  // If one is selected, use "Leave Campaign" from Snapp menu to deselect
  // This step should never throw errors - it's just a helper to ensure clean state
  
  try {
    // Quick check if campaign views are visible (indicates a campaign is selected)
    const campaignViewsVisible = await page
      .getByRole("tablist", { name: "Campaign views" })
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    
    if (!campaignViewsVisible) {
      // No campaign selected, we're done
      return;
    }
    
    // Campaign is selected - try to deselect it
    // Use very short timeouts and catch all errors to avoid causing issues
    try {
      const snappButton = page.getByRole("button", { name: /^Snapp/i });
      await snappButton.click({ timeout: 1000 }).catch(() => {});
      
      const leaveCampaignButton = page.getByRole("button", { name: "Leave Campaign" });
      await leaveCampaignButton.isVisible({ timeout: 1000 }).catch(() => false);
      await leaveCampaignButton.click({ timeout: 1000 }).catch(() => {});
      
      // Wait for campaign to be deselected (campaign tab should disappear or become inactive)
      // Check if we're back to world selector or campaign tab is no longer selected
      await page.waitForLoadState("domcontentloaded", { timeout: 1000 }).catch(() => {});
    } catch {
      // Any error - silently ignore and continue
      // The test will handle the state naturally
    }
  } catch {
    // Any outer error - silently ignore
    // This step is just a helper, not critical
  }
});
