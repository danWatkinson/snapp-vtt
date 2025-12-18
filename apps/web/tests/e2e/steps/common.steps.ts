import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { loginAsAdmin, loginAs, ensureLoginDialogClosed, getUniqueUsername } from "../helpers";
import { Buffer } from "buffer";
import path from "path";
import type { APIRequestContext } from "@playwright/test";

const { Given, When } = createBdd();

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

Given(
  'there is an admin user "admin" with the "admin" role',
  async ({ page, request }) => {
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

When('the admin signs in to the system as "admin"', async ({ page }) => {
  // Ensure we start with a clean page state
  // Increase timeout to handle server load when running with multiple workers
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  
  // Clear any existing auth state
  try {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch {
    // If we can't clear storage, that's okay - continue
  }
  
  // Now login - use try/catch to handle errors gracefully
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
  const logoutButton = page.getByRole("button", { name: "Log out" });
  const isLoggedIn = await logoutButton.isVisible({ timeout: 3000 }).catch(() => false);
  
  if (!isLoggedIn) {
    // Detailed error messages based on page state
    const loginButton = page.getByRole("button", { name: "Login" });
    const loginButtonVisible = await loginButton.isVisible({ timeout: 1000 }).catch(() => false);
    if (loginButtonVisible) {
      throw new Error(
        `Login did not complete for admin user. The login button is still visible, ` +
        `which means authentication failed. Please check: ` +
        `1. The admin user exists, ` +
        `2. The password is correct, ` +
        `3. The auth service is running and accessible.`
      );
    } else {
      throw new Error(
        `Login state unclear for admin user. Neither login nor logout button is visible. ` +
        `The page may be in an unexpected state.`
      );
    }
  }
});

When('the world builder signs in to the system as "worldbuilder"', async ({ page, request }) => {
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
  
  // Wait a moment for the auth service to fully process the user creation
  // This helps avoid race conditions where we try to login before the user is available
  await page.waitForTimeout(500);
  
  // Navigate to a clean page state first (must be on a valid origin to access localStorage)
  // Increase timeout to handle server load when running with multiple workers
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 15000 });
  
  // Wait for the page to be fully loaded and ready
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {
    // If networkidle times out, that's okay - continue anyway
  });
  
  // Now that we're on a valid origin, clear any existing auth state
  // This prevents issues from previous test runs or manual debugging
  try {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    // Reload the page after clearing storage to ensure clean state
    // This helps prevent issues where the UI hasn't updated after clearing storage
    await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
    // Wait for page to be ready after reload
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  } catch (storageError) {
    // If we can't clear storage (e.g., security error), that's okay - continue
    // The login process will handle authentication state
  }
  
  // Store the username in page context for other steps to use
  await page.evaluate((username) => {
    (window as any).__testWorldBuilderUsername = username;
  }, uniqueUsername);
  
  // Now log in with the unique username
  // The loginAs function should handle the login flow and wait for logout button
  // But we add an additional check here to ensure login completed
  try {
    await loginAs(page, uniqueUsername, password);
  } catch (loginError) {
    // loginAs should have already waited for logout button, but if it failed,
    // check if we're actually logged in
    const logoutButton = page.getByRole("button", { name: "Log out" });
    const isLoggedIn = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false);
    
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
  // Wait a bit for the page to stabilize after login
  await page.waitForTimeout(500);
  
  // Wait for page to be in a stable state (no loading indicators)
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  
  // Check for logout button with retries (page might be in transition)
  let logoutButton = page.getByRole("button", { name: "Log out" });
  let isLoggedIn = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false);
  
  // If not visible, wait a bit more and retry (page might be loading)
  if (!isLoggedIn) {
    await page.waitForTimeout(500);
    logoutButton = page.getByRole("button", { name: "Log out" });
    isLoggedIn = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false);
  }
  
  // If still not visible, check if page is loading or in an error state
  if (!isLoggedIn) {
    // Check if login button is visible (definitely not logged in)
    const loginButton = page.getByRole("button", { name: "Login" });
    const loginButtonVisible = await loginButton.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (loginButtonVisible) {
      throw new Error(
        `Login did not complete for user ${uniqueUsername}. The login button is still visible, ` +
        `which means authentication failed. Please check: ` +
        `1. The user ${uniqueUsername} was created successfully, ` +
        `2. The password is correct, ` +
        `3. The auth service is running and accessible.`
      );
    } else {
      // Neither button visible - page might be loading or in transition
      // Wait a bit more and check one more time
      await page.waitForTimeout(1000);
      await page.waitForLoadState("domcontentloaded", { timeout: 2000 }).catch(() => {});
      
      const finalLogoutCheck = page.getByRole("button", { name: "Log out" });
      const finalLoginCheck = page.getByRole("button", { name: "Login" });
      const finalLoggedIn = await finalLogoutCheck.isVisible({ timeout: 1000 }).catch(() => false);
      const finalLoginVisible = await finalLoginCheck.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (finalLoggedIn) {
        // We're logged in now, that's fine
        return;
      } else if (finalLoginVisible) {
        throw new Error(
          `Login did not complete for user ${uniqueUsername}. The login button is still visible after waiting. ` +
          `This suggests authentication failed. Please verify the user was created and credentials are correct.`
        );
      } else {
        throw new Error(
          `Login state unclear for user ${uniqueUsername}. Neither login nor logout button is visible after waiting. ` +
          `The page may be in a loading or error state. Current URL: ${page.url()}`
        );
      }
    }
  }
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
        "User is not logged in. The 'When the admin signs in to the system as \"admin\"' step must run before this step."
      );
    } else {
      throw new Error(
        "Cannot determine login state. Logout button not visible and Login button not found. " +
        "The page may be in an unexpected state. Ensure the login step completed successfully."
      );
    }
  }
  
  await page.getByRole("button", { name: "Snapp" }).click();
  
  // Wait a moment for the menu to open and render
  await page.waitForTimeout(200);
  
  // Wait for the Manage Assets button to be visible
  // This ensures the menu is fully rendered and role checks have passed
  await expect(page.getByRole("button", { name: "Manage Assets" })).toBeVisible({ timeout: 3000 });
  
  await page.getByRole("button", { name: "Manage Assets" }).click();
  await page.waitForTimeout(200);
  await expect(page.getByRole("heading", { name: "Assets" })).toBeVisible({ timeout: 5000 });
});

When('the admin uploads an image asset {string}', async ({ page }, fileName: string) => {
  // Reuse the same implementation as world builder
  const fileInput = page.getByLabel("Upload asset");
  const filePath = path.join(process.cwd(), "seeds", "assets", "images", fileName);
  
  await fileInput.setInputFiles(filePath);
  await page.waitForTimeout(500);
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
      
      // Brief wait for state update
      await page.waitForTimeout(100).catch(() => {});
    } catch {
      // Any error - silently ignore and continue
      // The test will handle the state naturally
    }
  } catch {
    // Any outer error - silently ignore
    // This step is just a helper, not critical
  }
});
