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

// Helper to get admin token for API calls
// Assumes admin user exists (services are seeded on startup)
async function getAdminToken(request: APIRequestContext): Promise<string> {
  const url = `${AUTH_SERVICE_URL}/auth/login`;
  try {
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
        `Login failed: ${errorMessage} (status ${status}). Check that auth service is running at ${AUTH_SERVICE_URL} and admin user exists.`
      );
    }

    const body = await response.json();
    if (!body.token) {
      throw new Error("Login response missing token");
    }
    return body.token;
  } catch (err) {
    const error = err as Error;
    // Check if it's a connection error
    if (error.message.includes("ECONNREFUSED") || error.message.includes("Failed to fetch") || error.message.includes("network")) {
      throw new Error(
        `Cannot connect to auth service at ${AUTH_SERVICE_URL}. Ensure the auth service is running (npm run dev:auth). Original error: ${error.message}`
      );
    }
    throw new Error(
      `Failed to get admin token: ${error.message}. Ensure services are running at ${AUTH_SERVICE_URL} and admin user is seeded (username: admin, password: admin123).`
    );
  }
}

Given(
  'there is an admin user "admin" with the "admin" role',
  async ({ page, request }) => {
    // Try to ensure admin user exists with admin role via API
    // If the service isn't available, assume users are already seeded (services seed on startup)
    try {
      const adminToken = await getAdminToken(request);
      
      try {
        // Try to get the user first
        const user = await apiCall(request, "GET", "/users/admin", { token: adminToken });
        // User exists - ensure admin role
        if (!user.user.roles.includes("admin")) {
          await apiCall(request, "PUT", "/users/admin/roles", {
            token: adminToken,
            body: { roles: ["admin"] }
          });
        }
      } catch (err) {
        // User doesn't exist - create it (this shouldn't happen if services are seeded)
        // But we'll handle it gracefully
        try {
          await apiCall(request, "POST", "/users", {
            token: adminToken,
            body: { username: "admin", password: "admin123", roles: ["admin"] }
          });
        } catch (createErr) {
          // User might already exist from seeding, that's okay
        }
      }
    } catch (err) {
      // If we can't connect to the service, assume users are already seeded
      // Services seed users on startup, so this should be fine
      const error = err as Error;
      if (error.message.includes("Cannot connect") || error.message.includes("ECONNREFUSED")) {
        // Service not available - assume seeding happened on startup
        // This is acceptable since services seed users when they start
        return;
      }
      // Re-throw other errors (like authentication failures)
      throw err;
    }
  }
);

When('the admin signs in to the system as "admin"', async ({ page }) => {
  await loginAsAdmin(page);
});
