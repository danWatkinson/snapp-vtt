import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("Domains are presented as tabs and can be switched", async ({ page }) => {
  await loginAsAdmin(page);

  const tabNames = ["World", "Campaigns", "Sessions", "Users"];

  // All domain tabs are visible
  for (const name of tabNames) {
    await expect(page.getByRole("tab", { name })).toBeVisible();
  }

  // Default selected tab shows its content
  await expect(page.getByRole("tab", { name: "Users" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  // Users domain shows user management UI (not login form)
  await expect(page.getByRole("heading", { name: /^User Management$/i })).toBeVisible();

  // Switching tabs updates the visible content
  await page.getByRole("tab", { name: "World" }).click();
  await expect(
    page.getByText("World domain – manage locations, maps, and lore.")
  ).toBeVisible();

  await page.getByRole("tab", { name: "Campaigns" }).click();
  await expect(
    page.getByText("Campaigns domain – plan story arcs and quests.")
  ).toBeVisible();

  await page.getByRole("tab", { name: "Sessions" }).click();
  await expect(
    page.getByText("Sessions domain – run live game sessions.")
  ).toBeVisible();
});


