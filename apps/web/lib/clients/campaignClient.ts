import { AuthenticationError, isAuthenticationError } from "../auth/authErrors";

const CAMPAIGN_SERVICE_URL =
  process.env.NEXT_PUBLIC_CAMPAIGN_SERVICE_URL ?? "https://localhost:4600";

export interface Campaign {
  id: string;
  name: string;
  summary: string;
  playerIds: string[];
  currentMoment: number;
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const res = await fetch(`${CAMPAIGN_SERVICE_URL}/campaigns`);
  if (!res.ok) {
    throw new Error("Failed to load campaigns");
  }
  const body = (await res.json()) as { campaigns: Campaign[] };
  return body.campaigns;
}

export async function createCampaign(
  name: string,
  summary: string,
  token?: string
): Promise<Campaign> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${CAMPAIGN_SERVICE_URL}/campaigns`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, summary })
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (isAuthenticationError(res)) {
      throw new AuthenticationError("Authentication failed", res.status);
    }
    throw new Error(body.error ?? "Failed to create campaign");
  }
  return body.campaign as Campaign;
}

export interface Session {
  id: string;
  campaignId: string;
  name: string;
}

export async function fetchCampaignSessions(
  campaignId: string
): Promise<Session[]> {
  const res = await fetch(
    `${CAMPAIGN_SERVICE_URL}/campaigns/${campaignId}/sessions`
  );
  if (!res.ok) {
    throw new Error("Failed to load sessions");
  }
  const body = (await res.json()) as { sessions: Session[] };
  return body.sessions;
}

export async function createSession(
  campaignId: string,
  name: string,
  token?: string
): Promise<Session> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(
    `${CAMPAIGN_SERVICE_URL}/campaigns/${campaignId}/sessions`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ name })
    }
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? "Failed to create session");
  }
  return body.session as Session;
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
  const res = await fetch(
    `${CAMPAIGN_SERVICE_URL}/sessions/${sessionId}/scenes`
  );
  if (!res.ok) {
    throw new Error("Failed to load scenes");
  }
  const body = (await res.json()) as { scenes: Scene[] };
  return body.scenes;
}

export async function createScene(
  sessionId: string,
  name: string,
  summary: string,
  worldId: string,
  entityIds: string[] = [],
  token?: string
): Promise<Scene> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(
    `${CAMPAIGN_SERVICE_URL}/sessions/${sessionId}/scenes`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ name, summary, worldId, entityIds })
    }
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (isAuthenticationError(res)) {
      throw new AuthenticationError("Authentication failed", res.status);
    }
    throw new Error(body.error ?? "Failed to create scene");
  }
  return body.scene as Scene;
}

export async function fetchCampaignPlayers(
  campaignId: string
): Promise<string[]> {
  const res = await fetch(
    `${CAMPAIGN_SERVICE_URL}/campaigns/${campaignId}/players`
  );
  if (!res.ok) {
    throw new Error("Failed to load players");
  }
  const body = (await res.json()) as { players: string[] };
  return body.players;
}

export async function addPlayerToCampaign(
  campaignId: string,
  playerId: string,
  token?: string
): Promise<void> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(
    `${CAMPAIGN_SERVICE_URL}/campaigns/${campaignId}/players`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ playerId })
    }
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (isAuthenticationError(res)) {
      throw new AuthenticationError("Authentication failed", res.status);
    }
    throw new Error(body.error ?? "Failed to add player to campaign");
  }
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
  const res = await fetch(
    `${CAMPAIGN_SERVICE_URL}/campaigns/${campaignId}/story-arcs`
  );
  if (!res.ok) {
    throw new Error("Failed to load story arcs");
  }
  const body = (await res.json()) as { storyArcs: StoryArc[] };
  return body.storyArcs;
}

export async function createStoryArc(
  campaignId: string,
  name: string,
  summary: string,
  token?: string
): Promise<StoryArc> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(
    `${CAMPAIGN_SERVICE_URL}/campaigns/${campaignId}/story-arcs`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ name, summary })
    }
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (isAuthenticationError(res)) {
      throw new AuthenticationError("Authentication failed", res.status);
    }
    throw new Error(body.error ?? "Failed to create story arc");
  }
  return body.storyArc as StoryArc;
}

export interface Timeline {
  currentMoment: number;
}

export async function fetchTimeline(campaignId: string): Promise<Timeline> {
  const res = await fetch(
    `${CAMPAIGN_SERVICE_URL}/campaigns/${campaignId}/timeline`
  );
  if (!res.ok) {
    throw new Error("Failed to load timeline");
  }
  return (await res.json()) as Timeline;
}

export async function advanceTimeline(
  campaignId: string,
  amount: number,
  unit: "second" | "minute" | "hour" | "day" | "week" | "month" | "year",
  token?: string
): Promise<Timeline> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(
    `${CAMPAIGN_SERVICE_URL}/campaigns/${campaignId}/timeline/advance`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ amount, unit })
    }
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (isAuthenticationError(res)) {
      throw new AuthenticationError("Authentication failed", res.status);
    }
    throw new Error(body.error ?? "Failed to advance timeline");
  }
  return body as Timeline;
}

export async function fetchStoryArcEvents(
  storyArcId: string
): Promise<string[]> {
  const res = await fetch(
    `${CAMPAIGN_SERVICE_URL}/story-arcs/${storyArcId}/events`
  );
  if (!res.ok) {
    throw new Error("Failed to load story arc events");
  }
  const body = (await res.json()) as { events: string[] };
  return body.events;
}

export async function addEventToStoryArc(
  storyArcId: string,
  eventId: string,
  token?: string
): Promise<void> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(
    `${CAMPAIGN_SERVICE_URL}/story-arcs/${storyArcId}/events`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ eventId })
    }
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (isAuthenticationError(res)) {
      throw new AuthenticationError("Authentication failed", res.status);
    }
    throw new Error(body.error ?? "Failed to add event to story arc");
  }
}


