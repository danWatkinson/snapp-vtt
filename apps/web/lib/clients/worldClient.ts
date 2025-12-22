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

import { apiRequest, extractProperty } from "./baseClient";
import { serviceUrls } from "../config/services";

export async function fetchWorlds(): Promise<World[]> {
  const data = await apiRequest<{ worlds: World[] }>(
    `${serviceUrls.world}/worlds`
  );
  return extractProperty(data, "worlds");
}

export async function createWorld(
  name: string,
  description: string,
  token?: string
): Promise<World> {
  const data = await apiRequest<{ world: World }>(`${serviceUrls.world}/worlds`, {
    method: "POST",
    token,
    body: { name, description }
  });
  return extractProperty(data, "world");
}

export async function updateWorldSplashImage(
  worldId: string,
  splashImageAssetId: string | null,
  token?: string
): Promise<World> {
  const data = await apiRequest<{ world: World }>(
    `${serviceUrls.world}/worlds/${worldId}`,
    {
      method: "PATCH",
      token,
      body: { splashImageAssetId }
    }
  );
  return extractProperty(data, "world");
}

export async function fetchWorldEntities(
  worldId: string,
  type?: "location" | "creature" | "faction" | "concept" | "event"
): Promise<WorldEntity[]> {
  const url = type
    ? `${serviceUrls.world}/worlds/${worldId}/entities?type=${type}`
    : `${serviceUrls.world}/worlds/${worldId}/entities`;
  const data = await apiRequest<{ entities: WorldEntity[] }>(url);
  return extractProperty(data, "entities");
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
  const data = await apiRequest<{ entity: WorldEntity }>(
    `${serviceUrls.world}/worlds/${worldId}/entities`,
    {
      method: "POST",
      token,
      body
    }
  );
  return extractProperty(data, "entity");
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

export async function addLocationRelationship(
  worldId: string,
  sourceLocationId: string,
  targetLocationId: string,
  relationshipType: LocationRelationshipType,
  token?: string
): Promise<void> {
  await apiRequest(
    `${serviceUrls.world}/worlds/${worldId}/locations/${sourceLocationId}/relationships`,
    {
      method: "POST",
      token,
      body: { targetLocationId, relationshipType }
    }
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
  const data = await apiRequest<{ relationships: LocationRelationship[] }>(url);
  return extractProperty(data, "relationships");
}

export async function getEventsForLocation(
  worldId: string,
  locationId: string
): Promise<WorldEntity[]> {
  const data = await apiRequest<{ events: WorldEntity[] }>(
    `${serviceUrls.world}/worlds/${worldId}/locations/${locationId}/events`
  );
  return extractProperty(data, "events");
}

export async function addEventRelationship(
  worldId: string,
  sourceEventId: string,
  targetEventId: string,
  relationshipType: LocationRelationshipType,
  token?: string
): Promise<void> {
  await apiRequest(
    `${serviceUrls.world}/worlds/${worldId}/events/${sourceEventId}/relationships`,
    {
      method: "POST",
      token,
      body: { targetEventId, relationshipType }
    }
  );
}

export async function getSubEventsForEvent(
  worldId: string,
  eventId: string
): Promise<WorldEntity[]> {
  const data = await apiRequest<{ subEvents: WorldEntity[] }>(
    `${serviceUrls.world}/worlds/${worldId}/events/${eventId}/sub-events`
  );
  return extractProperty(data, "subEvents");
}

export async function addFactionRelationship(
  worldId: string,
  sourceFactionId: string,
  targetFactionId: string,
  relationshipType: LocationRelationshipType,
  token?: string
): Promise<void> {
  await apiRequest(
    `${serviceUrls.world}/worlds/${worldId}/factions/${sourceFactionId}/relationships`,
    {
      method: "POST",
      token,
      body: { targetFactionId, relationshipType }
    }
  );
}

export async function getSubFactionsForFaction(
  worldId: string,
  factionId: string
): Promise<WorldEntity[]> {
  const data = await apiRequest<{ subFactions: WorldEntity[] }>(
    `${serviceUrls.world}/worlds/${worldId}/factions/${factionId}/sub-factions`
  );
  return extractProperty(data, "subFactions");
}

export async function addFactionMember(
  worldId: string,
  factionId: string,
  creatureId: string,
  token?: string
): Promise<void> {
  await apiRequest(
    `${serviceUrls.world}/worlds/${worldId}/factions/${factionId}/members`,
    {
      method: "POST",
      token,
      body: { creatureId }
    }
  );
}

export async function getMembersForFaction(
  worldId: string,
  factionId: string
): Promise<WorldEntity[]> {
  const data = await apiRequest<{ members: WorldEntity[] }>(
    `${serviceUrls.world}/worlds/${worldId}/factions/${factionId}/members`
  );
  return extractProperty(data, "members");
}


