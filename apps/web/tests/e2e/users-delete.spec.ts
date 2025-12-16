import { test, expect } from "@playwright/test";
import { loginAsAdmin, selectWorldAndEnterPlanningMode } from "./helpers";

test("Admin can delete a user", async ({ page }) => {
  await loginAsAdmin(page);

  // Navigate into Users planning view (world context + Users tab)
  await selectWorldAndEnterPlanningMode(page, "Users");

  // Wait for users list to load
  await expect(page.getByTestId("users-list")).toBeVisible({
    timeout: 10000
  });

  // Create a test user first via the UI
  // Use a unique username with timestamp to avoid conflicts with seeded users
  const testUsername = `testuser-${Date.now()}`;
  await page.getByRole("button", { name: "Create user" }).click();
  const createUserDialog = page.getByRole("dialog", { name: /create user/i });
  await expect(createUserDialog).toBeVisible();
  
  // Fill form fields - use type() for password field to ensure it's properly set
  const usernameField = createUserDialog.getByTestId("create-user-username");
  const passwordField = createUserDialog.getByTestId("create-user-password");
  
  await usernameField.fill(testUsername);
  await passwordField.clear(); // Clear any existing value first
  await passwordField.type("testpass123", { delay: 50 }); // Type with delay to ensure React state updates
  
  // Verify fields are filled (wait for React state to update)
  await expect(usernameField).toHaveValue(testUsername);
  await expect(passwordField).toHaveValue("testpass123");
  
  // The button in the modal also says "Create user"
  const createButton = createUserDialog.getByRole("button", { name: "Create user" });
  await createButton.click();

  // Wait for either success status or error message (following pattern from other tests)
  await Promise.race([
    page.getByTestId("status-message").waitFor({ timeout: 5000 }).catch(() => null),
    page.getByTestId("error-message").waitFor({ timeout: 5000 }).catch(() => null)
  ]);

  // Check for errors first
  const errorVisible = await page.getByTestId("error-message").isVisible().catch(() => false);
  if (errorVisible) {
    const errorText = await page.getByTestId("error-message").textContent();
    // If modal is still open, close it manually
    const modalStillOpen = await page.getByRole("dialog", { name: /create user/i }).isVisible().catch(() => false);
    if (modalStillOpen) {
      await page.getByRole("dialog", { name: /create user/i }).getByRole("button", { name: "Cancel" }).click();
    }
    throw new Error(`User creation failed with error: ${errorText}`);
  }

  // Wait for the final success message (not the "Creating user…" message)
  await expect(page.getByTestId("status-message")).toBeVisible({
    timeout: 5000
  });
  await expect(page.getByTestId("status-message")).toContainText(/User.*created/i, {
    timeout: 5000
  });

  // Modal should be closed on success, but if it's still open, close it manually
  const modalStillOpen = await page.getByRole("dialog", { name: /create user/i }).isVisible().catch(() => false);
  if (modalStillOpen) {
    await page.getByRole("dialog", { name: /create user/i }).getByRole("button", { name: "Cancel" }).click();
  }

  // Wait for users list to refresh
  await page.waitForTimeout(1000);

  // Find the test user in the list
  const userItem = page.getByTestId(`user-${testUsername}`);
  await expect(userItem).toBeVisible();

  // Click delete button - handle confirm dialog
  page.once("dialog", (dialog) => {
    expect(dialog.type()).toBe("confirm");
    expect(dialog.message()).toContain(testUsername);
    dialog.accept();
  });
  
  await page.getByTestId(`delete-${testUsername}`).click();

  // Wait for deletion to complete - check for status message
  await expect(page.getByTestId("status-message")).toBeVisible({
    timeout: 5000
  });
  await expect(page.getByTestId("status-message")).toContainText(/deleted/i, {
    timeout: 5000
  });

  // Wait for UI to update
  await page.waitForTimeout(1000);

  // Verify user is removed from list
  await expect(userItem).not.toBeVisible({ timeout: 5000 });
});

