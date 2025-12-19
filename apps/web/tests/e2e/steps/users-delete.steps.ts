import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { waitForModalOpen, waitForUserCreated, waitForUserDeleted, waitForError } from "../helpers";

const { When, Then } = createBdd();

// Share the generated test username across steps within this module.
let lastCreatedUsername: string | undefined;

When("the admin creates a new user via the Users UI", async ({ page }) => {
  const testUsername = `testuser-${Date.now()}`;
  lastCreatedUsername = testUsername;

  // Open the create user dialog
  await page.getByRole("button", { name: "Create user" }).click();
  await waitForModalOpen(page, "createUser", 5000);

  const createUserDialog = page.getByRole("dialog", { name: /create user/i });
  const usernameField = createUserDialog.getByTestId("create-user-username");
  const passwordField = createUserDialog.getByTestId("create-user-password");

  await usernameField.fill(testUsername);
  await passwordField.clear();
  // Removed delay for faster typing (50ms delay was unnecessary)
  await passwordField.type("testpass123");

  await expect(usernameField).toHaveValue(testUsername);
  await expect(passwordField).toHaveValue("testpass123");

  // Set up event listener BEFORE clicking submit
  // Reduced timeout from 10000ms to 5000ms for better performance
  const userCreatedPromise = waitForUserCreated(page, testUsername, 5000);
  const errorPromise = waitForError(page, undefined, 5000).catch(() => null);

  const createButton = createUserDialog.getByRole("button", { name: "Create user" });
  await createButton.click();

  // Wait for either user creation or error
  try {
    await Promise.race([
      userCreatedPromise,
      errorPromise.then((errorMsg) => {
        if (errorMsg) throw new Error(`User creation failed with error: ${errorMsg}`);
      })
    ]);
    // User was created successfully
  } catch (error) {
    // Check if modal is still open and close it
    const modalStillOpen = await createUserDialog.isVisible().catch(() => false);
    if (modalStillOpen) {
      await createUserDialog.getByRole("button", { name: "Cancel" }).click();
    }
    throw error;
  }
});

When("the admin deletes that user from the users list", async ({ page }) => {
  if (!lastCreatedUsername) {
    throw new Error("lastCreatedUsername was not set; ensure user creation step ran first");
  }

  const testUsername = lastCreatedUsername;

  page.once("dialog", (dialog) => {
    expect(dialog.type()).toBe("confirm");
    expect(dialog.message()).toContain(testUsername);
    dialog.accept();
  });

  // Set up event listener BEFORE clicking delete
  // Reduced timeout from 10000ms to 5000ms for better performance
  const userDeletedPromise = waitForUserDeleted(page, testUsername, 5000);

  const deleteButton = page.getByTestId(`delete-${testUsername}`);
  await expect(deleteButton).toBeVisible({ timeout: 3000 });
  await deleteButton.click();
  
  // Wait for user deletion event
  try {
    await userDeletedPromise;
    // User was deleted successfully
  } catch (error) {
    if (error.message?.includes("closed") || page.isClosed()) {
      // Page closed - this might be expected if deletion causes navigation
      return;
    }
    throw error;
  }
});

Then("the deleted user no longer appears in the users list", async ({ page }) => {
  if (!lastCreatedUsername) {
    throw new Error("lastCreatedUsername was not set; ensure user creation step ran first");
  }

  // Check if page is still valid
  if (page.isClosed()) {
    throw new Error("Page was closed unexpectedly - cannot verify user deletion");
  }

  // Use event-based wait (with DOM fallback) to verify deletion
  try {
    await waitForUserDeleted(page, lastCreatedUsername, 5000);
  } catch (error) {
    if (error.message?.includes("closed") || page.isClosed()) {
      throw new Error("Page was closed while verifying user deletion");
    }
    // Fallback: check DOM directly
    const userItem = page.getByTestId(`user-${lastCreatedUsername}`);
    await expect(userItem).not.toBeVisible({ timeout: 3000 });
  }
});
