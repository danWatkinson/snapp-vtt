import { apiRequest, extractProperty } from "./baseClient";
import { serviceUrls } from "../config/services";

export interface Campaign {
  id: string;
  name: string;
  summary: string;
  worldId: string; // Reference to the parent World (mandatory)
  playerIds: string[];
  currentMoment: number;
}

export async function createCampaign(
  name: string,
  summary: string,
  worldId: string,
  token?: string
): Promise<Campaign> {
  if (!worldId || !worldId.trim()) {
    throw new Error("worldId is required");
  }
  const data = await apiRequest<{ campaign: Campaign }>(
    `${serviceUrls.campaign}/campaigns`,
    {
      method: "POST",
      token,
      body: { name, summary, worldId }
    }
  );
  return extractProperty(data, "campaign");
}

export async function fetchCampaignsByWorld(worldId: string): Promise<Campaign[]> {
  const data = await apiRequest<{ campaigns: Campaign[] }>(
    `${serviceUrls.campaign}/worlds/${worldId}/campaigns`
  );
  return extractProperty(data, "campaigns");
}

export interface Session {
  id: string;
  campaignId: string;
  name: string;
}

export async function fetchCampaignSessions(
  campaignId: string
): Promise<Session[]> {
  const data = await apiRequest<{ sessions: Session[] }>(
    `${serviceUrls.campaign}/campaigns/${campaignId}/sessions`
  );
  return extractProperty(data, "sessions");
}

export async function createSession(
  campaignId: string,
  name: string,
  token?: string
): Promise<Session> {
  const data = await apiRequest<{ session: Session }>(
    `${serviceUrls.campaign}/campaigns/${campaignId}/sessions`,
    {
      method: "POST",
      token,
      body: { name }
    }
  );
  return extractProperty(data, "session");
}

export interface Scene {
  id: string;
  sessionId: string;
  name: string;
  summary: string;
  worldId: string;
  entityIds: string[];
}

export async function fetchSessionScenes(
  sessionId: string
): Promise<Scene[]> {
  const data = await apiRequest<{ scenes: Scene[] }>(
    `${serviceUrls.campaign}/sessions/${sessionId}/scenes`
  );
  return extractProperty(data, "scenes");
}

export async function createScene(
  sessionId: string,
  name: string,
  summary: string,
  worldId: string,
  entityIds: string[] = [],
  token?: string
): Promise<Scene> {
  const data = await apiRequest<{ scene: Scene }>(
    `${serviceUrls.campaign}/sessions/${sessionId}/scenes`,
    {
      method: "POST",
      token,
      body: { name, summary, worldId, entityIds }
    }
  );
  return extractProperty(data, "scene");
}

export async function fetchCampaignPlayers(
  campaignId: string
): Promise<string[]> {
  const data = await apiRequest<{ players: string[] }>(
    `${serviceUrls.campaign}/campaigns/${campaignId}/players`
  );
  return extractProperty(data, "players");
}

export async function addPlayerToCampaign(
  campaignId: string,
  playerId: string,
  token?: string
): Promise<void> {
  await apiRequest(
    `${serviceUrls.campaign}/campaigns/${campaignId}/players`,
    {
      method: "POST",
      token,
      body: { playerId }
    }
  );
}

export interface StoryArc {
  id: string;
  campaignId: string;
  name: string;
  summary: string;
  eventIds: string[];
}

export async function fetchStoryArcs(
  campaignId: string
): Promise<StoryArc[]> {
  const data = await apiRequest<{ storyArcs: StoryArc[] }>(
    `${serviceUrls.campaign}/campaigns/${campaignId}/story-arcs`
  );
  return extractProperty(data, "storyArcs");
}

export async function createStoryArc(
  campaignId: string,
  name: string,
  summary: string,
  token?: string
): Promise<StoryArc> {
  if (!campaignId || !campaignId.trim()) {
    throw new Error("campaignId is required");
  }
  const data = await apiRequest<{ storyArc: StoryArc }>(
    `${serviceUrls.campaign}/campaigns/${campaignId}/story-arcs`,
    {
      method: "POST",
      token,
      body: { name, summary }
    }
  );
  return extractProperty(data, "storyArc");
}

export interface Timeline {
  currentMoment: number;
}

export async function fetchTimeline(campaignId: string): Promise<Timeline> {
  return apiRequest<Timeline>(
    `${serviceUrls.campaign}/campaigns/${campaignId}/timeline`
  );
}

export async function advanceTimeline(
  campaignId: string,
  amount: number,
  unit: "second" | "minute" | "hour" | "day" | "week" | "month" | "year",
  token?: string
): Promise<Timeline> {
  return apiRequest<Timeline>(
    `${serviceUrls.campaign}/campaigns/${campaignId}/timeline/advance`,
    {
      method: "POST",
      token,
      body: { amount, unit }
    }
  );
}

export async function fetchStoryArcEvents(
  storyArcId: string
): Promise<string[]> {
  const data = await apiRequest<{ events: string[] }>(
    `${serviceUrls.campaign}/story-arcs/${storyArcId}/events`
  );
  return extractProperty(data, "events");
}

export async function addEventToStoryArc(
  storyArcId: string,
  eventId: string,
  token?: string
): Promise<void> {
  await apiRequest(
    `${serviceUrls.campaign}/story-arcs/${storyArcId}/events`,
    {
      method: "POST",
      token,
      body: { eventId }
    }
  );
}


