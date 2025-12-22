import { createBdd } from "playwright-bdd";
import { verifyEntityInList } from "../helpers/verification";
import { createSession } from "../helpers/entityCreation";
// Note: "the admin navigates to the Campaigns planning screen" and "the campaign Rise of the Dragon King exists" 
// are defined in campaigns-create.steps.ts

const { When, Then } = createBdd();

When('the admin ensures session "Session 1" exists in the campaign', async ({ page }) => {
  await createSession(page, "Session 1");
});

Then('session "Session 1" appears in the sessions list', async ({ page }) => {
  await verifyEntityInList(page, "Session 1");
});
