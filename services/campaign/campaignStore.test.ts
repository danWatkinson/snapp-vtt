import { describe, it, expect } from "vitest";
import {
  InMemoryCampaignStore,
  type Campaign,
  type Session,
  type Scene,
  type StoryArc
} from "./campaignStore";

describe("InMemoryCampaignStore", () => {
  it("creates and lists campaigns", () => {
    const store = new InMemoryCampaignStore();
    expect(store.listCampaigns()).toEqual([]);

    const campaign = store.createCampaign("Test Campaign", "Summary");
    const campaigns = store.listCampaigns();
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0]).toEqual(campaign);
    expect(campaign.playerIds).toEqual([]);
  });

  it("requires a campaign name", () => {
    const store = new InMemoryCampaignStore();
    expect(() => store.createCampaign("", "Summary")).toThrow(
      "Campaign name is required"
    );
  });

  it("creates sessions and scenes", () => {
    const store = new InMemoryCampaignStore();
    const campaign: Campaign = store.createCampaign("Camp", "Summary");

    const session: Session = store.createSession(campaign.id, "Session 1");
    const sessions = store.listSessions(campaign.id);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toEqual(session);

    const scene: Scene = store.createScene(
      session.id,
      "Scene 1",
      "Intro",
      "world-1",
      ["ent-1", "ent-2"]
    );
    const scenes = store.listScenes(session.id);
    expect(scenes).toHaveLength(1);
    expect(scenes[0]).toEqual(scene);
  });

  it("manages players in campaigns", () => {
    const store = new InMemoryCampaignStore();
    const campaign = store.createCampaign("Camp", "Summary");

    expect(store.listPlayers(campaign.id)).toEqual([]);

    store.addPlayer(campaign.id, "alice");
    expect(store.listPlayers(campaign.id)).toEqual(["alice"]);

    store.addPlayer(campaign.id, "bob");
    expect(store.listPlayers(campaign.id)).toEqual(["alice", "bob"]);
  });

  it("automatically creates a story arc when adding a player", () => {
    const store = new InMemoryCampaignStore();
    const campaign = store.createCampaign("Camp", "Summary");

    expect(store.listStoryArcs(campaign.id)).toEqual([]);

    store.addPlayer(campaign.id, "alice");
    
    const storyArcs = store.listStoryArcs(campaign.id);
    expect(storyArcs).toHaveLength(1);
    expect(storyArcs[0].name).toBe("alice's Arc");
    expect(storyArcs[0].summary).toBe("Personal story arc for alice");
    expect(storyArcs[0].campaignId).toBe(campaign.id);

    store.addPlayer(campaign.id, "bob");
    
    const storyArcsAfterBob = store.listStoryArcs(campaign.id);
    expect(storyArcsAfterBob).toHaveLength(2);
    expect(storyArcsAfterBob.some((arc) => arc.name === "bob's Arc")).toBe(true);
  });

  it("prevents adding duplicate players", () => {
    const store = new InMemoryCampaignStore();
    const campaign = store.createCampaign("Camp", "Summary");

    store.addPlayer(campaign.id, "alice");
    expect(() => store.addPlayer(campaign.id, "alice")).toThrow(
      "Player alice is already in campaign"
    );
  });

  it("requires campaignId and playerId when adding players", () => {
    const store = new InMemoryCampaignStore();
    const campaign = store.createCampaign("Camp", "Summary");

    expect(() => store.addPlayer("", "alice")).toThrow("campaignId is required");
    expect(() => store.addPlayer(campaign.id, "")).toThrow("playerId is required");
  });

  it("throws error when listing players for non-existent campaign", () => {
    const store = new InMemoryCampaignStore();
    expect(() => store.listPlayers("non-existent")).toThrow(
      "Campaign non-existent not found"
    );
  });

  it("throws error when adding player to non-existent campaign", () => {
    const store = new InMemoryCampaignStore();
    expect(() => store.addPlayer("non-existent", "alice")).toThrow(
      "Campaign non-existent not found"
    );
  });

  it("manages story arcs in campaigns", () => {
    const store = new InMemoryCampaignStore();
    const campaign = store.createCampaign("Camp", "Summary");

    expect(store.listStoryArcs(campaign.id)).toEqual([]);

    const arc1 = store.createStoryArc(campaign.id, "Arc 1", "Summary 1");
    expect(store.listStoryArcs(campaign.id)).toEqual([arc1]);

    const arc2 = store.createStoryArc(campaign.id, "Arc 2", "Summary 2");
    const arcs = store.listStoryArcs(campaign.id);
    expect(arcs).toHaveLength(2);
    expect(arcs).toContainEqual(arc1);
    expect(arcs).toContainEqual(arc2);
  });

  it("requires campaignId and name when creating story arc", () => {
    const store = new InMemoryCampaignStore();
    const campaign = store.createCampaign("Camp", "Summary");

    expect(() => store.createStoryArc("", "Arc", "Summary")).toThrow(
      "campaignId is required"
    );
    expect(() => store.createStoryArc(campaign.id, "", "Summary")).toThrow(
      "Story arc name is required"
    );
  });

  it("throws error when creating story arc for non-existent campaign", () => {
    const store = new InMemoryCampaignStore();
    expect(() =>
      store.createStoryArc("non-existent", "Arc", "Summary")
    ).toThrow("Campaign non-existent not found");
  });

  it("manages events in story arcs", () => {
    const store = new InMemoryCampaignStore();
    const campaign = store.createCampaign("Camp", "Summary");
    const storyArc = store.createStoryArc(campaign.id, "Arc", "Summary");

    expect(store.listStoryArcEvents(storyArc.id)).toEqual([]);

    store.addEventToStoryArc(storyArc.id, "event-1");
    expect(store.listStoryArcEvents(storyArc.id)).toEqual(["event-1"]);

    store.addEventToStoryArc(storyArc.id, "event-2");
    expect(store.listStoryArcEvents(storyArc.id)).toEqual(["event-1", "event-2"]);
  });

  it("prevents adding duplicate events to story arc", () => {
    const store = new InMemoryCampaignStore();
    const campaign = store.createCampaign("Camp", "Summary");
    const storyArc = store.createStoryArc(campaign.id, "Arc", "Summary");

    store.addEventToStoryArc(storyArc.id, "event-1");
    expect(() => store.addEventToStoryArc(storyArc.id, "event-1")).toThrow(
      "Event event-1 is already in story arc"
    );
  });

  it("requires storyArcId and eventId when adding events", () => {
    const store = new InMemoryCampaignStore();
    const campaign = store.createCampaign("Camp", "Summary");
    const storyArc = store.createStoryArc(campaign.id, "Arc", "Summary");

    expect(() => store.addEventToStoryArc("", "event-1")).toThrow(
      "storyArcId is required"
    );
    expect(() => store.addEventToStoryArc(storyArc.id, "")).toThrow(
      "eventId is required"
    );
  });

  it("throws error when listing events for non-existent story arc", () => {
    const store = new InMemoryCampaignStore();
    expect(() => store.listStoryArcEvents("non-existent")).toThrow(
      "Story arc non-existent not found"
    );
  });

  it("manages campaign timeline", () => {
    const store = new InMemoryCampaignStore();
    const campaign = store.createCampaign("Camp", "Summary");

    const timeline = store.getTimeline(campaign.id);
    expect(timeline.currentMoment).toBeGreaterThan(0);
    expect(typeof timeline.currentMoment).toBe("number");

    const initialMoment = timeline.currentMoment;

    // Advance by 1 day
    store.advanceTimeline(campaign.id, 1, "day");
    const afterDay = store.getTimeline(campaign.id);
    expect(afterDay.currentMoment).toBeGreaterThan(initialMoment);
    expect(afterDay.currentMoment - initialMoment).toBe(24 * 60 * 60 * 1000);

    // Advance by 1 week
    store.advanceTimeline(campaign.id, 1, "week");
    const afterWeek = store.getTimeline(campaign.id);
    expect(afterWeek.currentMoment - afterDay.currentMoment).toBe(
      7 * 24 * 60 * 60 * 1000
    );

    // Go back by 1 day
    store.advanceTimeline(campaign.id, -1, "day");
    const afterBack = store.getTimeline(campaign.id);
    expect(afterBack.currentMoment).toBeLessThan(afterWeek.currentMoment);
  });

  it("throws error when getting timeline for non-existent campaign", () => {
    const store = new InMemoryCampaignStore();
    expect(() => store.getTimeline("non-existent")).toThrow(
      "Campaign non-existent not found"
    );
  });

  it("throws error when advancing timeline for non-existent campaign", () => {
    const store = new InMemoryCampaignStore();
    expect(() => store.advanceTimeline("non-existent", 1, "day")).toThrow(
      "Campaign non-existent not found"
    );
  });
});


