#!/usr/bin/env ts-node

import { spawn, ChildProcess } from "child_process";
import https from "https";
import fs from "fs";
import path from "path";

// Service URLs (matching seed-cli defaults and actual service ports)
const AUTH_URL = process.env.AUTH_URL || process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || "https://localhost:3001";
const WORLD_URL = process.env.WORLD_URL || process.env.NEXT_PUBLIC_WORLD_SERVICE_URL || "https://localhost:3002";
const CAMPAIGN_URL = process.env.CAMPAIGN_URL || process.env.NEXT_PUBLIC_CAMPAIGN_SERVICE_URL || "https://localhost:3003";
const ASSET_URL = process.env.ASSET_URL || process.env.NEXT_PUBLIC_ASSET_SERVICE_URL || "https://localhost:3004";

// Default credentials
const DEFAULT_USERNAME = process.env.SEED_USERNAME || "admin";
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || "admin123";

// Seed folder
const SEED_FOLDER = process.env.SEED_FOLDER || "./seeds";

/**
 * Make an HTTPS request with self-signed cert support
 */
function makeRequest(url: string, path: string, method: string = "GET"): Promise<{ status: number }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: path,
      method: method,
      rejectUnauthorized: false, // Accept self-signed certs
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      resolve({ status: res.statusCode || 0 });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    req.end();
  });
}

/**
 * Wait for a service to be ready by checking an endpoint
 */
async function waitForService(url: string, endpoint: string, maxAttempts: number = 30, delayMs: number = 2000): Promise<void> {
  console.log(`Waiting for service at ${url}${endpoint}...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await makeRequest(url, endpoint);
      if (response.status === 200 || response.status === 401 || response.status === 404) {
        // 401/404 are acceptable - means service is responding
        console.log(`✓ Service at ${url} is ready`);
        return;
      }
    } catch (err) {
      // Service not ready yet
    }
    
    if (attempt < maxAttempts) {
      process.stdout.write(`  Attempt ${attempt}/${maxAttempts}...\r`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error(`Service at ${url} did not become ready after ${maxAttempts} attempts`);
}

/**
 * Wait for all services to be ready
 */
async function waitForAllServices(): Promise<void> {
  console.log("\nWaiting for services to start...\n");
  
  // Wait for auth service (check /auth/login endpoint)
  await waitForService(AUTH_URL, "/auth/login", 30, 2000);
  
  // Wait for world service (check /worlds endpoint)
  await waitForService(WORLD_URL, "/worlds", 30, 2000);
  
  // Wait for campaign service (check /campaigns endpoint)
  await waitForService(CAMPAIGN_URL, "/campaigns", 30, 2000);
  
  // Wait for asset service (check /assets endpoint)
  await waitForService(ASSET_URL, "/assets", 30, 2000);
  
  console.log("\n✓ All services are ready!\n");
}

/**
 * Run npm install
 */
async function runNpmInstall(): Promise<void> {
  console.log("Running npm install...\n");
  
  return new Promise((resolve, reject) => {
    const npm = spawn("npm", ["install"], {
      stdio: "inherit",
      shell: true
    });
    
    npm.on("close", (code) => {
      if (code === 0) {
        console.log("\n✓ npm install completed\n");
        resolve();
      } else {
        reject(new Error(`npm install failed with code ${code}`));
      }
    });
    
    npm.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Start dev services
 */
function startDevServices(): ChildProcess {
  console.log("Starting dev services...\n");
  
  const devProcess = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    shell: true
  });
  
  devProcess.on("error", (err) => {
    console.error("Failed to start dev services:", err);
    process.exit(1);
  });
  
  return devProcess;
}

/**
 * Run seedAll command
 */
async function runSeedAll(): Promise<void> {
  console.log("Running seedAll...\n");
  
  return new Promise((resolve, reject) => {
    const seedProcess = spawn(
      "npm",
      [
        "run", "seedAll", "--",
        "--username", DEFAULT_USERNAME,
        "--password", DEFAULT_PASSWORD,
        "--folder", SEED_FOLDER,
        "--auth-url", AUTH_URL,
        "--world-url", WORLD_URL,
        "--campaign-url", CAMPAIGN_URL,
        "--asset-url", ASSET_URL
      ],
      {
        stdio: "inherit",
        shell: true
      }
    );
    
    seedProcess.on("close", (code) => {
      if (code === 0) {
        console.log("\n✓ SeedAll completed\n");
        resolve();
      } else {
        console.warn(`\n⚠ SeedAll exited with code ${code} (this may be expected if data already exists)\n`);
        resolve(); // Don't fail the whole process if seeding has issues
      }
    });
    
    seedProcess.on("error", (err) => {
      console.error("Failed to run seedAll:", err);
      reject(err);
    });
  });
}

/**
 * Main function
 */
async function main() {
  try {
    // Step 1: Run npm install
    await runNpmInstall();
    
    // Step 2: Start dev services
    const devProcess = startDevServices();
    
    // Step 3: Wait for services to be ready
    await waitForAllServices();
    
    // Step 4: Run seedAll
    await runSeedAll();
    
    console.log("=".repeat(60));
    console.log("✓ Setup complete! Services are running in the background.");
    console.log("=".repeat(60));
    console.log("\nPress Ctrl+C to stop all services.\n");
    
    // Keep the process alive and handle cleanup
    process.on("SIGINT", () => {
      console.log("\n\nShutting down services...");
      devProcess.kill("SIGINT");
      process.exit(0);
    });
    
    process.on("SIGTERM", () => {
      console.log("\n\nShutting down services...");
      devProcess.kill("SIGTERM");
      process.exit(0);
    });
    
    // Wait for dev process to exit (shouldn't happen, but handle it)
    devProcess.on("exit", (code) => {
      console.log(`\nDev services exited with code ${code}`);
      process.exit(code || 0);
    });
    
  } catch (err) {
    console.error("\n✗ Error:", (err as Error).message);
    process.exit(1);
  }
}

// Run main function
void main();
