import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { loginAsAdmin } from "../helpers";
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
  await loginAsAdmin(page);
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
