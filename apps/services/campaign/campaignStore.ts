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

export class InMemoryCampaignStore {
  private campaigns: Campaign[] = [];
  private sessions: Session[] = [];
  private scenes: Scene[] = [];
  private storyArcs: StoryArc[] = [];

  listCampaignsByWorld(worldId: string): Campaign[] {
    return this.campaigns.filter((c) => c.worldId === worldId);
  }

  createCampaign(name: string, summary: string, worldId: string): Campaign {
    if (!name.trim()) {
      throw new Error("Campaign name is required");
    }
    if (!worldId.trim()) {
      throw new Error("worldId is required");
    }
    // Check uniqueness per world: same name cannot exist twice in the same world
    const existing = this.campaigns.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() && c.worldId === worldId
    );
    if (existing) {
      throw new Error(`Campaign '${name}' already exists in this world`);
    }
    const campaign: Campaign = {
      id: `camp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
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
    if (!campaignId.trim()) {
      throw new Error("campaignId is required");
    }
    if (!name.trim()) {
      throw new Error("Session name is required");
    }
    const session: Session = {
      id: `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`,
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
    if (!sessionId.trim()) {
      throw new Error("sessionId is required");
    }
    if (!name.trim()) {
      throw new Error("Scene name is required");
    }
    if (!worldId.trim()) {
      throw new Error("worldId is required");
    }
    const scene: Scene = {
      id: `scene-${Date.now()}-${Math.random().toString(16).slice(2)}`,
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
    const campaign = this.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }
    return [...campaign.playerIds];
  }

  addPlayer(campaignId: string, playerId: string): void {
    if (!campaignId.trim()) {
      throw new Error("campaignId is required");
    }
    if (!playerId.trim()) {
      throw new Error("playerId is required");
    }
    const campaign = this.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }
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
    if (!campaignId.trim()) {
      throw new Error("campaignId is required");
    }
    if (!name.trim()) {
      throw new Error("Story arc name is required");
    }
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
      id: `arc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      campaignId,
      name,
      summary,
      eventIds: []
    };
    this.storyArcs.push(storyArc);
    return storyArc;
  }

  listStoryArcEvents(storyArcId: string): string[] {
    const storyArc = this.storyArcs.find((arc) => arc.id === storyArcId);
    if (!storyArc) {
      throw new Error(`Story arc ${storyArcId} not found`);
    }
    return [...storyArc.eventIds];
  }

  addEventToStoryArc(storyArcId: string, eventId: string): void {
    if (!storyArcId.trim()) {
      throw new Error("storyArcId is required");
    }
    if (!eventId.trim()) {
      throw new Error("eventId is required");
    }
    const storyArc = this.storyArcs.find((arc) => arc.id === storyArcId);
    if (!storyArc) {
      throw new Error(`Story arc ${storyArcId} not found`);
    }
    if (storyArc.eventIds.includes(eventId)) {
      throw new Error(`Event ${eventId} is already in story arc ${storyArcId}`);
    }
    storyArc.eventIds.push(eventId);
  }

  getTimeline(campaignId: string): { currentMoment: number } {
    const campaign = this.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }
    return { currentMoment: campaign.currentMoment };
  }

  advanceTimeline(
    campaignId: string,
    amount: number,
    unit: "second" | "minute" | "hour" | "day" | "week" | "month" | "year"
  ): void {
    if (!campaignId.trim()) {
      throw new Error("campaignId is required");
    }
    const campaign = this.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

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
}


