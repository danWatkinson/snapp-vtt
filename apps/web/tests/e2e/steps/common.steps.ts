import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { loginAsAdmin, loginAs, ensureLoginDialogClosed, getUniqueUsername, waitForAssetUploaded } from "../helpers";
import { Buffer } from "buffer";
import path from "path";
import type { APIRequestContext } from "@playwright/test";

const { Given, When } = createBdd();

// Helper to get the unique world builder username from page context
async function getStoredWorldBuilderUsername(page: any): Promise<string> {
  try {
    const storedName = await page.evaluate(() => {
      return (window as any).__testWorldBuilderUsername;
    });
    if (storedName) {
      return storedName;
    }
  } catch {
    // Can't retrieve - fall back to unique name generation
  }
  // Fall back to generating unique name if not stored
  return getUniqueUsername("worldbuilder");
}

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL ??
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ??
  "https://localhost:4400";

// Helper to make API calls to auth service using Playwright's request context
async function apiCall(
  request: APIRequestContext,
  method: string,
  path: string,
  options: { body?: any; token?: string } = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const url = `${AUTH_SERVICE_URL}${path}`;
  const response = await request.fetch(url, {
    method,
    headers,
    data: options.body,
    ignoreHTTPSErrors: true
  });

  if (!response.ok()) {
    const status = response.status();
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage = errorBody.error ?? `API call failed with status ${status}`;
    throw new Error(`${errorMessage} (${method} ${url})`);
  }

  return response.json();
}

// Helper to bootstrap admin user if it doesn't exist
async function ensureAdminUserExists(request: APIRequestContext): Promise<void> {
  try {
    // Try to login first
    const loginResponse = await request.fetch(`${AUTH_SERVICE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: { username: "admin", password: "admin123" },
      ignoreHTTPSErrors: true
    });

    if (loginResponse.ok()) {
      // Admin user exists, we're good
      return;
    }
  } catch {
    // Login failed, try to bootstrap
  }

  // Admin doesn't exist or login failed - try to bootstrap
  try {
    const bootstrapResponse = await request.fetch(`${AUTH_SERVICE_URL}/bootstrap/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: { username: "admin", password: "admin123", roles: ["admin"] },
      ignoreHTTPSErrors: true
    });

    if (!bootstrapResponse.ok()) {
      const errorBody = await bootstrapResponse.json().catch(() => ({}));
      // If bootstrap says users exist, try login again
      if (errorBody.error?.includes("users exist")) {
        // Users exist but login failed - this is an error
        throw new Error("Admin user should exist but login failed");
      }
      throw new Error(`Bootstrap failed: ${errorBody.error || "Unknown error"}`);
    }
  } catch (err) {
    const error = err as Error;
    if (error.message.includes("ECONNREFUSED") || error.message.includes("Failed to fetch")) {
      throw new Error(
        `Cannot connect to auth service at ${AUTH_SERVICE_URL}. Ensure the auth service is running (npm run dev:auth).`
      );
    }
    throw error;
  }
}

// Helper to get admin token for API calls
// Creates admin user if it doesn't exist
async function getAdminToken(request: APIRequestContext): Promise<string> {
  // Ensure admin user exists first
  await ensureAdminUserExists(request);

  const url = `${AUTH_SERVICE_URL}/auth/login`;
  const response = await request.fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: { username: "admin", password: "admin123" },
    ignoreHTTPSErrors: true
  });

  if (!response.ok()) {
    const status = response.status();
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage = errorBody.error ?? `HTTP ${status}`;
    throw new Error(
      `Login failed: ${errorMessage} (status ${status}). Check that auth service is running at ${AUTH_SERVICE_URL}.`
    );
  }

  const body = await response.json();
  if (!body.token) {
    throw new Error("Login response missing token");
  }
  return body.token;
}

Given('there is an admin user', async ({ page, request }) => {
    // Ensure admin user exists with admin role via API
    // This will bootstrap the admin user if it doesn't exist
    try {
      const adminToken = await getAdminToken(request);
      
      // Verify admin has admin role, update if needed
      try {
        const user = await apiCall(request, "GET", "/users/admin", { token: adminToken });
        if (!user.user.roles.includes("admin")) {
          await apiCall(request, "PUT", "/users/admin/roles", {
            token: adminToken,
            body: { roles: ["admin"] }
          });
        }
      } catch (err) {
        // User should exist after getAdminToken, but if not, create via API
        await apiCall(request, "POST", "/users", {
          token: adminToken,
          body: { username: "admin", password: "admin123", roles: ["admin"] }
        });
      }
    } catch (err) {
      const error = err as Error;
      if (error.message.includes("Cannot connect") || error.message.includes("ECONNREFUSED")) {
        throw new Error(
          `Cannot connect to auth service at ${AUTH_SERVICE_URL}. Ensure the auth service is running (npm run dev:auth).`
        );
      }
      throw err;
    }
  }
);

When('the admin signs in to the system', async ({ page }) => {
  // Ensure we start with a clean page state
  // Increase timeout to handle server load when running with multiple workers
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  
  // loginAsAdmin (which calls loginAs) already handles logout if user is logged in
  // No need to clear storage or reload - let loginAs handle it
  try {
    await loginAsAdmin(page);
  } catch (loginError) {
    // loginAs should have already waited for logout button, but if it failed,
    // check if we're actually logged in
    const logoutButton = page.getByRole("button", { name: "Log out" });
    const isLoggedIn = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isLoggedIn) {
      // Not logged in - throw a more descriptive error
      throw new Error(
        `Login failed for admin user. ` +
        `The loginAs function reported an error: ${loginError instanceof Error ? loginError.message : String(loginError)}. ` +
        `Please verify the admin user exists and the credentials are correct.`
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

Given('there is a world builder', async ({ page, request }) => {
  // Generate a unique username for this test to avoid conflicts
  const uniqueUsername = getUniqueUsername("worldbuilder");
  const password = "worldbuilder123";
  
  // Create the user via API using admin credentials
  let userCreated = false;
  try {
    const adminToken = await getAdminToken(request);
    
    // Try to create the user with gm role
    try {
      await apiCall(request, "POST", "/users", {
        token: adminToken,
        body: { username: uniqueUsername, password, roles: ["gm"] }
      });
      userCreated = true;
    } catch (createErr: any) {
      // If user already exists (409), verify they have the gm role
      if (createErr.message?.includes("409") || createErr.message?.includes("already exists")) {
        try {
          const user = await apiCall(request, "GET", `/users/${uniqueUsername}`, { token: adminToken });
          if (!user.user.roles.includes("gm")) {
            await apiCall(request, "PUT", `/users/${uniqueUsername}/roles`, {
              token: adminToken,
              body: { roles: ["gm"] }
            });
          }
          userCreated = true; // User exists and has correct role
        } catch (verifyErr) {
          throw new Error(
            `Failed to verify/update user ${uniqueUsername}: ${verifyErr instanceof Error ? verifyErr.message : String(verifyErr)}`
          );
        }
      } else {
        // Some other error creating user
        throw new Error(
          `Failed to create user ${uniqueUsername}: ${createErr.message || String(createErr)}`
        );
      }
    }
  } catch (err) {
    const error = err as Error;
    if (error.message.includes("Cannot connect") || error.message.includes("ECONNREFUSED")) {
      throw new Error(
        `Cannot connect to auth service at ${AUTH_SERVICE_URL}. Ensure the auth service is running (npm run dev:auth).`
      );
    }
    throw err;
  }
  
  if (!userCreated) {
    throw new Error(`Failed to ensure user ${uniqueUsername} exists with gm role`);
  }
  
  // Store the username in page context for other steps to use
  await page.evaluate((username) => {
    (window as any).__testWorldBuilderUsername = username;
  }, uniqueUsername);
});

When('the world builder signs in to the system', async ({ page }) => {
  // Get the unique world builder username from page context
  const uniqueUsername = await getStoredWorldBuilderUsername(page);
  const password = "worldbuilder123";
  
  // Ensure we start with a clean page state
  // Increase timeout to handle server load when running with multiple workers
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  
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
  
  await page.getByRole("button", { name: "Snapp" }).click();
  
  // Wait for the Manage Assets button to be visible (indicates menu is open and rendered)
  // This ensures the menu is fully rendered and role checks have passed
  await expect(page.getByRole("button", { name: "Manage Assets" })).toBeVisible({ timeout: 3000 });
  
  await page.getByRole("button", { name: "Manage Assets" }).click();
  await expect(page.getByRole("heading", { name: "Assets" })).toBeVisible({ timeout: 5000 });
});

When('the admin uploads an image asset {string}', async ({ page }, fileName: string) => {
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
