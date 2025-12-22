import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { loginAs, waitForRoleAssigned, waitForError } from "../helpers";
import { navigateToUsersScreen } from "../helpers/navigation";
import { createApiClient } from "../helpers/api";
import { ensureTestUser, getStoredTestUsername } from "../helpers/users";
import { clearAllStorage, navigateAndWaitForReady } from "../helpers/utils";
import jwt from "jsonwebtoken";
import type { Page } from "@playwright/test";
// Note: common.steps.ts is automatically loaded by playwright-bdd (no import needed)

const { Given, When, Then } = createBdd();

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? "dev-secret";

Given('there is a test user', async ({ page, request }) => {
  await ensureTestUser(page, request, "alice", "alice123", [], "__testAliceUsername");
});

// Common steps (admin user setup, admin login) are imported from common.steps.ts

When('the admin navigates to the "Users" management screen', async ({ page }) => {
  await navigateToUsersScreen(page);
});

When(
  'the admin assigns the "gm" role to the test user',
  async ({ page }) => {
    // Navigate to Users screen first (if not already there)
    await navigateToUsersScreen(page);
    
    // Get the unique alice username
    const uniqueAliceName = await getStoredTestUsername(page, "alice", "__testAliceUsername");
    
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
    const uniqueAliceName = await getStoredTestUsername(page, "alice", "__testAliceUsername");
    
    // Clear storage to logout admin first
    await clearAllStorage(page);
    
    // Navigate to home page and wait for it to be ready
    await navigateAndWaitForReady(page);
    
    // Retry login up to 3 times to handle race conditions
    let loginSucceeded = false;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await loginAs(page, uniqueAliceName, "alice123");
        loginSucceeded = true;
        break;
      } catch (loginError) {
        lastError = loginError as Error;
        
        // Check if we're actually logged in (maybe login succeeded but threw an error)
        const logoutButton = page.getByRole("button", { name: "Log out" });
        const isLoggedIn = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (isLoggedIn) {
          // We're logged in - the error was likely just a timeout or race condition
          loginSucceeded = true;
          break;
        }
        
        // If this isn't the last attempt, wait a bit and try again
        if (attempt < 2) {
          await page.waitForTimeout(500); // Brief delay before retry
        }
      }
    }
    
    if (!loginSucceeded && lastError) {
      throw new Error(
        `Login failed for test user "${uniqueAliceName}" after 3 attempts. ` +
        `The loginAs function reported an error: ${lastError.message}.`
      );
    }

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
  const uniqueAliceName = await getStoredTestUsername(page, "alice", "__testAliceUsername");
  
  // Clear any existing session
  await clearAllStorage(page);
  
  // Navigate to home page and wait for it to be ready
  await navigateAndWaitForReady(page);
  
  await loginAs(page, uniqueAliceName, "alice123");
});

Then(
  'the issued access token for the test user contains role "gm"',
  async ({ page, request }) => {
    // Get the unique alice username
    const uniqueAliceName = await getStoredTestUsername(page, "alice", "__testAliceUsername");
    
    // First, verify that alice actually has the gm role by checking the user via API
    // This ensures the role assignment was persisted before we check the token
    const api = createApiClient(request);
    const adminToken = await api.getAdminToken();
    let userData;
    try {
      userData = await api.call("auth", "GET", `/users/${uniqueAliceName}`, { token: adminToken });
    } catch (error: any) {
      throw new Error(`Failed to verify alice's roles before token check: ${error.message}`);
    }
    
    if (!(userData as { user?: { roles?: string[] } }).user?.roles?.includes("gm")) {
      throw new Error(`Alice (${uniqueAliceName}) does not have the "gm" role assigned. Current roles: ${JSON.stringify((userData as { user?: { roles?: string[] } }).user?.roles || [])}`);
    }
    
    // Get the token by logging in as alice via API (since UI login stores it in React state, not localStorage)
    const loginResponse = await api.call("auth", "POST", "/auth/login", {
      body: { username: uniqueAliceName, password: "alice123" }
    });

    const token = (loginResponse as { token?: string }).token;
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
    const uniqueAliceName = await getStoredTestUsername(page, "alice", "__testAliceUsername");
    
    // Get the token by logging in as alice via API
    const api = createApiClient(request);
    const loginResponse = await api.call("auth", "POST", "/auth/login", {
      body: { username: uniqueAliceName, password: "alice123" }
    });

    const token = (loginResponse as { token?: string }).token;
    if (!token) {
      throw new Error("No token returned from login API");
    }

    // Call GM-only endpoint (auth service's /gm-only)
    const response = await api.call("auth", "GET", "/gm-only", { token });
    
    expect((response as { message?: string }).message).toBe("GM content");
  }
);

Then(
  'an API request made as the test user to an admin-only endpoint is forbidden',
  async ({ page, request }) => {
    // Get the unique alice username
    const uniqueAliceName = await getStoredTestUsername(page, "alice", "__testAliceUsername");
    
    // Get the token by logging in as alice via API
    const api = createApiClient(request);
    const loginResponse = await api.call("auth", "POST", "/auth/login", {
      body: { username: uniqueAliceName, password: "alice123" }
    });

    const token = (loginResponse as { token?: string }).token;
    if (!token) {
      throw new Error("No token returned from login API");
    }

    // Call admin-only endpoint - should fail with 403
    // Use direct fetch since we expect a 403 (not handled by api.call which throws on !ok)
    const authServiceUrl = process.env.AUTH_SERVICE_URL ?? 
                          process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ?? 
                          "https://localhost:4400";
    const response = await request.fetch(`${authServiceUrl}/admin-only`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      },
      ignoreHTTPSErrors: true
    });

    expect(response.status()).toBe(403);
  }
);


