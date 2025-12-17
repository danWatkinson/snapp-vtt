import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { ensureCampaignExists } from "../helpers";

const { Then, When } = createBdd();

Then("the campaigns tab is not visible", async ({ page }) => {
  await expect(page.getByRole("tab", { name: "Campaigns" })).not.toBeVisible();
});

When('the admin creates a campaign named "Authenticated Test Campaign"', async ({ page }) => {
  const campaignName = "Authenticated Test Campaign";
  
  // Use the helper function to ensure campaign exists
  await ensureCampaignExists(
    page,
    campaignName,
    "A test campaign created by authenticated user"
  );
});

Then('the campaign "Authenticated Test Campaign" appears in the campaigns list', async ({ page }) => {
  // Small wait to let any async operations complete
  // Check if page is usable first before waiting
  try {
    await page.url();
    // Page is usable, wait a bit
    await page.waitForTimeout(200).catch(() => {});
  } catch {
    // Page is not usable - check if it's closed
    let actuallyClosed = false;
    try {
      actuallyClosed = page.isClosed();
    } catch {
      // Can't check - page is in bad state
      throw new Error("Page is not accessible - cannot verify campaign appears in list");
    }
    if (actuallyClosed) {
      throw new Error("Page was closed before verifying campaign appears in list");
    }
    // Page is not usable but not closed - still an error
    throw new Error("Page is not accessible - cannot verify campaign appears in list");
  }
  
  // Check page state one more time right before the assertion
  // The page might have closed asynchronously
  let actuallyClosed = false;
  try {
    actuallyClosed = page.isClosed();
  } catch {
    // Can't check - might be in transition, try to continue
  }
  if (actuallyClosed) {
    throw new Error("Page was closed before verifying campaign appears in list");
  }
  
  // If we got here, page should be usable - verify the campaign appears
  try {
    await expect(page.getByText("Authenticated Test Campaign").first()).toBeVisible({ timeout: 5000 });
  } catch (error) {
    // Check if page closed during the assertion
    let closedDuringAssertion = false;
    try {
      closedDuringAssertion = page.isClosed();
    } catch {
      // Can't check - rethrow original error
      throw error;
    }
    if (closedDuringAssertion || error.message?.includes("closed") || error.message?.includes("Target page")) {
      throw new Error("Page was closed while verifying campaign appears in list");
    }
    // Otherwise, rethrow the original error
    throw error;
  }
});
