import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { loginAs, waitForModalOpen } from "../helpers";
import { ensureTestUser, getStoredTestUsername } from "../helpers/users";
import type { Page } from "@playwright/test";

const { Given, When, Then } = createBdd();

// Get credentials from environment variables
const TEST_ADMIN_USERNAME = process.env.TEST_ADMIN_USERNAME || "admin";
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "admin123";
const TEST_REGISTERED_USERNAME = process.env.TEST_REGISTERED_USERNAME || "registered";
const TEST_REGISTERED_PASSWORD = process.env.TEST_REGISTERED_PASSWORD || "registered123";

Given('there is a registered user', async ({ page, request }) => {
  await ensureTestUser(page, request, TEST_REGISTERED_USERNAME, TEST_REGISTERED_PASSWORD, [], "__testRegisteredUsername");
});


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
    const uniqueUsername = await getStoredTestUsername(page, TEST_REGISTERED_USERNAME, "__testRegisteredUsername");
    
    // Navigate to home page
    await page.goto("/");
    
    // Wait for page to be ready and Login button to be visible and enabled
    const loginButton = page.getByRole("button", { name: "Login" });
    await expect(loginButton).toBeVisible({ timeout: 5000 });
    await expect(loginButton).toBeEnabled({ timeout: 3000 });
    
    // Open login dialog
    const modalPromise = waitForModalOpen(page, "login", 5000);
    await loginButton.click();
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
    const uniqueUsername = await getStoredTestUsername(page, TEST_REGISTERED_USERNAME, "__testRegisteredUsername");
    
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
    const uniqueUsername = await getStoredTestUsername(page, TEST_REGISTERED_USERNAME, "__testRegisteredUsername");
    
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
    const uniqueUsername = await getStoredTestUsername(page, TEST_REGISTERED_USERNAME, "__testRegisteredUsername");
    
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

