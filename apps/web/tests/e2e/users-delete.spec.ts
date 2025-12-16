import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("Admin can delete a user", async ({ page }) => {
  await loginAsAdmin(page);

  // Navigate to Users tab (already logged in)
  await page.getByRole("tab", { name: "Users" }).click();

  // Wait for users list to load
  await expect(page.getByTestId("users-list")).toBeVisible({
    timeout: 10000
  });

  // Create a test user first via the UI
  // Use a unique username with timestamp to avoid conflicts with seeded users
  const testUsername = `testuser-${Date.now()}`;
  await page.getByRole("button", { name: "Create user" }).click();
  await expect(page.getByRole("dialog", { name: /create user/i })).toBeVisible();
  await page.getByTestId("create-user-username").fill(testUsername);
  await page.getByTestId("create-user-password").fill("testpass123");
  // The button in the modal also says "Create user"
  const createButton = page.getByRole("dialog", { name: /create user/i }).getByRole("button", { name: "Create user" });
  await createButton.click();

  // Wait for the modal to close (indicates the operation completed)
  await expect(page.getByRole("dialog", { name: /create user/i })).not.toBeVisible({
    timeout: 10000
  });

  // Check for errors first
  const errorVisible = await page.getByTestId("error-message").isVisible().catch(() => false);
  if (errorVisible) {
    const errorText = await page.getByTestId("error-message").textContent();
    throw new Error(`User creation failed with error: ${errorText}`);
  }

  // Wait for the final success message (not the "Creating user…" message)
  await expect(page.getByTestId("status-message")).toBeVisible({
    timeout: 5000
  });
  await expect(page.getByTestId("status-message")).toContainText(/User.*created/i, {
    timeout: 5000
  });

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

