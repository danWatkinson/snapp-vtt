import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";
import "dotenv/config";

const testDir = defineBddConfig({
  paths: ["apps/web/tests/e2e/**/*.feature"],
  require: ["apps/web/tests/e2e/steps/**/*.ts"],
  outputDir: ".features-gen"
});

export default defineConfig({
  testDir,
  reporter: "list",
  use: {
    baseURL: "https://localhost:3000",
    trace: "on-first-retry",
    ignoreHTTPSErrors: true
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});


