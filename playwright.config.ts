import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";
import "dotenv/config";

const testDir = defineBddConfig({
  paths: ["apps/web/tests/e2e/**/*.feature"],
  require: ["apps/web/tests/e2e/steps/**/*.ts"],
  outputDir: ".features-gen"
});

// Generate a unique test run ID to ensure test isolation across runs
// This prevents name collisions when re-running tests against the same datastores
const TEST_RUN_ID = process.env.TEST_RUN_ID || `run-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
process.env.TEST_RUN_ID = TEST_RUN_ID;

export default defineConfig({
  testDir,
  workers: 11, // Run tests in parallel with 11 workers for faster execution
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
  // Global setup: Reset all datastores before test run for test isolation
  globalSetup: require.resolve("./apps/web/tests/e2e/global-setup.ts"),
  // Global teardown: Placeholder for future cleanup tasks
  globalTeardown: require.resolve("./apps/web/tests/e2e/global-teardown.ts"),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});


