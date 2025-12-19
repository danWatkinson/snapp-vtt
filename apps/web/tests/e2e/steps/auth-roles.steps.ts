import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { loginAs, ensureLoginDialogClosed, getUniqueUsername, waitForRoleAssigned, waitForError } from "../helpers";
import jwt from "jsonwebtoken";
import type { APIRequestContext } from "@playwright/test";
// Note: common.steps.ts is automatically loaded by playwright-bdd (no import needed)

// Helper to get the unique alice username from page context
async function getStoredAliceUsername(page: any): Promise<string> {
  try {
    const storedName = await page.evaluate(() => {
      return (window as any).__testAliceUsername;
    });
    if (storedName) {
      return storedName;
    }
  } catch {
    // Can't retrieve - fall back to unique name generation
  }
  // Fall back to generating unique name if not stored
  return getUniqueUsername("alice");
}

const { Given, When, Then } = createBdd();

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL ??
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ??
  "https://localhost:4400";
const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? "dev-secret";

// Helper to make API calls to auth service using Playwright's request context
async function apiCall(
  request: APIRequestContext,
  method: string,
  path: string,
  options: { body?: any; token?: string } = {}
) {
  // Check if request context is still valid
  if (!request || (request as any).__disposed) {
    throw new Error("Request context was disposed before API call");
  }
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const url = `${AUTH_SERVICE_URL}${path}`;
  let response;
  try {
    response = await request.fetch(url, {
      method,
      headers,
      data: options.body,
      ignoreHTTPSErrors: true
    });
  } catch (error: any) {
    if (error.message?.includes("disposed") || error.message?.includes("Request context")) {
      throw new Error(`Request context was disposed during API call to ${method} ${url}. This may indicate concurrent test execution issues.`);
    }
    throw error;
  }

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

Given('there is a test user', async ({ page, request }) => {
  // Generate unique username per worker to avoid concurrency issues
  const uniqueAliceName = getUniqueUsername("alice");
  
  // Store the unique name in page context for other steps to use
  await page.evaluate((username) => {
    (window as any).__testAliceUsername = username;
  }, uniqueAliceName);
  
  // Ensure alice user exists with no roles via API
  const adminToken = await getAdminToken(request);
  
  try {
    // Try to get the user first
    const user = await apiCall(request, "GET", `/users/${uniqueAliceName}`, { token: adminToken });
    // User exists - ensure no roles
    if (user.user.roles.length > 0) {
      await apiCall(request, "PUT", `/users/${uniqueAliceName}/roles`, {
        token: adminToken,
        body: { roles: [] }
      });
    }
  } catch (err) {
    // User doesn't exist - create it
    await apiCall(request, "POST", "/users", {
      token: adminToken,
      body: { username: uniqueAliceName, password: "alice123", roles: [] }
    });
  }
});

// Common steps (admin user setup, admin login) are imported from common.steps.ts

When('the admin navigates to the "Users" management screen', async ({ page }) => {
  // Ensure login dialog is closed (it blocks clicks if open)
  await ensureLoginDialogClosed(page);
  
  // Verify we're logged in as admin (User Management is only visible to admin)
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible({ timeout: 3000 });
  
  // Use the Snapp menu's "User Management" entry, which doesn't require a world to be selected
  await page.getByRole("button", { name: /^Snapp/i }).click();
  
  // Wait for the menu to be visible and the User Management button to appear
  // This ensures the menu is fully rendered and role checks have passed
  await expect(page.getByRole("button", { name: "User Management" })).toBeVisible({ timeout: 3000 });
  
  await page.getByRole("button", { name: "User Management" }).click();
  
  // Wait for the Users tab to be visible (it may take a moment for the state to update and component to render)
  await page.waitForSelector('[data-component="UsersTab"]', { timeout: 3000 });
});

When(
  'the admin assigns the "gm" role to the test user',
  async ({ page }) => {
    // Get the unique alice username
    const uniqueAliceName = await getStoredAliceUsername(page);
    
    // Fill in the form to assign GM role
    await page.getByTestId("assign-target-username").fill(uniqueAliceName);
    await page.getByTestId("assign-role").fill("gm");
    await page.getByRole("button", { name: "Assign role" }).click();

    // Set up event listeners BEFORE clicking submit
    // Reduced timeout from 10000ms to 5000ms for better performance
    const roleAssignedPromise = waitForRoleAssigned(page, uniqueAliceName, "gm", 5000);
    const errorPromise = waitForError(page, undefined, 5000).catch(() => null);
    
    // Wait for either role assignment or error
    await Promise.race([
      roleAssignedPromise,
      errorPromise.then((errorMsg) => {
        if (errorMsg) throw new Error(`Role assignment failed: ${errorMsg}`);
      })
    ]);
  }
);

Then(
  'the UI shows that the test user has role "gm"',
  async ({ page }) => {
    // Get the unique alice username
    const uniqueAliceName = await getStoredAliceUsername(page);
    
    // Clear storage to logout admin first
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto("/");
    
    await loginAs(page, uniqueAliceName, "alice123");

    // Verify login succeeded by checking for authenticated UI
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible({ timeout: 3000 });

    // Check that the header displays alice's roles
    // The header shows "Logged in as alice (gm)" when alice has the gm role
    const rolesDisplay = page.getByTestId("user-roles-display");
    await expect(rolesDisplay).toBeVisible({ timeout: 3000 });
    
    // Verify it shows alice with gm role (use unique name for matching)
    await expect(rolesDisplay.getByText(new RegExp(uniqueAliceName))).toBeVisible({ timeout: 3000 });
    await expect(rolesDisplay.getByText(/gm/)).toBeVisible({ timeout: 3000 });
  }
);

When('the test user signs in to the system', async ({ page }) => {
  // Get the unique alice username
  const uniqueAliceName = await getStoredAliceUsername(page);
  
  // Clear any existing session
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  // Use domcontentloaded instead of load - faster and more reliable
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 15000 });
  
  await loginAs(page, uniqueAliceName, "alice123");
});

Then(
  'the issued access token for the test user contains role "gm"',
  async ({ page, request }) => {
    // Ensure request context is still valid (may be disposed during concurrent execution)
    if (!request) {
      throw new Error("Request context was disposed. This may indicate a test isolation issue.");
    }
    
    // Get the unique alice username
    const uniqueAliceName = await getStoredAliceUsername(page);
    
    // First, verify that alice actually has the gm role by checking the user via API
    // This ensures the role assignment was persisted before we check the token
    const adminToken = await getAdminToken(request);
    let userData;
    try {
      userData = await apiCall(request, "GET", `/users/${uniqueAliceName}`, { token: adminToken });
    } catch (error: any) {
      throw new Error(`Failed to verify alice's roles before token check: ${error.message}`);
    }
    
    if (!userData.user?.roles?.includes("gm")) {
      throw new Error(`Alice (${uniqueAliceName}) does not have the "gm" role assigned. Current roles: ${JSON.stringify(userData.user?.roles || [])}`);
    }
    
    // Get the token by logging in as alice via API (since UI login stores it in React state, not localStorage)
    // Retry if request context is disposed (can happen during concurrent execution)
    let loginResponse;
    let retries = 3;
    while (retries > 0) {
      try {
        // Check request context is still valid before making the call
        if (!request || (request as any).__disposed) {
          throw new Error("Request context was disposed before API call");
        }
        loginResponse = await apiCall(request, "POST", "/auth/login", {
          body: { username: uniqueAliceName, password: "alice123" }
        });
        break; // Success, exit retry loop
      } catch (error: any) {
        if ((error.message?.includes("disposed") || error.message?.includes("Request context")) && retries > 1) {
          // Request context was disposed, wait a bit and retry
          await new Promise(resolve => setTimeout(resolve, 500));
          retries--;
          continue;
        }
        // Either not a disposal error, or out of retries
        if (error.message?.includes("disposed") || error.message?.includes("Request context")) {
          throw new Error(`Request context was disposed during API call after retries. This may indicate concurrent test execution issues. Original error: ${error.message}`);
        }
        throw error;
      }
    }

    const token = loginResponse.token;
    if (!token) {
      throw new Error("No token returned from login API");
    }

    // Decode and verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; roles: string[] };
    
    expect(decoded.sub).toBe(uniqueAliceName);
    expect(decoded.roles).toContain("gm");
  }
);

Then(
  'an API request made as the test user to a GM-only endpoint succeeds',
  async ({ page, request }) => {
    // Get the unique alice username
    const uniqueAliceName = await getStoredAliceUsername(page);
    
    // Get the token by logging in as alice via API
    const loginResponse = await apiCall(request, "POST", "/auth/login", {
      body: { username: uniqueAliceName, password: "alice123" }
    });

    const token = loginResponse.token;
    if (!token) {
      throw new Error("No token returned from login API");
    }

    // Call GM-only endpoint (auth service's /gm-only)
    const response = await apiCall(request, "GET", "/gm-only", { token });
    
    expect(response.message).toBe("GM content");
  }
);

Then(
  'an API request made as the test user to an admin-only endpoint is forbidden',
  async ({ page, request }) => {
    // Get the unique alice username
    const uniqueAliceName = await getStoredAliceUsername(page);
    
    // Get the token by logging in as alice via API
    const loginResponse = await apiCall(request, "POST", "/auth/login", {
      body: { username: uniqueAliceName, password: "alice123" }
    });

    const token = loginResponse.token;
    if (!token) {
      throw new Error("No token returned from login API");
    }

    // Call admin-only endpoint - should fail with 403
    const response = await request.fetch(`${AUTH_SERVICE_URL}/admin-only`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      },
      ignoreHTTPSErrors: true
    });

    expect(response.status()).toBe(403);
  }
);


