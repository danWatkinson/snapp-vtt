import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { When, Then } = createBdd();

// Share the generated test username across steps within this module.
let lastCreatedUsername: string | undefined;

When("the admin creates a new user via the Users UI", async ({ page }) => {
  const testUsername = `testuser-${Date.now()}`;
  lastCreatedUsername = testUsername;

  // Open the create user dialog
  await page.getByRole("button", { name: "Create user" }).click();
  const createUserDialog = page.getByRole("dialog", { name: /create user/i });
  await expect(createUserDialog).toBeVisible();

  const usernameField = createUserDialog.getByTestId("create-user-username");
  const passwordField = createUserDialog.getByTestId("create-user-password");

  await usernameField.fill(testUsername);
  await passwordField.clear();
  await passwordField.type("testpass123", { delay: 50 });

  await expect(usernameField).toHaveValue(testUsername);
  await expect(passwordField).toHaveValue("testpass123");

  const createButton = createUserDialog.getByRole("button", { name: "Create user" });
  await createButton.click();

  await Promise.race([
    page
      .getByRole("dialog", { name: /create user/i })
      .waitFor({ state: "hidden", timeout: 5000 })
      .catch(() => null),
    page.getByTestId("error-message").waitFor({ timeout: 5000 }).catch(() => null)
  ]);

  const errorVisible = await page
    .getByTestId("error-message")
    .isVisible()
    .catch(() => false);
  if (errorVisible) {
    const errorText = await page.getByTestId("error-message").textContent();
    const modalStillOpen = await createUserDialog.isVisible().catch(() => false);
    if (modalStillOpen) {
      await createUserDialog.getByRole("button", { name: "Cancel" }).click();
    }
    throw new Error(`User creation failed with error: ${errorText}`);
  }

  const modalStillOpen = await createUserDialog.isVisible().catch(() => false);
  if (modalStillOpen) {
    await createUserDialog.getByRole("button", { name: "Cancel" }).click();
  }

  await page.waitForTimeout(1000);

  const userItem = page.getByTestId(`user-${testUsername}`);
  await expect(userItem).toBeVisible();
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

  const deleteButton = page.getByTestId(`delete-${testUsername}`);
  await expect(deleteButton).toBeVisible({ timeout: 5000 });
  await deleteButton.click();
  
  // Wait for the confirmation dialog to be handled and deletion to process
  // Use a shorter timeout and check if page is still valid
  try {
    await page.waitForTimeout(300);
  } catch (error) {
    if (error.message?.includes("closed") || page.isClosed()) {
      // Page closed - this might be expected if deletion causes navigation
      // But we should still check if the user was deleted
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

  const userItem = page.getByTestId(`user-${lastCreatedUsername}`);
  try {
    await expect(userItem).not.toBeVisible({ timeout: 5000 });
  } catch (error) {
    if (error.message?.includes("closed") || page.isClosed()) {
      throw new Error("Page was closed while verifying user deletion");
    }
    throw error;
  }
});
