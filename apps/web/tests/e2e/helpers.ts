import { Page, expect } from "@playwright/test";

/**
 * Helper function to log in a user before accessing the application.
 * This should be called at the start of any test that needs authentication.
 */
export async function loginAs(page: Page, username: string, password: string) {
  await page.goto("/");
  
  // Check if already logged in - if so, log out first
  const logoutButton = page.getByRole("button", { name: "Log out" });
  const isLoggedIn = await logoutButton.isVisible().catch(() => false);
  if (isLoggedIn) {
    await logoutButton.click();
    // Wait for logout to complete and page to reload
    await page.waitForLoadState("networkidle");
    await page.goto("/");
  }
  
  // Wait for page to be ready
  await page.waitForLoadState("domcontentloaded");
  
  // Open login modal via banner Login button
  const loginButton = page.getByRole("button", { name: "Login" });
  await expect(loginButton).toBeVisible({ timeout: 5000 });
  await loginButton.click();

  // Wait for login dialog to appear first
  const loginDialog = page.getByRole("dialog", { name: "Login" });
  await expect(loginDialog).toBeVisible({ timeout: 5000 });
  
  // Wait for login form to be visible in the modal
  await expect(page.getByTestId("login-username")).toBeVisible({ timeout: 5000 });
  
  // Fill in credentials
  await page.getByTestId("login-username").fill(username);
  await page.getByTestId("login-password").fill(password);
  
  // Submit login form via keyboard (triggers form onSubmit reliably)
  await page.getByTestId("login-password").press("Enter");
  
  // Success criteria:
  // - Login dialog closes
  // - Authenticated shell (world context panel) becomes visible
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
  // Check if ModeSelector is visible (if not, we need to leave current world first)
  const modeSelectorVisible = await page
    .getByRole("tablist", { name: "World context" })
    .isVisible()
    .catch(() => false);

  if (!modeSelectorVisible) {
    // A world is currently selected, so we need to leave it first
    await page.getByRole("button", { name: /^Snapp/i }).click();
    // Wait for the menu to open and the "Leave World" button to be visible
    const leaveWorldButton = page.getByRole("button", { name: "Leave World" });
    await expect(leaveWorldButton).toBeVisible({ timeout: 5000 });
    await leaveWorldButton.click();
    // Wait for ModeSelector to appear
    await expect(
      page.getByRole("tablist", { name: "World context" })
    ).toBeVisible({ timeout: 5000 });
  }

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
  // The tab is a button with role="tab" that contains nested content (image + text)
  const worldTab = worldContextTablist.getByRole("tab").first();
  
  // Ensure the tab is visible and clickable
  await expect(worldTab).toBeVisible({ timeout: 5000 });
  
  // Get the world name for debugging
  const worldName = await worldTab.textContent();
  
  // Click the tab - it's a button element, so clicking should work
  // Try clicking at a specific position (center) to avoid nested elements
  const box = await worldTab.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  } else {
    // Fallback to regular click if bounding box isn't available
    await worldTab.click({ force: true });
  }
  
  // Wait for the world to be selected - the most reliable indicator is planning tabs appearing
  // The PlanningTabs component renders when both activeMode === "plan" and selectedIds.worldId is set
  // Wait for any pending network requests to complete
  try {
    await page.waitForLoadState("networkidle", { timeout: 2000 });
  } catch {
    // If networkidle times out quickly, that's okay - just continue
  }
  
  // Wait for planning mode to be active and planning sub-tabs to appear
  // This is the most reliable indicator that a world is selected
  await expect(
    page.getByRole("tablist", { name: "World planning views" })
  ).toBeVisible({ timeout: 15000 });

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
  // Check if campaign is already selected (campaign views visible means campaign is selected)
  const campaignViewsVisible = await page
    .getByRole("tablist", { name: "Campaign views" })
    .isVisible()
    .catch(() => false);

  // Check if campaign tab exists (only visible when no campaign is selected)
  const hasCampaignTab = await page
    .getByRole("tab", { name: campaignName })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasCampaignTab && !campaignViewsVisible) {
    await page.getByRole("button", { name: "Create campaign" }).click();
    const createCampaignDialog = page.getByRole("dialog", { name: /create campaign/i });
    await expect(createCampaignDialog).toBeVisible({ timeout: 5000 });
    
    await page.getByLabel("Campaign name").fill(campaignName);
    await page.getByLabel("Summary").fill(summary);
    await page.getByRole("button", { name: "Save campaign" }).click();

    // Wait for either the modal to close, an error message, or the campaign tab to appear
    await Promise.race([
      createCampaignDialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => null),
      page.getByTestId("error-message").waitFor({ timeout: 5000 }).catch(() => null),
      page.getByRole("tab", { name: campaignName }).waitFor({ timeout: 5000 }).catch(() => null)
    ]);

    // Check for errors first
    const errorMessage = await page.getByTestId("error-message").isVisible().catch(() => false);
    if (errorMessage) {
      // Campaign might already exist, close the modal manually
      const cancelButton = createCampaignDialog.getByRole("button", { name: "Cancel" });
      if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();
      }
    } else {
      // No error - modal should be closed, but if it's still open, wait a bit more
      const stillOpen = await createCampaignDialog.isVisible().catch(() => false);
      if (stillOpen) {
        // Give it a moment, then check if campaign tab appeared (success)
        await page.waitForTimeout(1000);
        const campaignTabVisible = await page.getByRole("tab", { name: campaignName }).isVisible().catch(() => false);
        if (campaignTabVisible) {
          // Success - close modal manually if still open
          const cancelButton = createCampaignDialog.getByRole("button", { name: "Cancel" });
          if (await cancelButton.isVisible().catch(() => false)) {
            await cancelButton.click();
          }
        }
      }
    }

    // After creation, campaign tab should be visible (campaign not yet selected)
    // Click it to select the campaign
    const campaignTab = page.getByRole("tab", { name: campaignName }).first();
    await expect(campaignTab).toBeVisible({ timeout: 5000 });
    await campaignTab.click();
    // Wait for campaign views to appear (indicating campaign is selected)
    await expect(
      page.getByRole("tablist", { name: "Campaign views" })
    ).toBeVisible({ timeout: 5000 });
  } else if (hasCampaignTab && !campaignViewsVisible) {
    // Campaign exists but not selected - select it
    await page.getByRole("tab", { name: campaignName }).first().click();
    await expect(
      page.getByRole("tablist", { name: "Campaign views" })
    ).toBeVisible({ timeout: 5000 });
  }
  // If campaignViewsVisible is true, campaign is already selected, nothing to do
}
