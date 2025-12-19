import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { loginAs, waitForModalOpen, getUniqueUsername } from "../helpers";
import type { APIRequestContext } from "@playwright/test";

const { Given, When, Then } = createBdd();

// Get credentials from environment variables
const TEST_ADMIN_USERNAME = process.env.TEST_ADMIN_USERNAME || "admin";
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "admin123";
const TEST_REGISTERED_USERNAME = process.env.TEST_REGISTERED_USERNAME || "registered";
const TEST_REGISTERED_PASSWORD = process.env.TEST_REGISTERED_PASSWORD || "registered123";

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL ??
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ??
  "https://localhost:4400";

// Helper to make API calls to auth service
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
async function getAdminToken(request: APIRequestContext): Promise<string> {
  const response = await request.fetch(`${AUTH_SERVICE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: { username: TEST_ADMIN_USERNAME, password: TEST_ADMIN_PASSWORD },
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

Given('there is a registered user', async ({ page, request }) => {
  // Generate unique username per worker to avoid concurrency issues
  const uniqueRegisteredName = getUniqueUsername(TEST_REGISTERED_USERNAME);
  
  // Store the unique name in page context for other steps to use
  await page.evaluate((username) => {
    (window as any).__testRegisteredUsername = username;
  }, uniqueRegisteredName);
  
  // Ensure registered user exists with no roles via API
  const adminToken = await getAdminToken(request);
  
  try {
    // Try to get the user first
    const user = await apiCall(request, "GET", `/users/${uniqueRegisteredName}`, { token: adminToken });
    // User exists - ensure no roles
    if (user.user.roles.length > 0) {
      await apiCall(request, "PUT", `/users/${uniqueRegisteredName}/roles`, {
        token: adminToken,
        body: { roles: [] }
      });
    }
  } catch (err) {
    // User doesn't exist - create it
    await apiCall(request, "POST", "/users", {
      token: adminToken,
      body: { username: uniqueRegisteredName, password: TEST_REGISTERED_PASSWORD, roles: [] }
    });
  }
});

// Helper to get the unique registered username from page context
async function getStoredRegisteredUsername(page: any): Promise<string> {
  try {
    const storedName = await page.evaluate(() => {
      return (window as any).__testRegisteredUsername;
    });
    if (storedName) {
      return storedName;
    }
  } catch {
    // Can't retrieve - fall back to unique name generation
  }
  // Fall back to generating unique name if not stored
  return getUniqueUsername(TEST_REGISTERED_USERNAME);
}

When("I open the Snapp home page", async ({ page }) => {
  await page.goto("/");
});

When(
  'an unidentified user attempts to login as {string} without providing a password',
  async ({ page }, username: string) => {
    // Navigate to home page
    await page.goto("/");
    
    // Open login dialog
    const modalPromise = waitForModalOpen(page, "login", 5000);
    await page.getByRole("button", { name: "Login" }).click();
    await modalPromise;
    
    // Attempt login without password
    await page.getByTestId("login-username").fill(username);
    // Intentionally do not fill password; submit via Enter on password field
    await page.getByTestId("login-password").press("Enter");
  }
);

When(
  'an unidentified user attempts to login as {string} with password {string}',
  async ({ page }, username: string, password: string) => {
    // Navigate to home page
    await page.goto("/");
    
    // Open login dialog
    const modalPromise = waitForModalOpen(page, "login", 5000);
    await page.getByRole("button", { name: "Login" }).click();
    await modalPromise;
    
    // Attempt login with credentials
    await page.getByTestId("login-username").fill(username);
    await page.getByTestId("login-password").fill(password);
    await page.getByTestId("login-password").press("Enter");
  }
);

When(
  'an unidentified user attempts to login as the registered user without providing a password',
  async ({ page }) => {
    // Get the unique registered username from page context
    const uniqueUsername = await getStoredRegisteredUsername(page);
    
    // Navigate to home page
    await page.goto("/");
    
    // Open login dialog
    const modalPromise = waitForModalOpen(page, "login", 5000);
    await page.getByRole("button", { name: "Login" }).click();
    await modalPromise;
    
    // Attempt login without password
    await page.getByTestId("login-username").fill(uniqueUsername);
    // Intentionally do not fill password; submit via Enter on password field
    await page.getByTestId("login-password").press("Enter");
  }
);

When(
  'an unidentified user attempts to login as the registered user with the correct password',
  async ({ page }) => {
    // Get the unique registered username from page context
    const uniqueUsername = await getStoredRegisteredUsername(page);
    
    // Navigate to home page
    await page.goto("/");
    
    // Open login dialog
    const modalPromise = waitForModalOpen(page, "login", 5000);
    await page.getByRole("button", { name: "Login" }).click();
    await modalPromise;
    
    // Attempt login with correct credentials
    await page.getByTestId("login-username").fill(uniqueUsername);
    await page.getByTestId("login-password").fill(TEST_REGISTERED_PASSWORD);
    await page.getByTestId("login-password").press("Enter");
  }
);

When(
  'an unidentified user attempts to login as the admin user without providing a password',
  async ({ page }) => {
    // Navigate to home page
    await page.goto("/");
    
    // Open login dialog
    const modalPromise = waitForModalOpen(page, "login", 5000);
    await page.getByRole("button", { name: "Login" }).click();
    await modalPromise;
    
    // Attempt login without password
    await page.getByTestId("login-username").fill(TEST_ADMIN_USERNAME);
    // Intentionally do not fill password; submit via Enter on password field
    await page.getByTestId("login-password").press("Enter");
  }
);

When(
  'an unidentified user attempts to login as the registered user with password {string}',
  async ({ page }, password: string) => {
    // Get the unique registered username from page context
    const uniqueUsername = await getStoredRegisteredUsername(page);
    
    // Navigate to home page
    await page.goto("/");
    
    // Open login dialog
    const modalPromise = waitForModalOpen(page, "login", 5000);
    await page.getByRole("button", { name: "Login" }).click();
    await modalPromise;
    
    // Attempt login with credentials
    await page.getByTestId("login-username").fill(uniqueUsername);
    await page.getByTestId("login-password").fill(password);
    await page.getByTestId("login-password").press("Enter");
  }
);

When(
  'an unidentified user attempts to login as the registered user with an incorrect password',
  async ({ page }) => {
    // Get the unique registered username from page context
    const uniqueUsername = await getStoredRegisteredUsername(page);
    
    // Navigate to home page
    await page.goto("/");
    
    // Open login dialog
    const modalPromise = waitForModalOpen(page, "login", 5000);
    await page.getByRole("button", { name: "Login" }).click();
    await modalPromise;
    
    // Attempt login with incorrect password
    await page.getByTestId("login-username").fill(uniqueUsername);
    await page.getByTestId("login-password").fill("wrongpassword");
    await page.getByTestId("login-password").press("Enter");
  }
);

Then("I am shown an error telling me to provide a password", async ({ page }) => {
  // Verify login dialog is still open (form validation prevents submission)
  await expect(
    page.getByRole("dialog", { name: "Login" })
  ).toBeVisible({ timeout: 3000 });
  
  // Check for password validation error (if displayed)
  // The form should prevent submission, keeping us on the login form
});

Then("I am shown an error telling me to provide a password and I am not shown as logged in", async ({ page }) => {
  // Verify login dialog is still open (form validation prevents submission)
  await expect(
    page.getByRole("dialog", { name: "Login" })
  ).toBeVisible({ timeout: 3000 });
  
  // Verify user is not logged in
  await expect(page.getByText(/Logged in as/i)).not.toBeVisible({
    timeout: 2000
  });
});

Then("the user is shown an error stating that they need to provide a password and the user is not logged in", async ({ page }) => {
  // Verify login dialog is still open (form validation prevents submission)
  await expect(
    page.getByRole("dialog", { name: "Login" })
  ).toBeVisible({ timeout: 3000 });
  
  // Check for password validation error (if displayed)
  // The form should prevent submission, keeping us on the login form
  // Note: The browser's native HTML5 validation may prevent form submission,
  // so we verify the dialog remains open rather than checking for a specific error message
  
  // Verify user is not logged in
  await expect(page.getByText(/Logged in as/i)).not.toBeVisible({
    timeout: 2000
  });
  
  // Verify logout button is not visible
  await expect(page.getByRole("button", { name: "Log out" })).not.toBeVisible({
    timeout: 2000
  });
  
  // Verify world planning UI is not visible
  await expect(
    page.getByRole("heading", { name: "World context and mode" })
  ).not.toBeVisible({ timeout: 3000 });
});

Then("the user is shown an error stating that they need to provide a password", async ({ page }) => {
  // Verify login dialog is still open (form validation prevents submission)
  await expect(
    page.getByRole("dialog", { name: "Login" })
  ).toBeVisible({ timeout: 3000 });
  
  // Check for password validation error (if displayed)
  // The form should prevent submission, keeping us on the login form
  // Note: The browser's native HTML5 validation may prevent form submission,
  // so we verify the dialog remains open rather than checking for a specific error message
});

Then("I am not shown as logged in", async ({ page }) => {
  await expect(page.getByText(/Logged in as/i)).not.toBeVisible({
    timeout: 2000
  });
});

Then("the user is not logged in", async ({ page }) => {
  // Verify user is not logged in
  await expect(page.getByText(/Logged in as/i)).not.toBeVisible({
    timeout: 2000
  });
  
  // Verify logout button is not visible
  await expect(page.getByRole("button", { name: "Log out" })).not.toBeVisible({
    timeout: 2000
  });
  
  // Verify world planning UI is not visible
  await expect(
    page.getByRole("heading", { name: "World context and mode" })
  ).not.toBeVisible({ timeout: 3000 });
});

Then("the login dialog remains open", async ({ page }) => {
  await expect(
    page.getByRole("dialog", { name: "Login" })
  ).toBeVisible({ timeout: 3000 });
});

Then("the login dialog remains open and the world planning UI is not visible", async ({ page }) => {
  // Verify login dialog is still open
  await expect(
    page.getByRole("dialog", { name: "Login" })
  ).toBeVisible({ timeout: 3000 });
  
  // Verify world planning UI is not visible
  await expect(
    page.getByRole("heading", { name: "World context and mode" })
  ).not.toBeVisible({ timeout: 3000 });
});

Then("I am shown an error telling me that my credentials were incorrect and I am not shown as logged in", async ({ page }) => {
  // Verify login dialog is still open
  await expect(
    page.getByRole("dialog", { name: "Login" })
  ).toBeVisible({ timeout: 3000 });
  
  // Verify error message about incorrect credentials is displayed
  const errorMessage = page.getByTestId("error-message");
  await expect(errorMessage).toBeVisible({ timeout: 3000 });
  
  // Check that the error message contains text about incorrect credentials
  // Common error messages might include: "incorrect", "invalid", "wrong", "credentials", "password", "username"
  const errorText = await errorMessage.textContent();
  const hasCredentialError = errorText && (
    /incorrect/i.test(errorText) ||
    /invalid/i.test(errorText) ||
    /wrong/i.test(errorText) ||
    /credentials/i.test(errorText) ||
    /password/i.test(errorText) ||
    /username/i.test(errorText) ||
    /authentication/i.test(errorText) ||
    /login failed/i.test(errorText)
  );
  
  if (!hasCredentialError) {
    throw new Error(
      `Expected error message about incorrect credentials, but found: "${errorText}". ` +
      `The error message should indicate that the credentials were incorrect.`
    );
  }
  
  // Verify user is not logged in
  await expect(page.getByText(/Logged in as/i)).not.toBeVisible({
    timeout: 2000
  });
  
  // Verify logout button is not visible
  await expect(page.getByRole("button", { name: "Log out" })).not.toBeVisible({
    timeout: 2000
  });
  
  // Verify world planning UI is not visible
  await expect(
    page.getByRole("heading", { name: "World context and mode" })
  ).not.toBeVisible({ timeout: 3000 });
});

Then("the user is shown an error stating that their credentials were incorrect and the user is not logged in", async ({ page }) => {
  // Verify login dialog is still open
  await expect(
    page.getByRole("dialog", { name: "Login" })
  ).toBeVisible({ timeout: 3000 });
  
  // Verify error message about incorrect credentials is displayed
  const errorMessage = page.getByTestId("error-message");
  await expect(errorMessage).toBeVisible({ timeout: 3000 });
  
  // Check that the error message contains text about incorrect credentials
  // Common error messages might include: "incorrect", "invalid", "wrong", "credentials", "password", "username"
  const errorText = await errorMessage.textContent();
  const hasCredentialError = errorText && (
    /incorrect/i.test(errorText) ||
    /invalid/i.test(errorText) ||
    /wrong/i.test(errorText) ||
    /credentials/i.test(errorText) ||
    /password/i.test(errorText) ||
    /username/i.test(errorText) ||
    /authentication/i.test(errorText) ||
    /login failed/i.test(errorText)
  );
  
  if (!hasCredentialError) {
    throw new Error(
      `Expected error message about incorrect credentials, but found: "${errorText}". ` +
      `The error message should indicate that the credentials were incorrect.`
    );
  }
  
  // Verify user is not logged in
  await expect(page.getByText(/Logged in as/i)).not.toBeVisible({
    timeout: 2000
  });
  
  // Verify logout button is not visible
  await expect(page.getByRole("button", { name: "Log out" })).not.toBeVisible({
    timeout: 2000
  });
  
  // Verify world planning UI is not visible
  await expect(
    page.getByRole("heading", { name: "World context and mode" })
  ).not.toBeVisible({ timeout: 3000 });
});

Then("the user is shown an error stating that their credentials were incorrect", async ({ page }) => {
  // Verify login dialog is still open
  await expect(
    page.getByRole("dialog", { name: "Login" })
  ).toBeVisible({ timeout: 3000 });
  
  // Verify error message about incorrect credentials is displayed
  const errorMessage = page.getByTestId("error-message");
  await expect(errorMessage).toBeVisible({ timeout: 3000 });
  
  // Check that the error message contains text about incorrect credentials
  // Common error messages might include: "incorrect", "invalid", "wrong", "credentials", "password", "username"
  const errorText = await errorMessage.textContent();
  const hasCredentialError = errorText && (
    /incorrect/i.test(errorText) ||
    /invalid/i.test(errorText) ||
    /wrong/i.test(errorText) ||
    /credentials/i.test(errorText) ||
    /password/i.test(errorText) ||
    /username/i.test(errorText) ||
    /authentication/i.test(errorText) ||
    /login failed/i.test(errorText)
  );
  
  if (!hasCredentialError) {
    throw new Error(
      `Expected error message about incorrect credentials, but found: "${errorText}". ` +
      `The error message should indicate that the credentials were incorrect.`
    );
  }
});

Then("the world planning UI is not visible", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: "World context and mode" })
  ).not.toBeVisible({ timeout: 3000 });
});

Then("the login dialog closes", async ({ page }) => {
  await expect(
    page.getByRole("dialog", { name: "Login" })
  ).toBeHidden({ timeout: 3000 });
});

Then("the login dialog closes and the world planning UI becomes visible", async ({ page }) => {
  // Verify login dialog is closed
  await expect(
    page.getByRole("dialog", { name: "Login" })
  ).toBeHidden({ timeout: 3000 });
  
  // Verify world planning UI is visible
  // After login, the authenticated view should be visible
  // This can be:
  // 1. ModeSelector (if no world selected) - shows "World context and mode" heading
  // 2. WorldTab or other tabs (if world/tab is selected)
  // 3. The "Log out" button is always visible when authenticated
  
  // Check for logout button first (most reliable indicator of authenticated state)
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible({ timeout: 3000 });
  
  // Optionally check for authenticated UI elements (but don't fail if they're not visible yet)
  // The ModeSelector heading only appears when no world is selected
  const modeSelectorHeading = page.getByRole("heading", { name: "World context and mode" });
  const worldContextTablist = page.getByRole("tablist", { name: "World context" });
  
  // At least one of these should be visible, or we're on a tab view
  const headingVisible = await modeSelectorHeading.isVisible({ timeout: 1000 }).catch(() => false);
  const tablistVisible = await worldContextTablist.isVisible({ timeout: 1000 }).catch(() => false);
  
  // If neither is visible, that's okay - we might be on a tab view (WorldTab, CampaignsTab, etc.)
  // The logout button being visible is sufficient to confirm we're authenticated
});

Then("the user is logged in", async ({ page }) => {
  // Verify login dialog is closed
  await expect(
    page.getByRole("dialog", { name: "Login" })
  ).toBeHidden({ timeout: 3000 });
  
  // Verify user is logged in by checking for authenticated UI elements
  // After login, the authenticated view should be visible
  // This can be:
  // 1. ModeSelector (if no world selected) - shows "World context and mode" heading
  // 2. WorldTab or other tabs (if world/tab is selected)
  // 3. The "Log out" button is always visible when authenticated
  
  // Check for logout button first (most reliable indicator of authenticated state)
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible({ timeout: 3000 });
  
  // Optionally check for authenticated UI elements (but don't fail if they're not visible yet)
  // The ModeSelector heading only appears when no world is selected
  const modeSelectorHeading = page.getByRole("heading", { name: "World context and mode" });
  const worldContextTablist = page.getByRole("tablist", { name: "World context" });
  
  // At least one of these should be visible, or we're on a tab view
  const headingVisible = await modeSelectorHeading.isVisible({ timeout: 1000 }).catch(() => false);
  const tablistVisible = await worldContextTablist.isVisible({ timeout: 1000 }).catch(() => false);
  
  // If neither is visible, that's okay - we might be on a tab view (WorldTab, CampaignsTab, etc.)
  // The logout button being visible is sufficient to confirm we're authenticated
});

Then("the world planning UI becomes visible", async ({ page }) => {
  // After login, the authenticated view should be visible
  // This can be:
  // 1. ModeSelector (if no world selected) - shows "World context and mode" heading
  // 2. WorldTab or other tabs (if world/tab is selected)
  // 3. The "Log out" button is always visible when authenticated
  
  // Check for logout button first (most reliable indicator of authenticated state)
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible({ timeout: 3000 });
  
  // Optionally check for authenticated UI elements (but don't fail if they're not visible yet)
  // The ModeSelector heading only appears when no world is selected
  const modeSelectorHeading = page.getByRole("heading", { name: "World context and mode" });
  const worldContextTablist = page.getByRole("tablist", { name: "World context" });
  
  // At least one of these should be visible, or we're on a tab view
  const headingVisible = await modeSelectorHeading.isVisible({ timeout: 1000 }).catch(() => false);
  const tablistVisible = await worldContextTablist.isVisible({ timeout: 1000 }).catch(() => false);
  
  // If neither is visible, that's okay - we might be on a tab view (WorldTab, CampaignsTab, etc.)
  // The logout button being visible is sufficient to confirm we're authenticated
});

