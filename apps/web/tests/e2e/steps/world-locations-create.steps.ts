import { createBdd } from "playwright-bdd";
import { ensureWorldExistsAndSelected } from "./world-entities-create.steps";
import { createLocation } from "../helpers/entityCreation";
import { navigateToLocationsTab } from "../helpers/tabs";
import { verifyEntityInList } from "../helpers/verification";

const { When, Then } = createBdd();
// Note: "the admin navigates to the World Entities planning screen" is defined in world-create.steps.ts
// Note: "world Eldoria exists" and "the admin selects world Eldoria" are defined in world-entities-create.steps.ts

// Combined step: world exists and is selected with locations tab
When("world {string} exists and is selected with locations tab", async ({ page }, worldName: string) => {
  await ensureWorldExistsAndSelected(page, worldName);
  await navigateToLocationsTab(page);
});

When("the admin navigates to the locations tab", async ({ page }) => {
  await navigateToLocationsTab(page);
});

When('the admin ensures location {string} exists', async ({ page }, locationName: string) => {
  await createLocation(page, locationName);
});

Then('location {string} appears in the locations list', async ({ page }, locationName: string) => {
  await verifyEntityInList(page, locationName);
});
