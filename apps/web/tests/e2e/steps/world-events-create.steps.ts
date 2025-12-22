import { createBdd } from "playwright-bdd";
import { ensureWorldExistsAndSelected } from "./world-entities-create.steps";
import { createEvent } from "../helpers/entityCreation";
import { navigateToEventsTab } from "../helpers/tabs";
import { verifyEntityInList } from "../helpers/verification";

const { When, Then } = createBdd();
// Note: "the admin navigates to the World Entities planning screen" is defined in world-create.steps.ts
// Note: "world Eldoria exists" and "the admin selects world Eldoria" are defined in world-entities-create.steps.ts

// Combined step: world exists and is selected with events tab
When("world {string} exists and is selected with events tab", async ({ page }, worldName: string) => {
  await ensureWorldExistsAndSelected(page, worldName);
  await navigateToEventsTab(page);
});

When('the admin ensures event "The Great Awakening" exists', async ({ page }) => {
  await createEvent(page, "The Great Awakening", "Ancient dragons awaken from their slumber.");
});

Then('event {string} appears in the events list', async ({ page }, eventName: string) => {
  await verifyEntityInList(page, eventName);
});
