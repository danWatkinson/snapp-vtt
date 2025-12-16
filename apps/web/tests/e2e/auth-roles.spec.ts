import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAs, selectWorldAndEnterPlanningMode } from "./helpers";

// This E2E test drives the real Next.js UI and the running auth service.
// It assumes `npm run dev` has started both:
// - Auth service on http://localhost:4000
// - Web UI on   http://localhost:3000

test("Admin can assign GM role to a user via the UI", async ({ page }) => {
  await loginAsAdmin(page);

  // Navigate into Users planning view (world context + Users tab)
  await selectWorldAndEnterPlanningMode(page, "Users");

  // Admin assigns gm role to alice
  await page.getByTestId("assign-target-username").fill("alice");
  await page.getByTestId("assign-role").fill("gm");
  await page.getByRole("button", { name: "Assign role" }).click();

  await expect(page.getByTestId("status-message")).toContainText(
    "User alice now has roles: gm"
  );

  // Now log in as alice and verify roles in the UI
  // Clear storage to logout admin first
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  
  await loginAs(page, "alice", "alice123");

  await expect(
    page.getByTestId("status-message")
  ).toContainText("Logged in as alice");

  // Open User Management via the Snapp menu in the banner
  await page.getByRole("button", { name: /Snapp/i }).click();
  await page.getByRole("button", { name: /User Management/i }).click();

  // Wait for the Users tab content to load
  const userManagementHeading = page.getByRole("heading", { name: /User Management/i });
  await expect(userManagementHeading).toBeVisible({
    timeout: 5000
  });
  
  // Roles are shown in the format "Logged in as alice (gm)" in the UsersTab header
  // This is in a <p> element next to the "User Management" heading
  // Use the parent container to scope the search to the UsersTab only
  const usersTabContainer = userManagementHeading.locator("..");
  await expect(usersTabContainer.getByText(/Logged in as alice \(gm\)/)).toBeVisible({
    timeout: 5000
  });
});




