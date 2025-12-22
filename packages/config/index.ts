/**
 * Centralized configuration management for the Snapp VTT system.
 * 
 * This module provides type-safe access to all environment variables
 * with sensible defaults and clear documentation.
 */

/**
 * Service port configuration
 */
export const ports = {
  /** Auth service port (default: 3001) */
  auth: Number(process.env.AUTH_PORT ?? process.env.PORT ?? 3001),
  
  /** World service port (default: 3002) */
  world: Number(process.env.WORLD_PORT ?? process.env.PORT ?? 3002),
  
  /** Campaign service port (default: 3003) */
  campaign: Number(process.env.CAMPAIGN_PORT ?? process.env.PORT ?? 3003),
  
  /** Assets service port (default: 3004) */
  assets: Number(process.env.ASSET_PORT ?? process.env.PORT ?? 3004),
  
  /** Web UI port (default: 3000) */
  web: Number(process.env.WEB_PORT ?? process.env.PORT ?? 3000)
} as const;

/**
 * HTTPS certificate configuration helpers
 * Note: Paths are resolved at runtime, not at module load time
 */
export const https = {
  /** Get certificate directory path */
  getCertDir(): string {
    if (process.env.HTTPS_CERT_DIR) {
      return process.env.HTTPS_CERT_DIR;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path");
    return path.join(process.cwd(), "..", "Snapp-other", "certs");
  },
  
  /** Get private key file path */
  getKeyPath(): string {
    if (process.env.HTTPS_KEY_PATH) {
      return process.env.HTTPS_KEY_PATH;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path");
    return path.join(this.getCertDir(), "localhost-key.pem");
  },
  
  /** Get certificate file path */
  getCertPath(): string {
    if (process.env.HTTPS_CERT_PATH) {
      return process.env.HTTPS_CERT_PATH;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path");
    return path.join(this.getCertDir(), "localhost-cert.pem");
  }
};

/**
 * Authentication configuration
 */
export const auth = {
  /** JWT secret for token signing/verification (default: "dev-secret") */
  jwtSecret: process.env.AUTH_JWT_SECRET ?? process.env.JWT_SECRET ?? "dev-secret",
  
  /** Token expiration time in seconds (default: 600 = 10 minutes) */
  tokenExpiresInSeconds: Number(process.env.AUTH_TOKEN_EXPIRES_IN_SECONDS ?? 600)
} as const;

/**
 * Service URL configuration (for frontend)
 * These use NEXT_PUBLIC_ prefix so they're available in the browser
 */
export const serviceUrls = {
  /** Auth service URL */
  auth: process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ?? `https://localhost:${ports.auth}`,
  
  /** World service URL */
  world: process.env.NEXT_PUBLIC_WORLD_SERVICE_URL ?? `https://localhost:${ports.world}`,
  
  /** Campaign service URL */
  campaign: process.env.NEXT_PUBLIC_CAMPAIGN_SERVICE_URL ?? `https://localhost:${ports.campaign}`,
  
  /** Assets service URL */
  assets: process.env.NEXT_PUBLIC_ASSET_SERVICE_URL ?? `https://localhost:${ports.assets}`
} as const;

/**
 * Seeding file paths
 */
export const seedFiles = {
  /** Path to users JSON file for seeding auth service */
  users: process.env.AUTH_USERS_FILE ?? "seeds/users.json",
  
  /** Path to worlds JSON file for seeding world service */
  worlds: process.env.WORLD_WORLDS_FILE ?? "seeds/worlds.json"
} as const;

/**
 * Asset service configuration
 */
export const assets = {
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSizeBytes: Number(process.env.ASSET_MAX_FILE_SIZE_BYTES ?? 10 * 1024 * 1024)
} as const;

/**
 * Node environment
 */
export const nodeEnv = process.env.NODE_ENV ?? "development";

/**
 * Helper to check if running in production
 */
export const isProduction = nodeEnv === "production";

/**
 * Helper to check if running in development
 */
export const isDevelopment = nodeEnv === "development";

/**
 * Helper to check if running in test
 */
export const isTest = nodeEnv === "test";
