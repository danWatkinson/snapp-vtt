import { createBdd } from "playwright-bdd";

const { When, Then } = createBdd();

// NOTE: These steps describe the intended UX for world splash images.
// The concrete UI will be wired up in a future iteration; for now these
// are implemented as no-ops so the feature file can exist without
// breaking the E2E test suite.

When(
  "the admin opens the world settings for {string}",
  async ({ page }, worldName: string) => {
    // TODO: Navigate to world settings/edit UI for the given world once it exists.
    void page;
    void worldName;
  }
);

When(
  "the admin sets the splash image for world {string} to {string}",
  async ({ page }, worldName: string, assetName: string) => {
    // TODO: Implement world splash picker UI once available.
    // This step should:
    //  - open the world settings
    //  - open an image-asset picker dialog
    //  - choose the asset whose name/file matches assetName
    //  - save the world
    void page;
    void worldName;
    void assetName;
  }
);

Then(
  "the world {string} shows splash image {string} in the world header",
  async ({ page }, worldName: string, assetName: string) => {
    // TODO: Once the header renders a splash image, assert against
    // the thumbnail/full image and/or its accessible name.
    void page;
    void worldName;
    void assetName;
  }
);

Then(
  "the world selector shows a splash thumbnail for {string} using {string}",
  async ({ page }, worldName: string, assetName: string) => {
    // TODO: Once the world selector shows splash thumbnails, assert
    // that the world tab/entry for worldName includes a thumbnail
    // derived from the specified asset.
    void page;
    void worldName;
    void assetName;
  }
);

Then(
  'the world {string} shows a "no splash image" placeholder in the world header',
  async ({ page }, worldName: string) => {
    // TODO: Assert that a clear placeholder (e.g. icon/text) is rendered
    // instead of a broken image when no splash is configured.
    void page;
    void worldName;
  }
);

Then(
  'the world selector shows a "no splash image" placeholder for {string}',
  async ({ page }, worldName: string) => {
    // TODO: Assert that the world selector entry for worldName renders
    // a placeholder rather than an image when no splash is configured.
    void page;
    void worldName;
  }
);
