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

export type LocationRelationshipType = 
  | "contains"
  | "is contained by"
  | "borders against"
  | "is near"
  | "is connected to"
  | "has member"
  | "is member of";

export interface LocationRelationship {
  targetLocationId: string;
  relationshipType: LocationRelationshipType;
}

export interface WorldEntity {
  id: string;
  worldId: string;
  type: "location" | "creature" | "faction" | "concept" | "event";
  name: string;
  summary: string;
  beginningTimestamp?: number;
  endingTimestamp?: number;
  relationships?: LocationRelationship[];
  locationId?: string;
}

export interface WorldLocation extends WorldEntity {
  type: "location";
}

import { apiRequest, get, post, patch, postVoid } from "./baseClient";
import { serviceUrls } from "../config/services";

export async function fetchWorlds(): Promise<World[]> {
  return get<World[]>(`${serviceUrls.world}/worlds`, "worlds");
}

export async function createWorld(
  name: string,
  description: string,
  token?: string
): Promise<World> {
  return post<World>(
    `${serviceUrls.world}/worlds`,
    "world",
    { name, description },
    { token }
  );
}

export async function updateWorldSplashImage(
  worldId: string,
  splashImageAssetId: string | null,
  token?: string
): Promise<World> {
  return patch<World>(
    `${serviceUrls.world}/worlds/${worldId}`,
    "world",
    { splashImageAssetId },
    { token }
  );
}

export async function fetchWorldEntities(
  worldId: string,
  type?: "location" | "creature" | "faction" | "concept" | "event"
): Promise<WorldEntity[]> {
  const url = type
    ? `${serviceUrls.world}/worlds/${worldId}/entities?type=${type}`
    : `${serviceUrls.world}/worlds/${worldId}/entities`;
  return get<WorldEntity[]>(url, "entities");
}

export async function createWorldEntity(
  worldId: string,
  type: "location" | "creature" | "faction" | "concept" | "event",
  name: string,
  summary: string,
  beginningTimestamp?: number,
  endingTimestamp?: number,
  locationId?: string,
  token?: string
): Promise<WorldEntity> {
  const body: {
    type: string;
    name: string;
    summary: string;
    beginningTimestamp?: number;
    endingTimestamp?: number;
    locationId?: string;
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
    if (locationId !== undefined && locationId !== null) {
      body.locationId = locationId;
    }
  }
  return post<WorldEntity>(
    `${serviceUrls.world}/worlds/${worldId}/entities`,
    "entity",
    body,
    { token }
  );
}

// Convenience functions for backward compatibility
export async function fetchWorldLocations(
  worldId: string
): Promise<WorldLocation[]> {
  return fetchWorldEntities(worldId, "location") as Promise<WorldLocation[]>;
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

export async function addLocationRelationship(
  worldId: string,
  sourceLocationId: string,
  targetLocationId: string,
  relationshipType: LocationRelationshipType,
  token?: string
): Promise<void> {
  await postVoid(
    `${serviceUrls.world}/worlds/${worldId}/locations/${sourceLocationId}/relationships`,
    { targetLocationId, relationshipType },
    { token }
  );
}

export async function getLocationRelationships(
  worldId: string,
  locationId: string,
  relationshipType?: LocationRelationshipType
): Promise<LocationRelationship[]> {
  const url = relationshipType
    ? `${serviceUrls.world}/worlds/${worldId}/locations/${locationId}/relationships?type=${relationshipType}`
    : `${serviceUrls.world}/worlds/${worldId}/locations/${locationId}/relationships`;
  return get<LocationRelationship[]>(url, "relationships");
}

export async function getEventsForLocation(
  worldId: string,
  locationId: string
): Promise<WorldEntity[]> {
  return get<WorldEntity[]>(
    `${serviceUrls.world}/worlds/${worldId}/locations/${locationId}/events`,
    "events"
  );
}

export async function addEventRelationship(
  worldId: string,
  sourceEventId: string,
  targetEventId: string,
  relationshipType: LocationRelationshipType,
  token?: string
): Promise<void> {
  await postVoid(
    `${serviceUrls.world}/worlds/${worldId}/events/${sourceEventId}/relationships`,
    { targetEventId, relationshipType },
    { token }
  );
}

export async function getSubEventsForEvent(
  worldId: string,
  eventId: string
): Promise<WorldEntity[]> {
  return get<WorldEntity[]>(
    `${serviceUrls.world}/worlds/${worldId}/events/${eventId}/sub-events`,
    "subEvents"
  );
}

export async function addFactionRelationship(
  worldId: string,
  sourceFactionId: string,
  targetFactionId: string,
  relationshipType: LocationRelationshipType,
  token?: string
): Promise<void> {
  await postVoid(
    `${serviceUrls.world}/worlds/${worldId}/factions/${sourceFactionId}/relationships`,
    { targetFactionId, relationshipType },
    { token }
  );
}

export async function getSubFactionsForFaction(
  worldId: string,
  factionId: string
): Promise<WorldEntity[]> {
  return get<WorldEntity[]>(
    `${serviceUrls.world}/worlds/${worldId}/factions/${factionId}/sub-factions`,
    "subFactions"
  );
}

export async function addFactionMember(
  worldId: string,
  factionId: string,
  creatureId: string,
  token?: string
): Promise<void> {
  await postVoid(
    `${serviceUrls.world}/worlds/${worldId}/factions/${factionId}/members`,
    { creatureId },
    { token }
  );
}

export async function getMembersForFaction(
  worldId: string,
  factionId: string
): Promise<WorldEntity[]> {
  return get<WorldEntity[]>(
    `${serviceUrls.world}/worlds/${worldId}/factions/${factionId}/members`,
    "members"
  );
}


