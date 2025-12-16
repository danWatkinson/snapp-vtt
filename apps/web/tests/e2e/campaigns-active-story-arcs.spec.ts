import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("Game master can see active Story Arcs in Campaign Timeline", async ({
  page
}) => {
  await loginAsAdmin(page);

  // Go to Campaigns tab
  await page.getByRole("tab", { name: "Campaigns" }).click();

  // Ensure "Rise of the Dragon King" campaign exists
  const hasCampaignTab = await page
    .getByRole("tab", { name: "Rise of the Dragon King" })
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasCampaignTab) {
    await page.getByRole("button", { name: "Create campaign" }).click();
    await page.getByLabel("Campaign name").fill("Rise of the Dragon King");
    await page
      .getByLabel("Summary")
      .fill("A long-running campaign about ancient draconic power returning.");
    await page.getByRole("button", { name: "Save campaign" }).click();

    await expect(
      page.getByRole("tab", { name: "Rise of the Dragon King" }).first()
    ).toBeVisible();
  }

  // Select campaign and open timeline view via nested tabs
  await page.getByRole("tab", { name: "Rise of the Dragon King" }).first().click();
  await page.getByRole("tab", { name: "Timeline" }).click();

  // Wait for timeline section to load
  await expect(page.getByText(/timeline for/i)).toBeVisible();

  // Verify "Active Story Arcs" section exists
  await expect(
    page.getByRole("heading", { name: /active story arcs/i })
  ).toBeVisible({ timeout: 10000 });
});
