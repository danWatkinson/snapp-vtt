import { apiRequest, get, post, postVoid } from "./baseClient";
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
  return post<Campaign>(
    `${serviceUrls.campaign}/campaigns`,
    "campaign",
    { name, summary, worldId },
    { token }
  );
}

export async function fetchCampaignsByWorld(worldId: string): Promise<Campaign[]> {
  return get<Campaign[]>(
    `${serviceUrls.campaign}/worlds/${worldId}/campaigns`,
    "campaigns"
  );
}

export interface Session {
  id: string;
  campaignId: string;
  name: string;
}

export async function fetchCampaignSessions(
  campaignId: string
): Promise<Session[]> {
  return get<Session[]>(
    `${serviceUrls.campaign}/campaigns/${campaignId}/sessions`,
    "sessions"
  );
}

export async function createSession(
  campaignId: string,
  name: string,
  token?: string
): Promise<Session> {
  return post<Session>(
    `${serviceUrls.campaign}/campaigns/${campaignId}/sessions`,
    "session",
    { name },
    { token }
  );
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
  return get<Scene[]>(
    `${serviceUrls.campaign}/sessions/${sessionId}/scenes`,
    "scenes"
  );
}

export async function createScene(
  sessionId: string,
  name: string,
  summary: string,
  worldId: string,
  entityIds: string[] = [],
  token?: string
): Promise<Scene> {
  return post<Scene>(
    `${serviceUrls.campaign}/sessions/${sessionId}/scenes`,
    "scene",
    { name, summary, worldId, entityIds },
    { token }
  );
}

export async function fetchCampaignPlayers(
  campaignId: string
): Promise<string[]> {
  return get<string[]>(
    `${serviceUrls.campaign}/campaigns/${campaignId}/players`,
    "players"
  );
}

export async function addPlayerToCampaign(
  campaignId: string,
  playerId: string,
  token?: string
): Promise<void> {
  await postVoid(
    `${serviceUrls.campaign}/campaigns/${campaignId}/players`,
    { playerId },
    { token }
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
  return get<StoryArc[]>(
    `${serviceUrls.campaign}/campaigns/${campaignId}/story-arcs`,
    "storyArcs"
  );
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
  return post<StoryArc>(
    `${serviceUrls.campaign}/campaigns/${campaignId}/story-arcs`,
    "storyArc",
    { name, summary },
    { token }
  );
}

export interface Timeline {
  currentMoment: number;
}

export async function fetchTimeline(campaignId: string): Promise<Timeline> {
  // Timeline returns response directly, not nested
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
  // Timeline returns response directly, not nested
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
  return get<string[]>(
    `${serviceUrls.campaign}/story-arcs/${storyArcId}/events`,
    "events"
  );
}

export async function addEventToStoryArc(
  storyArcId: string,
  eventId: string,
  token?: string
): Promise<void> {
  await postVoid(
    `${serviceUrls.campaign}/story-arcs/${storyArcId}/events`,
    { eventId },
    { token }
  );
}


