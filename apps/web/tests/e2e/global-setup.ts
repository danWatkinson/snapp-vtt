import { FullConfig } from "@playwright/test";
import { ports } from "../../../../packages/config";
import https from "https";

/**
 * Global setup that runs once before all tests.
 * Resets all service datastores to ensure test isolation.
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.use?.baseURL || "https://localhost:3000";
  
  // Extract hostname and protocol from baseURL
  const url = new URL(baseURL);
  const protocol = url.protocol;
  const hostname = url.hostname;
  
  // Service URLs
  const authUrl = `${protocol}//${hostname}:${ports.auth}`;
  const worldUrl = `${protocol}//${hostname}:${ports.world}`;
  const campaignUrl = `${protocol}//${hostname}:${ports.campaign}`;
  const assetsUrl = `${protocol}//${hostname}:${ports.assets}`;

  console.log("🧹 Resetting datastores for test isolation...");
  
  // Note: E2E_TEST_MODE doesn't need to be set here since services run in development mode
  // The reset endpoints are available in development mode for e2e test isolation

  // Helper to make HTTPS requests ignoring self-signed certificate errors
  const makeResetRequest = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        rejectUnauthorized: false // Ignore self-signed certificate errors
      };

      const req = https.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Reset failed with status ${res.statusCode}`));
        }
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.end();
    });
  };

  const resetPromises = [
    makeResetRequest(`${authUrl}/admin/reset`).catch((err) => {
      console.warn(`⚠️  Failed to reset auth service: ${err.message}`);
    }),
    makeResetRequest(`${worldUrl}/admin/reset`).catch((err) => {
      console.warn(`⚠️  Failed to reset world service: ${err.message}`);
    }),
    makeResetRequest(`${campaignUrl}/admin/reset`).catch((err) => {
      console.warn(`⚠️  Failed to reset campaign service: ${err.message}`);
    }),
    makeResetRequest(`${assetsUrl}/admin/reset`).catch((err) => {
      console.warn(`⚠️  Failed to reset assets service: ${err.message}`);
    })
  ];

  try {
    await Promise.all(resetPromises);
    console.log("✅ All datastores reset successfully");
  } catch (error) {
    console.error("❌ Error resetting datastores:", error);
    // Don't throw - allow tests to continue even if reset fails
    // The unique name generation (Solution 1) will still prevent conflicts
  }
}

export default globalSetup;
