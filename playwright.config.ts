import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // For now, point directly at the E2E tests directory.
  // Gherkin feature files live alongside .spec.ts tests.
  testDir: "apps/web/tests/e2e",
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


