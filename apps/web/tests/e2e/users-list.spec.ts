import { test, expect } from "@playwright/test";
import { loginAsAdmin, selectWorldAndEnterPlanningMode } from "./helpers";

test("Admin can view list of all users", async ({ page }) => {
  await loginAsAdmin(page);

  // Navigate into Users planning view (world context + Users tab)
  await selectWorldAndEnterPlanningMode(page, "Users");

  // Wait for users section to appear (admin-only)
  await expect(page.getByRole("heading", { name: /^Users$/i })).toBeVisible({
    timeout: 5000
  });

  // Wait for users list to load
  await expect(page.getByTestId("users-list")).toBeVisible({
    timeout: 10000
  });

  // Verify we can see usernames in the list
  // Should see at least "admin" and "alice" (seeded users)
  await expect(page.getByTestId("username-admin")).toBeVisible({
    timeout: 5000
  });
  await expect(page.getByTestId("username-alice")).toBeVisible({
    timeout: 5000
  });
});

