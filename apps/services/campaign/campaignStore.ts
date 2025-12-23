export interface Campaign {
  id: string;
  name: string;
  summary: string;
  worldId: string; // Reference to the parent World (mandatory)
  playerIds: string[];
  currentMoment: number; // Unix timestamp in milliseconds
}

export interface Session {
  id: string;
  campaignId: string;
  name: string;
}

export interface Scene {
  id: string;
  sessionId: string;
  name: string;
  summary: string;
  worldId: string;
  entityIds: string[];
}

export interface StoryArc {
  id: string;
  campaignId: string;
  name: string;
  summary: string;
  eventIds: string[];
}

import { generateId, requireNonEmpty, findOrThrow, findIndexOrThrow, notFoundError, exists } from "../../../packages/store-utils";

export class InMemoryCampaignStore {
  private campaigns: Campaign[] = [];
  private sessions: Session[] = [];
  private scenes: Scene[] = [];
  private storyArcs: StoryArc[] = [];

  listCampaignsByWorld(worldId: string): Campaign[] {
    return this.campaigns.filter((c) => c.worldId === worldId);
  }

  createCampaign(name: string, summary: string, worldId: string): Campaign {
    requireNonEmpty(name, "Campaign name");
    requireNonEmpty(worldId, "worldId");
    // Check uniqueness per world: same name cannot exist twice in the same world
    if (exists(
      this.campaigns,
      (c) => c.name.toLowerCase() === name.toLowerCase() && c.worldId === worldId
    )) {
      throw new Error(`Campaign '${name}' already exists in this world`);
    }
    const campaign: Campaign = {
      id: generateId("camp"),
      name,
      summary,
      worldId,
      playerIds: [],
      currentMoment: Date.now() // Initialize to current time
    };
    this.campaigns.push(campaign);
    return campaign;
  }

  listSessions(campaignId: string): Session[] {
    return this.sessions.filter((s) => s.campaignId === campaignId);
  }

  createSession(campaignId: string, name: string): Session {
    requireNonEmpty(campaignId, "campaignId");
    requireNonEmpty(name, "Session name");
    const session: Session = {
      id: generateId("sess"),
      campaignId,
      name
    };
    this.sessions.push(session);
    return session;
  }

  listScenes(sessionId: string): Scene[] {
    return this.scenes.filter((s) => s.sessionId === sessionId);
  }

  createScene(
    sessionId: string,
    name: string,
    summary: string,
    worldId: string,
    entityIds: string[]
  ): Scene {
    requireNonEmpty(sessionId, "sessionId");
    requireNonEmpty(name, "Scene name");
    requireNonEmpty(worldId, "worldId");
    const scene: Scene = {
      id: generateId("scene"),
      sessionId,
      name,
      summary,
      worldId,
      entityIds
    };
    this.scenes.push(scene);
    return scene;
  }

  listPlayers(campaignId: string): string[] {
    const campaign = findOrThrow(
      this.campaigns,
      (c) => c.id === campaignId,
      notFoundError("Campaign", campaignId)
    );
    return [...campaign.playerIds];
  }

  addPlayer(campaignId: string, playerId: string): void {
    requireNonEmpty(campaignId, "campaignId");
    requireNonEmpty(playerId, "playerId");
    const campaign = findOrThrow(
      this.campaigns,
      (c) => c.id === campaignId,
      notFoundError("Campaign", campaignId)
    );
    if (campaign.playerIds.includes(playerId)) {
      throw new Error(`Player ${playerId} is already in campaign ${campaignId}`);
    }
    campaign.playerIds.push(playerId);
    
    // Automatically create a story arc for the player
    this.createStoryArc(
      campaignId,
      `${playerId}'s Arc`,
      `Personal story arc for ${playerId}`
    );
  }

  listStoryArcs(campaignId: string): StoryArc[] {
    return this.storyArcs.filter((arc) => arc.campaignId === campaignId);
  }

  createStoryArc(
    campaignId: string,
    name: string,
    summary: string
  ): StoryArc {
    requireNonEmpty(campaignId, "campaignId");
    requireNonEmpty(name, "Story arc name");
    const campaign = this.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }
    // Check uniqueness per campaign: same name cannot exist twice in the same campaign
    const existing = this.storyArcs.find(
      (arc) => arc.name.toLowerCase() === name.toLowerCase() && arc.campaignId === campaignId
    );
    if (existing) {
      throw new Error(`Story arc '${name}' already exists in this campaign`);
    }
    const storyArc: StoryArc = {
      id: generateId("arc"),
      campaignId,
      name,
      summary,
      eventIds: []
    };
    this.storyArcs.push(storyArc);
    return storyArc;
  }

  listStoryArcEvents(storyArcId: string): string[] {
    const storyArc = findOrThrow(
      this.storyArcs,
      (arc) => arc.id === storyArcId,
      notFoundError("Story arc", storyArcId)
    );
    return [...storyArc.eventIds];
  }

  addEventToStoryArc(storyArcId: string, eventId: string): void {
    requireNonEmpty(storyArcId, "storyArcId");
    requireNonEmpty(eventId, "eventId");
    const storyArc = findOrThrow(
      this.storyArcs,
      (arc) => arc.id === storyArcId,
      notFoundError("Story arc", storyArcId)
    );
    if (storyArc.eventIds.includes(eventId)) {
      throw new Error(`Event ${eventId} is already in story arc ${storyArcId}`);
    }
    storyArc.eventIds.push(eventId);
  }

  getTimeline(campaignId: string): { currentMoment: number } {
    const campaign = findOrThrow(
      this.campaigns,
      (c) => c.id === campaignId,
      notFoundError("Campaign", campaignId)
    );
    return { currentMoment: campaign.currentMoment };
  }

  advanceTimeline(
    campaignId: string,
    amount: number,
    unit: "second" | "minute" | "hour" | "day" | "week" | "month" | "year"
  ): void {
    requireNonEmpty(campaignId, "campaignId");
    const campaign = findOrThrow(
      this.campaigns,
      (c) => c.id === campaignId,
      notFoundError("Campaign", campaignId)
    );

    const multipliers: Record<
      typeof unit,
      number
    > = {
      second: 1000,
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000, // Approximate: 30 days
      year: 365 * 24 * 60 * 60 * 1000 // Approximate: 365 days
    };

    const milliseconds = amount * multipliers[unit];
    campaign.currentMoment += milliseconds;
  }

  /**
   * Clear all campaigns, sessions, scenes, and story arcs from the store.
   * Used for test isolation - resets the store to an empty state.
   */
  clear(): void {
    this.campaigns = [];
    this.sessions = [];
    this.scenes = [];
    this.storyArcs = [];
  }
}


