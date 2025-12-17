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
  timeout: 30000, // 30 second timeout for tests (increased for concurrent execution)
  expect: {
    timeout: 10000, // 10 second timeout for assertions
  },
  use: {
    baseURL: "https://localhost:3000",
    trace: "on-first-retry",
    ignoreHTTPSErrors: true,
    // Add retries for flaky tests during concurrent execution
    actionTimeout: 10000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});


