/**
 * Centralized service URL configuration
 * Single source of truth for all service endpoints
 */
export const serviceUrls = {
  auth:
    process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ?? "https://localhost:4400",
  world:
    process.env.NEXT_PUBLIC_WORLD_SERVICE_URL ?? "https://localhost:4501",
  campaign:
    process.env.NEXT_PUBLIC_CAMPAIGN_SERVICE_URL ?? "https://localhost:4600",
  assets:
    process.env.NEXT_PUBLIC_ASSET_SERVICE_URL ?? "https://localhost:4700"
} as const;
