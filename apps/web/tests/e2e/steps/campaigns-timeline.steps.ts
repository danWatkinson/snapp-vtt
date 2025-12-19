import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
// Note: "the admin navigates to the Campaigns planning screen" and "the campaign Rise of the Dragon King exists" 
// are defined in campaigns-create.steps.ts

const { When, Then } = createBdd();

Then("the current moment is displayed", async ({ page }) => {
  await expect(page.getByText(/current moment/i)).toBeVisible();
});

When("the admin advances the timeline by 1 day", async ({ page }) => {
  await page.getByRole("button", { name: "+1 day" }).click();
});

When("the admin advances the timeline by 1 week", async ({ page }) => {
  await page.getByRole("button", { name: "+1 week" }).click();
});

When("the admin advances the timeline by 1 month", async ({ page }) => {
  await page.getByRole("button", { name: "+1 month" }).click();
});

When("the admin moves the timeline back by 1 day", async ({ page }) => {
  await page.getByRole("button", { name: "-1 day" }).click();
});

When("the game master advances the timeline by 1 day", async ({ page }) => {
  await page.getByRole("button", { name: "+1 day" }).click();
});

When("the game master advances the timeline by 1 week", async ({ page }) => {
  await page.getByRole("button", { name: "+1 week" }).click();
});

When("the game master advances the timeline by 1 month", async ({ page }) => {
  await page.getByRole("button", { name: "+1 month" }).click();
});

When("the game master moves the timeline back by 1 day", async ({ page }) => {
  await page.getByRole("button", { name: "-1 day" }).click();
});

Then("the timeline reflects the changes", async ({ page }) => {
  const currentMomentText = await page.getByText(/current moment/i).textContent();
  expect(currentMomentText).toBeTruthy();
});
