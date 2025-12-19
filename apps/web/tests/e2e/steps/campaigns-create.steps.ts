import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { selectWorldAndEnterPlanningMode, ensureCampaignExists, getUniqueCampaignName, waitForModalOpen, waitForCampaignCreated, waitForModalClose, closeModalIfOpen, handleAlreadyExistsError, waitForCampaignView, safeWait, STABILITY_WAIT_SHORT } from "../helpers";
import type { APIRequestContext, Page } from "@playwright/test";
// Note: common.steps.ts is automatically loaded by playwright-bdd (no import needed)

const { When, Then } = createBdd();

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL ??
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ??
  "https://localhost:4400";

const CAMPAIGN_SERVICE_URL =
  process.env.CAMPAIGN_SERVICE_URL ??
  process.env.NEXT_PUBLIC_CAMPAIGN_SERVICE_URL ??
  "https://localhost:4600";

const WORLD_SERVICE_URL =
  process.env.WORLD_SERVICE_URL ??
  process.env.NEXT_PUBLIC_WORLD_SERVICE_URL ??
  "https://localhost:4501";

// Helper to get admin token for API calls
async function getAdminTokenForCampaign(request: APIRequestContext): Promise<string> {
  const url = `${AUTH_SERVICE_URL}/auth/login`;
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
      `Login failed: ${errorMessage} (status ${status}). Check that auth service is running.`
    );
  }

  const body = await response.json();
  if (!body.token) {
    throw new Error("Login response missing token");
  }
  return body.token;
}

// Helper to make API calls to campaign service
async function campaignApiCall(
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

  const url = `${CAMPAIGN_SERVICE_URL}${path}`;
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

// Helper to get or create a test world via API
async function getOrCreateTestWorld(request: APIRequestContext, adminToken: string): Promise<string> {
  const worldName = "Eldoria"; // Use a standard test world name
  
  try {
    // Try to get existing worlds
    const worldsResponse = await request.fetch(`${WORLD_SERVICE_URL}/worlds`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      ignoreHTTPSErrors: true
    });
    
    if (worldsResponse.ok()) {
      const body = await worldsResponse.json() as { worlds?: Array<{ id: string; name: string }> };
      const worlds = body.worlds || [];
      const existingWorld = worlds.find((w) => w.name.toLowerCase() === worldName.toLowerCase());
      if (existingWorld) {
        return existingWorld.id;
      }
    }
  } catch {
    // If GET fails, try to create
  }
  
  // Create a new world
  try {
    const createResponse = await request.fetch(`${WORLD_SERVICE_URL}/worlds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      data: { name: worldName, description: "A test world for campaigns" },
      ignoreHTTPSErrors: true
    });
    
    if (createResponse.ok()) {
      const body = await createResponse.json() as { world?: { id: string } };
      if (body.world?.id) {
        return body.world.id;
      }
    }
    
    // If creation failed, try to get worlds again (maybe it was created concurrently)
    const worldsResponse = await request.fetch(`${WORLD_SERVICE_URL}/worlds`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      ignoreHTTPSErrors: true
    });
    
    if (worldsResponse.ok()) {
      const body = await worldsResponse.json() as { worlds?: Array<{ id: string; name: string }> };
      const worlds = body.worlds || [];
      const existingWorld = worlds.find((w) => w.name.toLowerCase() === worldName.toLowerCase());
      if (existingWorld) {
        return existingWorld.id;
      }
    }
  } catch {
    // Fall through to error
  }
  
  throw new Error(`Failed to get or create test world "${worldName}"`);
}

When('the admin navigates to the "Campaigns" planning screen', async ({ page }) => {
  await selectWorldAndEnterPlanningMode(page, "Campaigns");
});

When('the test campaign exists', async ({ page, request }) => {
  // Make campaign name unique per worker to avoid conflicts when tests run in parallel
  const uniqueCampaignName = getUniqueCampaignName("Rise of the Dragon King");
  
  // Detect if we should use API (Background) or UI (scenario)
  // If page hasn't been navigated yet (URL is about:blank or empty), we're likely in Background
  // Also check if page is closed or not ready - if so, use API
  let useApi = false;
  try {
    const currentUrl = page.url();
    useApi = (currentUrl === "about:blank" || currentUrl === "") && !!request;
  } catch {
    // If we can't get the URL (page might be closed), use API if request is available
    useApi = !!request;
  }
  
  if (useApi) {
    // API-based creation (for Background - no UI interaction)
    try {
      // Get admin token for API calls
      const adminToken = await getAdminTokenForCampaign(request);
      
      // Get or create a test world (campaigns require a world)
      const worldId = await getOrCreateTestWorld(request, adminToken);
      
      // Get the world name from the worldId so we can select it in UI scenarios
      let worldName = "Eldoria"; // Default fallback
      try {
        const worldsResponse = await request.fetch(`${WORLD_SERVICE_URL}/worlds`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          ignoreHTTPSErrors: true
        });
        if (worldsResponse.ok()) {
          const body = await worldsResponse.json() as { worlds?: Array<{ id: string; name: string }> };
          const worlds = body.worlds || [];
          const world = worlds.find((w) => w.id === worldId);
          if (world) {
            worldName = world.name;
          }
        }
      } catch {
        // If we can't get world name, use default
      }
      
      // Check if campaign already exists (filter by world)
      try {
        const campaignsResponse = await campaignApiCall(request, "GET", `/worlds/${worldId}/campaigns`, { token: adminToken });
        const campaigns = campaignsResponse.campaigns || [];
        const existingCampaign = campaigns.find((c: any) => c.name === uniqueCampaignName);
        if (existingCampaign) {
          // Campaign exists - store the name and world name for other steps to use
        try {
          await page.evaluate((name, world) => {
            (window as any).__testCampaignName = name;
            (window as any).__testWorldName = world;
          }, uniqueCampaignName, worldName);
        } catch {
          // Page might not be ready - that's okay
        }
        return;
        }
      } catch {
        // If GET fails, try to create anyway
      }
      
      // Create campaign via API with worldId
      const createResponse = await campaignApiCall(request, "POST", "/campaigns", {
        token: adminToken,
        body: { name: uniqueCampaignName, summary: "A long-running campaign about ancient draconic power returning.", worldId }
      });
      
      // Response format: { campaign: Campaign }
      const createdCampaign = createResponse.campaign;
      if (!createdCampaign) {
        throw new Error("Campaign creation response missing campaign data");
      }
      
      // Store the unique name and world name in page context for other steps to use
      // Use try-catch since page might not be ready yet in Background
      try {
        await page.evaluate((name, world) => {
          (window as any).__testCampaignName = name;
          (window as any).__testWorldName = world;
        }, uniqueCampaignName, worldName);
      } catch {
        // Page might not be ready - that's okay, we'll regenerate the name in the select step
        // The name is deterministic (based on worker index), so it will match
      }
    } catch (err) {
      const error = err as Error;
      if (error.message.includes("Cannot connect") || error.message.includes("ECONNREFUSED")) {
        throw new Error(
          `Cannot connect to campaign service at ${CAMPAIGN_SERVICE_URL}. Ensure the campaign service is running.`
        );
      }
      // If campaign already exists (409), that's fine - just store the name
      if (error.message.includes("409") || error.message.includes("already exists")) {
        try {
          await page.evaluate((name) => {
            (window as any).__testCampaignName = name;
          }, uniqueCampaignName);
        } catch {
          // Page might not be ready - that's okay
        }
        return;
      }
      throw err;
    }
    return;
  }
  
  // UI-based creation (for scenarios)
  await ensureCampaignExists(
    page,
    uniqueCampaignName,
    "A long-running campaign about ancient draconic power returning."
  );
  
  // Store the unique name in page context for other steps to use
  await page.evaluate((name) => {
    (window as any).__testCampaignName = name;
  }, uniqueCampaignName);
});

// Combined steps for campaign exists + view navigation
When('the test campaign exists with sessions view', async ({ page }) => {
  const uniqueCampaignName = getUniqueCampaignName("Rise of the Dragon King");
  
  await ensureCampaignExists(
    page,
    uniqueCampaignName,
    "A long-running campaign about ancient draconic power returning."
  );
  
  await page.evaluate((name) => {
    (window as any).__testCampaignName = name;
  }, uniqueCampaignName);
  
  // Navigate to sessions view
  const campaignViewsTablist = page.getByRole("tablist", { name: "Campaign views" });
  const sessionsTab = campaignViewsTablist.getByRole("tab", { name: "Sessions" });
  await expect(sessionsTab).toBeVisible({ timeout: 3000 });
  await sessionsTab.click();
});

When('the test campaign exists with players view', async ({ page }) => {
  const uniqueCampaignName = getUniqueCampaignName("Rise of the Dragon King");
  
  await ensureCampaignExists(
    page,
    uniqueCampaignName,
    "A long-running campaign about ancient draconic power returning."
  );
  
  await page.evaluate((name) => {
    (window as any).__testCampaignName = name;
  }, uniqueCampaignName);
  
  // Navigate to players view
  const campaignViewsTablist = page.getByRole("tablist", { name: "Campaign views" });
  const playersTab = campaignViewsTablist.getByRole("tab", { name: "Players" });
  await expect(playersTab).toBeVisible({ timeout: 3000 });
  await playersTab.click();
});

When('the test campaign exists with story arcs view', async ({ page }) => {
  const uniqueCampaignName = getUniqueCampaignName("Rise of the Dragon King");
  
  await ensureCampaignExists(
    page,
    uniqueCampaignName,
    "A long-running campaign about ancient draconic power returning."
  );
  
  await page.evaluate((name) => {
    (window as any).__testCampaignName = name;
  }, uniqueCampaignName);
  
  // Navigate to story arcs view
  const campaignViewsTablist = page.getByRole("tablist", { name: "Campaign views" });
  const storyArcsTab = campaignViewsTablist.getByRole("tab", { name: "Story arcs" });
  await expect(storyArcsTab).toBeVisible({ timeout: 3000 });
  await storyArcsTab.click();
  await expect(page.getByRole("button", { name: "Add story arc" })).toBeVisible();
});

When('the test campaign exists with timeline view', async ({ page }) => {
  const uniqueCampaignName = getUniqueCampaignName("Rise of the Dragon King");
  
  await ensureCampaignExists(
    page,
    uniqueCampaignName,
    "A long-running campaign about ancient draconic power returning."
  );
  
  await page.evaluate((name) => {
    (window as any).__testCampaignName = name;
  }, uniqueCampaignName);
  
  // Navigate to timeline view
  const campaignViewsTablist = page.getByRole("tablist", { name: "Campaign views" });
  const timelineTab = campaignViewsTablist.getByRole("tab", { name: "Timeline" });
  await expect(timelineTab).toBeVisible({ timeout: 3000 });
  await timelineTab.click();
});

When(
  'the admin creates a campaign named {string} with summary {string}',
  async ({ page }, campaignName: string, summary: string) => {
    // Navigate to Campaigns planning screen if not already there
    const planningTabs = page.getByRole("tablist", { name: "World planning views" });
    const isInPlanningMode = await planningTabs.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (!isInPlanningMode) {
      await selectWorldAndEnterPlanningMode(page, "Campaigns");
    } else {
      // Check if we're on the Campaigns sub-tab
      const campaignsTab = planningTabs.getByRole("tab", { name: "Campaigns" });
      const isOnCampaignsTab = await campaignsTab.getAttribute("aria-selected").then(attr => attr === "true").catch(() => false);
      if (!isOnCampaignsTab) {
        // Navigate to Campaigns sub-tab
        await campaignsTab.click();
        // Wait for Campaigns view to be ready
        await safeWait(page, STABILITY_WAIT_SHORT);
      }
    }
    
    // Check if campaign already exists (from previous test run)
    const hasCampaign = await page
      .getByRole("tab", { name: campaignName })
      .first()
      .isVisible()
      .catch(() => false);

    if (hasCampaign) {
      // Campaign already exists, skip creation
      return;
    }

    // Open create campaign popup via Snapp menu
    await page.getByRole("button", { name: /^Snapp/i }).click();
    // Wait for menu to be visible and "New Campaign" button to appear
    const newCampaignButton = page.getByRole("button", { name: "New Campaign" });
    await expect(newCampaignButton).toBeVisible({ timeout: 3000 });
    await newCampaignButton.click();
    
    // Wait for modal to open using transition event
    await waitForModalOpen(page, "campaign", 5000);

    // Fill in campaign details
    await page.getByLabel("Campaign name").fill(campaignName);
    await page.getByLabel("Summary").fill(summary);

    // Set up event listener BEFORE clicking submit
    // This ensures we don't miss the event if it fires quickly
    // Reduced timeout from 10000ms to 5000ms for better performance
    const campaignCreatedPromise = waitForCampaignCreated(page, campaignName, 5000);

    // Submit the form
    await page.getByRole("button", { name: "Save campaign" }).click();
    
    // Wait for campaign creation event (this fires after API success + state update)
    // The helper includes multiple fallbacks (modal close, tab appearance, heading appearance)
    try {
      await campaignCreatedPromise;
      // Campaign was created successfully - verify it's visible
      // Check if campaign tab or heading is visible (campaign might be auto-selected)
      const campaignTab = page.getByRole("tab", { name: campaignName }).first();
      const campaignHeading = page.locator('h3.snapp-heading').filter({ hasText: campaignName }).first();
      const tabVisible = await campaignTab.isVisible({ timeout: 2000 }).catch(() => false);
      const headingVisible = await campaignHeading.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (tabVisible || headingVisible) {
        // Campaign is visible - success! Close modal if still open
        await closeModalIfOpen(page, "campaign", /create campaign/i);
        return;
      }
      
      // Campaign not visible yet - wait a bit more and check again
      await safeWait(page, 500);
      const finalTabCheck = await campaignTab.isVisible({ timeout: 2000 }).catch(() => false);
      const finalHeadingCheck = await campaignHeading.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (finalTabCheck || finalHeadingCheck) {
        // Campaign is visible now - close modal if still open
        await closeModalIfOpen(page, "campaign", /create campaign/i);
        return;
      }
      
      // Campaign not visible - check for errors
      const errorVisible = await page.getByTestId("error-message").isVisible({ timeout: 1000 }).catch(() => false);
      if (errorVisible) {
        const errorText = await page.getByTestId("error-message").textContent();
        // Handle "already exists" errors gracefully
        await handleAlreadyExistsError(page, errorText || null, "campaign", /create campaign/i);
        return; // Campaign already exists, it should appear in the list
      }
      
      // No error but campaign not visible - might be a timing issue
      // Close modal and let the "Then" step verify campaign exists
      await closeModalIfOpen(page, "campaign", /create campaign/i);
    } catch (error) {
      // Event/fallback didn't fire - check if campaign actually exists anyway
      const campaignTab = page.getByRole("tab", { name: campaignName }).first();
      const campaignHeading = page.locator('h3.snapp-heading').filter({ hasText: campaignName }).first();
      const tabVisible = await campaignTab.isVisible({ timeout: 2000 }).catch(() => false);
      const headingVisible = await campaignHeading.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (tabVisible || headingVisible) {
        // Campaign exists - that's what matters, even if events didn't fire
        await closeModalIfOpen(page, "campaign", /create campaign/i);
        return;
      }
      
      // Check for errors
      const errorVisible = await page.getByTestId("error-message").isVisible({ timeout: 1000 }).catch(() => false);
      if (errorVisible) {
        const errorText = await page.getByTestId("error-message").textContent();
        // Handle "already exists" errors gracefully
        await handleAlreadyExistsError(page, errorText || null, "campaign", /create campaign/i);
        return; // Campaign already exists, it should appear in the list
      }
      
      // No error but event didn't fire and campaign not visible - rethrow original error
      throw error;
    }
  }
);

When(
  'the game master creates a campaign named {string} with summary {string}',
  async ({ page }, campaignName: string, summary: string) => {
    // Reuse the same implementation as admin step since both can create campaigns
    // Navigate to Campaigns planning screen if not already there
    const planningTabs = page.getByRole("tablist", { name: "World planning views" });
    const isInPlanningMode = await planningTabs.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (!isInPlanningMode) {
      await selectWorldAndEnterPlanningMode(page, "Campaigns");
    } else {
      // Check if we're on the Campaigns sub-tab
      const campaignsTab = planningTabs.getByRole("tab", { name: "Campaigns" });
      const isOnCampaignsTab = await campaignsTab.getAttribute("aria-selected").then(attr => attr === "true").catch(() => false);
      if (!isOnCampaignsTab) {
        // Navigate to Campaigns sub-tab
        await campaignsTab.click();
        // Wait for Campaigns view to be ready
        await safeWait(page, STABILITY_WAIT_SHORT);
      }
    }
    
    // Check if campaign already exists (from previous test run)
    const hasCampaign = await page
      .getByRole("tab", { name: campaignName })
      .first()
      .isVisible()
      .catch(() => false);

    if (hasCampaign) {
      // Campaign already exists, skip creation
      return;
    }

    // Open create campaign popup via Snapp menu
    await page.getByRole("button", { name: /^Snapp/i }).click();
    // Wait for menu to be visible and "New Campaign" button to appear
    const newCampaignButton = page.getByRole("button", { name: "New Campaign" });
    await expect(newCampaignButton).toBeVisible({ timeout: 3000 });
    await newCampaignButton.click();
    
    // Wait for modal to open using transition event
    await waitForModalOpen(page, "campaign", 5000);

    // Fill in campaign details
    await page.getByLabel("Campaign name").fill(campaignName);
    await page.getByLabel("Summary").fill(summary);

    // Set up event listener BEFORE clicking submit
    // This ensures we don't miss the event if it fires quickly
    // Reduced timeout from 10000ms to 5000ms for better performance
    const campaignCreatedPromise = waitForCampaignCreated(page, campaignName, 5000);

    // Submit the form
    await page.getByRole("button", { name: "Save campaign" }).click();
    
    // Wait for campaign creation event (this fires after API success + state update)
    // The helper includes multiple fallbacks (modal close, tab appearance, heading appearance)
    try {
      await campaignCreatedPromise;
      // Campaign was created successfully - verify it's visible
      // Check if campaign tab or heading is visible (campaign might be auto-selected)
      const campaignTab = page.getByRole("tab", { name: campaignName }).first();
      const campaignHeading = page.locator('h3.snapp-heading').filter({ hasText: campaignName }).first();
      const tabVisible = await campaignTab.isVisible({ timeout: 2000 }).catch(() => false);
      const headingVisible = await campaignHeading.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (tabVisible || headingVisible) {
        // Campaign is visible - success! Close modal if still open
        await closeModalIfOpen(page, "campaign", /create campaign/i);
        return;
      }
      
      // Campaign not visible yet - wait a bit more and check again
      await safeWait(page, 500);
      const finalTabCheck = await campaignTab.isVisible({ timeout: 2000 }).catch(() => false);
      const finalHeadingCheck = await campaignHeading.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (finalTabCheck || finalHeadingCheck) {
        // Campaign is visible now - close modal if still open
        await closeModalIfOpen(page, "campaign", /create campaign/i);
        return;
      }
      
      // Campaign not visible - check for errors
      const errorVisible = await page.getByTestId("error-message").isVisible({ timeout: 1000 }).catch(() => false);
      if (errorVisible) {
        const errorText = await page.getByTestId("error-message").textContent();
        // Handle "already exists" errors gracefully
        await handleAlreadyExistsError(page, errorText || null, "campaign", /create campaign/i);
        return; // Campaign already exists, it should appear in the list
      }
      
      // No error but campaign not visible - might be a timing issue
      // Close modal and let the "Then" step verify campaign exists
      await closeModalIfOpen(page, "campaign", /create campaign/i);
    } catch (error) {
      // Event/fallback didn't fire - check if campaign actually exists anyway
      const campaignTab = page.getByRole("tab", { name: campaignName }).first();
      const campaignHeading = page.locator('h3.snapp-heading').filter({ hasText: campaignName }).first();
      const tabVisible = await campaignTab.isVisible({ timeout: 2000 }).catch(() => false);
      const headingVisible = await campaignHeading.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (tabVisible || headingVisible) {
        // Campaign exists - that's what matters, even if events didn't fire
        await closeModalIfOpen(page, "campaign", /create campaign/i);
        return;
      }
      
      // Check for errors
      const errorVisible = await page.getByTestId("error-message").isVisible({ timeout: 1000 }).catch(() => false);
      if (errorVisible) {
        const errorText = await page.getByTestId("error-message").textContent();
        // Handle "already exists" errors gracefully
        await handleAlreadyExistsError(page, errorText || null, "campaign", /create campaign/i);
        return; // Campaign already exists, it should appear in the list
      }
      
      // No error but event didn't fire and campaign not visible - rethrow original error
      throw error;
    }
  }
);

Then(
  'the UI shows a campaign tab named {string}',
  async ({ page }, campaignName: string) => {
    // Campaign might be auto-selected after creation, so check for either:
    // 1. Campaign tab visible (not selected)
    // 2. Campaign heading visible (selected)
    const campaignTabVisible = await page
      .getByRole("tab", { name: campaignName })
      .first()
      .isVisible()
      .catch(() => false);
    
    const campaignHeadingVisible = await page
      .locator('h3.snapp-heading')
      .filter({ hasText: campaignName })
      .first()
      .isVisible()
      .catch(() => false);
    
    if (!campaignTabVisible && !campaignHeadingVisible) {
      // Neither visible - wait for campaign to appear (might be loading)
      const campaignTab = page.getByRole("tab", { name: campaignName }).first();
      const tabVisibleAfterWait = await campaignTab.isVisible({ timeout: 5000 }).catch(() => false);
      
      const headingVisibleAfterWait = await page
        .locator('h3.snapp-heading')
        .filter({ hasText: campaignName })
        .first()
        .isVisible()
        .catch(() => false);
      
      if (!tabVisibleAfterWait && !headingVisibleAfterWait) {
        // Still not visible - expect the tab (original behavior)
        await expect(
          page.getByRole("tab", { name: campaignName }).first()
        ).toBeVisible({ timeout: 3000 });
      }
    }
    // If either is visible, the campaign exists and is shown in the UI
  }
);

When("the admin selects the test campaign", async ({ page }) => {
  // Get the stored test campaign name
  // Try multiple times in case page context isn't ready yet
  let uniqueCampaignName: string | null = null;
  for (let i = 0; i < 5; i++) {
    try {
      uniqueCampaignName = await page.evaluate(() => {
        return (window as any).__testCampaignName;
      });
      if (uniqueCampaignName) break;
    } catch {
      // Page might not be ready yet
    }
    await page.waitForTimeout(200);
  }
  
  if (!uniqueCampaignName) {
    // Fallback: generate the name (should match what was created)
    uniqueCampaignName = getUniqueCampaignName("Rise of the Dragon King");
  }
  
  // Select the campaign tab
  const campaignTab = page.getByRole("tab", { name: uniqueCampaignName }).first();
  await expect(campaignTab).toBeVisible({ timeout: 5000 });
  await campaignTab.click();
  
  // Wait for campaign to be selected (heading or view to appear)
  await Promise.race([
    page.locator('h3.snapp-heading').filter({ hasText: uniqueCampaignName }).first().waitFor({ timeout: 3000 }).catch(() => null),
    page.getByRole("tablist", { name: "Campaign views" }).waitFor({ timeout: 3000 }).catch(() => null)
  ]);
});
