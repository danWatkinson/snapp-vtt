import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { loginAs } from "../helpers";
import jwt from "jsonwebtoken";
import type { APIRequestContext } from "@playwright/test";
// Note: common.steps.ts is automatically loaded by playwright-bdd (no import needed)

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

Given('there is a user "alice" with no roles', async ({ page, request }) => {
  // Ensure alice user exists with no roles via API
  const adminToken = await getAdminToken(request);
  
  try {
    // Try to get the user first
    const user = await apiCall(request, "GET", "/users/alice", { token: adminToken });
    // User exists - ensure no roles
    if (user.user.roles.length > 0) {
      await apiCall(request, "PUT", "/users/alice/roles", {
        token: adminToken,
        body: { roles: [] }
      });
    }
  } catch (err) {
    // User doesn't exist - create it
    await apiCall(request, "POST", "/users", {
      token: adminToken,
      body: { username: "alice", password: "alice123", roles: [] }
    });
  }
});

// Common steps (admin user setup, admin login) are imported from common.steps.ts

When('the admin navigates to the "Users" management screen', async ({ page }) => {
  // Use the Snapp menu's "User Management" entry, which doesn't require a world to be selected
  await page.getByRole("button", { name: /^Snapp/i }).click();
  await page.getByRole("button", { name: "User Management" }).click();
  
  // Wait for the Users tab to be visible
  await page.waitForSelector('[data-component="UsersTab"]', { timeout: 5000 });
});

When(
  'the admin assigns the "gm" role to user "alice"',
  async ({ page }) => {
    // Fill in the form to assign GM role
    await page.getByTestId("assign-target-username").fill("alice");
    await page.getByTestId("assign-role").fill("gm");
    await page.getByRole("button", { name: "Assign role" }).click();

    // Wait for the form to reset (indicating success) or check for error
    await Promise.race([
      page.waitForTimeout(1000), // Give time for async action
      page.getByTestId("error-message").waitFor({ timeout: 2000 }).catch(() => null)
    ]);
    
    // Verify no error occurred
    const errorVisible = await page.getByTestId("error-message").isVisible().catch(() => false);
    if (errorVisible) {
      const errorText = await page.getByTestId("error-message").textContent();
      throw new Error(`Role assignment failed: ${errorText}`);
    }
  }
);

Then(
  'the UI shows that user "alice" has role "gm"',
  async ({ page }) => {
    // Clear storage to logout admin first
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto("/");
    
    await loginAs(page, "alice", "alice123");

    // Verify login succeeded by checking for authenticated UI
    await expect(
      page.getByRole("heading", { name: "World context and mode" })
    ).toBeVisible({ timeout: 5000 });

    // Open User Management via the Snapp menu in the banner
    await page.getByRole("button", { name: /Snapp/i }).click();
    await page.getByRole("button", { name: /User Management/i }).click();

    // Wait for the Users tab content to load
    const userManagementHeading = page.getByRole("heading", { name: /User Management/i });
    await expect(userManagementHeading).toBeVisible({
      timeout: 5000
    });
    
    // Roles are shown in the format "Logged in as alice (gm)" in the UsersTab header
    const usersTabContainer = userManagementHeading.locator("..");
    await expect(usersTabContainer.getByText(/Logged in as alice \(gm\)/)).toBeVisible({
      timeout: 5000
    });
  }
);

When('user "alice" signs in to the system', async ({ page }) => {
  // Clear any existing session
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  
  await loginAs(page, "alice", "alice123");
});

Then(
  'the issued access token for "alice" contains role "gm"',
  async ({ page, request }) => {
    // Ensure request context is still valid (may be disposed during concurrent execution)
    if (!request) {
      throw new Error("Request context was disposed. This may indicate a test isolation issue.");
    }
    
    // Get the token by logging in as alice via API (since UI login stores it in React state, not localStorage)
    let loginResponse;
    try {
      loginResponse = await apiCall(request, "POST", "/auth/login", {
        body: { username: "alice", password: "alice123" }
      });
    } catch (error: any) {
      if (error.message?.includes("disposed") || error.message?.includes("Request context")) {
        throw new Error(`Request context was disposed during API call. This may indicate concurrent test execution issues. Original error: ${error.message}`);
      }
      throw error;
    }

    const token = loginResponse.token;
    if (!token) {
      throw new Error("No token returned from login API");
    }

    // Decode and verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; roles: string[] };
    
    expect(decoded.sub).toBe("alice");
    expect(decoded.roles).toContain("gm");
  }
);

Then(
  'an API request made as "alice" to a GM-only endpoint succeeds',
  async ({ page, request }) => {
    // Get the token by logging in as alice via API
    const loginResponse = await apiCall(request, "POST", "/auth/login", {
      body: { username: "alice", password: "alice123" }
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
  'an API request made as "alice" to an admin-only endpoint is forbidden',
  async ({ page, request }) => {
    // Get the token by logging in as alice via API
    const loginResponse = await apiCall(request, "POST", "/auth/login", {
      body: { username: "alice", password: "alice123" }
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


