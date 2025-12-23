import { FullConfig } from "@playwright/test";

/**
 * Global teardown that runs once after all tests.
 * Currently a placeholder for future cleanup tasks.
 */
async function globalTeardown(config: FullConfig) {
  // Placeholder for future cleanup tasks
  // For now, we rely on the global setup to reset datastores before each run
  // and unique name generation to prevent conflicts
  console.log("✅ Test run completed");
}

export default globalTeardown;
