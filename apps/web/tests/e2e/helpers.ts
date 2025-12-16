import { Page, expect } from "@playwright/test";

/**
 * Helper function to log in a user before accessing the application.
 * This should be called at the start of any test that needs authentication.
 */
export async function loginAs(page: Page, username: string, password: string) {
  await page.goto("/");
  
  // Open login modal via banner Login button
  await page.getByRole("button", { name: "Login" }).click();

  // Wait for login form to be visible in the modal
  await page.getByTestId("login-username").waitFor({ timeout: 5000 });
  
  // Fill in credentials
  await page.getByTestId("login-username").fill(username);
  await page.getByTestId("login-password").fill(password);
  
  // Submit login form via keyboard (triggers form onSubmit reliably)
  await page.getByTestId("login-password").press("Enter");
  
  // Success criteria:
  // - Login dialog closes
  // - Authenticated shell (world context panel) becomes visible
  const loginDialog = page.getByRole("dialog", { name: "Login" });

  await expect(loginDialog).toBeHidden({ timeout: 15000 });
  await expect(
    page.getByRole("heading", { name: "World context and mode" })
  ).toBeVisible({ timeout: 5000 });
}

/**
 * Helper function to log in as admin (default test user).
 * Relies on seeded admin/admin123 user.
 */
export async function loginAsAdmin(page: Page) {
  await loginAs(page, "admin", "admin123");
}

/**
 * Helper function to select a world and enter planning mode.
 * Ensures a world exists (creates "Eldoria" if needed), selects it,
 * and optionally navigates to a specific planning sub-tab.
 */
export async function selectWorldAndEnterPlanningMode(
  page: Page,
  subTab: "World Entities" | "Campaigns" | "Story Arcs" | "Users" = "World Entities"
) {
  // Check if any world exists in the World context selector
  const worldContextTablist = page.getByRole("tablist", { name: "World context" });
  const hasWorld = await worldContextTablist
    .getByRole("tab")
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasWorld) {
    // Check if we see the "No worlds" message - if so, create one
    const noWorldsMessage = await page
      .getByText("No worlds have been created yet")
      .isVisible()
      .catch(() => false);
    
    if (noWorldsMessage) {
      // Create a world via the Snapp menu in the banner
      await page.getByRole("button", { name: /Snapp/i }).click();
      await page.getByRole("button", { name: "Create world" }).click();
      
      // Wait for the create world modal to be visible
      const createWorldDialog = page.getByRole("dialog", { name: /create world/i });
      await expect(createWorldDialog).toBeVisible({ timeout: 5000 });
      
      await page.getByLabel("World name").fill("Eldoria");
      await page.getByLabel("Description").fill("A high-fantasy realm.");
      await page.getByRole("button", { name: "Save world" }).click();
      
      // Wait for the modal to close
      await expect(createWorldDialog).toBeHidden({ timeout: 10000 });
      
      // Wait for world to appear in the world context selector
      await expect(
        worldContextTablist.getByRole("tab", { name: "Eldoria" })
      ).toBeVisible({ timeout: 10000 });
    }
  }

  // Select the first available world (should be Eldoria or another existing world)
  const worldTab = worldContextTablist.getByRole("tab").first();
  await worldTab.click();
  
  // Wait for planning mode to be active and planning sub-tabs to appear
  await expect(
    page.getByRole("tablist", { name: "World planning views" })
  ).toBeVisible({ timeout: 5000 });

  // Navigate to the requested sub-tab if not already on it
  if (subTab !== "World Entities") {
    await page
      .getByRole("tablist", { name: "World planning views" })
      .getByRole("tab", { name: subTab })
      .click();
  }
}

/**
 * Helper function to ensure a campaign exists, creating it if needed.
 * Handles the case where the campaign might already exist (e.g., from a previous test run).
 */
export async function ensureCampaignExists(
  page: Page,
  campaignName: string,
  summary: string
) {
  // Check if campaign tab already exists
  const hasCampaignTab = await page
    .getByRole("tab", { name: campaignName })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasCampaignTab) {
    await page.getByRole("button", { name: "Create campaign" }).click();
    const createCampaignDialog = page.getByRole("dialog", { name: /create campaign/i });
    await expect(createCampaignDialog).toBeVisible({ timeout: 5000 });
    
    await page.getByLabel("Campaign name").fill(campaignName);
    await page.getByLabel("Summary").fill(summary);
    await page.getByRole("button", { name: "Save campaign" }).click();

    // Wait for either the modal to close or an error message
    const modalClosed = await Promise.race([
      createCampaignDialog.waitFor({ state: "hidden", timeout: 5000 }).then(() => true).catch(() => false),
      page.waitForTimeout(5000).then(() => false)
    ]);

    // If modal is still open, check for error and close it manually
    if (!modalClosed) {
      const errorMessage = await page.getByTestId("error-message").isVisible().catch(() => false);
      if (errorMessage) {
        // Campaign might already exist, close the modal manually
        await page.getByRole("button", { name: "Cancel" }).click();
      }
      // Wait for modal to close
      await expect(createCampaignDialog).toBeHidden({ timeout: 5000 });
    }

    // Check if campaign tab now exists (might have been created or already existed)
    await expect(
      page.getByRole("tab", { name: campaignName }).first()
    ).toBeVisible({ timeout: 5000 });
  }
}
