export interface World {
  id: string;
  name: string;
  description: string;
  /**
   * Optional reference to a DigitalAsset (image) used as the world's splash image.
   * This is an ID in the assets service, not a URL.
   */
  splashImageAssetId?: string;
}

export interface WorldEntity {
  id: string;
  worldId: string;
  type: "location" | "creature" | "faction" | "concept" | "event";
  name: string;
  summary: string;
  beginningTimestamp?: number;
  endingTimestamp?: number;
}

export interface WorldLocation extends WorldEntity {
  type: "location";
}

import { AuthenticationError, isAuthenticationError } from "../auth/authErrors";

const WORLD_SERVICE_URL =
  process.env.NEXT_PUBLIC_WORLD_SERVICE_URL ?? "https://localhost:4501";

export async function fetchWorlds(): Promise<World[]> {
  const res = await fetch(`${WORLD_SERVICE_URL}/worlds`);
  if (!res.ok) {
    throw new Error("Failed to load worlds");
  }
  const body = (await res.json()) as { worlds: World[] };
  return body.worlds;
}

export async function createWorld(
  name: string,
  description: string,
  token?: string
): Promise<World> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${WORLD_SERVICE_URL}/worlds`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, description })
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (isAuthenticationError(res)) {
      throw new AuthenticationError("Authentication failed", res.status);
    }
    throw new Error(body.error ?? "Failed to create world");
  }
  return body.world as World;
}

export async function updateWorldSplashImage(
  worldId: string,
  splashImageAssetId: string | null,
  token?: string
): Promise<World> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${WORLD_SERVICE_URL}/worlds/${worldId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ splashImageAssetId })
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (isAuthenticationError(res)) {
      throw new AuthenticationError("Authentication failed", res.status);
    }
    throw new Error(body.error ?? "Failed to update world");
  }
  return body.world as World;
}

export async function fetchWorldEntities(
  worldId: string,
  type?: "location" | "creature" | "faction" | "concept" | "event"
): Promise<WorldEntity[]> {
  const url = type
    ? `${WORLD_SERVICE_URL}/worlds/${worldId}/entities?type=${type}`
    : `${WORLD_SERVICE_URL}/worlds/${worldId}/entities`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to load entities");
  }
  const body = (await res.json()) as { entities: WorldEntity[] };
  return body.entities;
}

export async function createWorldEntity(
  worldId: string,
  type: "location" | "creature" | "faction" | "concept" | "event",
  name: string,
  summary: string,
  beginningTimestamp?: number,
  endingTimestamp?: number,
  token?: string
): Promise<WorldEntity> {
  const body: {
    type: string;
    name: string;
    summary: string;
    beginningTimestamp?: number;
    endingTimestamp?: number;
  } = {
    type,
    name,
    summary
  };
  if (type === "event") {
    if (beginningTimestamp !== undefined) {
      body.beginningTimestamp = beginningTimestamp;
    }
    if (endingTimestamp !== undefined) {
      body.endingTimestamp = endingTimestamp;
    }
  }
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${WORLD_SERVICE_URL}/worlds/${worldId}/entities`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  const responseBody = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (isAuthenticationError(res)) {
      throw new AuthenticationError("Authentication failed", res.status);
    }
    throw new Error(responseBody.error ?? `Failed to create ${type}`);
  }
  return responseBody.entity as WorldEntity;
}

// Convenience functions for backward compatibility
export async function fetchWorldLocations(
  worldId: string
): Promise<WorldLocation[]> {
  const entities = await fetchWorldEntities(worldId, "location");
  return entities as WorldLocation[];
}

export async function createWorldLocation(
  worldId: string,
  name: string,
  summary: string
): Promise<WorldLocation> {
  return (await createWorldEntity(
    worldId,
    "location",
    name,
    summary
  )) as WorldLocation;
}


