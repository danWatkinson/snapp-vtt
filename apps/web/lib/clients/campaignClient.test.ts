import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createCampaign,
  fetchCampaignsByWorld,
  fetchCampaignSessions,
  createSession,
  fetchSessionScenes,
  createScene,
  fetchCampaignPlayers,
  addPlayerToCampaign,
  fetchStoryArcs,
  createStoryArc,
  fetchTimeline,
  advanceTimeline,
  fetchStoryArcEvents,
  addEventToStoryArc
} from "./campaignClient";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("campaignClient", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchCampaignsByWorld", () => {
    it("should fetch campaigns for a world", async () => {
      const mockCampaigns = [
        { id: "1", name: "Campaign 1", summary: "Sum", worldId: "world-1", playerIds: [], currentMoment: 0 }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ campaigns: mockCampaigns })
      });

      const result = await fetchCampaignsByWorld("world-1");

      expect(result).toEqual(mockCampaigns);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/worlds/world-1/campaigns")
      );
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      });

      await expect(fetchCampaignsByWorld("world-1")).rejects.toThrow("Failed to load campaigns for world");
    });
  });

  describe("createCampaign", () => {
    it("should create campaign", async () => {
      const mockCampaign = {
        id: "1",
        name: "New Campaign",
        summary: "Sum",
        worldId: "world-1",
        playerIds: [],
        currentMoment: 0
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ campaign: mockCampaign })
      });

      const result = await createCampaign("New Campaign", "Sum", "world-1", "token");

      expect(result).toEqual(mockCampaign);
      const call = mockFetch.mock.calls[0][1];
      expect(JSON.parse(call.body as string)).toEqual({
        name: "New Campaign",
        summary: "Sum",
        worldId: "world-1"
      });
    });

    it("should create campaign without token", async () => {
      const mockCampaign = {
        id: "1",
        name: "New Campaign",
        summary: "Sum",
        worldId: "world-1",
        playerIds: [],
        currentMoment: 0
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ campaign: mockCampaign })
      });

      const result = await createCampaign("New Campaign", "Sum", "world-1");

      expect(result).toEqual(mockCampaign);
      const call = mockFetch.mock.calls[0][1];
      expect(call.headers).not.toHaveProperty("Authorization");
      expect(JSON.parse(call.body as string)).toEqual({
        name: "New Campaign",
        summary: "Sum",
        worldId: "world-1"
      });
    });

    it("should throw error when worldId is missing", async () => {
      await expect(createCampaign("New", "Sum", "")).rejects.toThrow("worldId is required");
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Campaign name already exists in this world" })
      });

      await expect(createCampaign("Existing", "Sum", "world-1")).rejects.toThrow("Campaign name already exists in this world");
    });

    it("should throw generic error when response has no error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(createCampaign("New", "Sum", "world-1")).rejects.toThrow("Failed to create campaign");
    });
  });

  describe("fetchCampaignSessions", () => {
    it("should fetch sessions", async () => {
      const mockSessions = [
        { id: "1", campaignId: "c1", name: "Session 1" }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: mockSessions })
      });

      const result = await fetchCampaignSessions("c1");

      expect(result).toEqual(mockSessions);
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      });

      await expect(fetchCampaignSessions("c1")).rejects.toThrow("Failed to load sessions");
    });
  });

  describe("createSession", () => {
    it("should create session", async () => {
      const mockSession = { id: "1", campaignId: "c1", name: "New Session" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session: mockSession })
      });

      const result = await createSession("c1", "New Session", "token");

      expect(result).toEqual(mockSession);
    });

    it("should create session without token", async () => {
      const mockSession = { id: "1", campaignId: "c1", name: "New Session" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session: mockSession })
      });

      const result = await createSession("c1", "New Session");

      expect(result).toEqual(mockSession);
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Session name already exists" })
      });

      await expect(createSession("c1", "Existing", "token")).rejects.toThrow("Session name already exists");
    });

    it("should throw generic error when response has no error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(createSession("c1", "New", "token")).rejects.toThrow("Failed to create session");
    });
  });

  describe("fetchSessionScenes", () => {
    it("should fetch scenes", async () => {
      const mockScenes = [
        {
          id: "1",
          sessionId: "s1",
          name: "Scene 1",
          summary: "Sum",
          worldId: "w1",
          entityIds: []
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scenes: mockScenes })
      });

      const result = await fetchSessionScenes("s1");

      expect(result).toEqual(mockScenes);
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      });

      await expect(fetchSessionScenes("s1")).rejects.toThrow("Failed to load scenes");
    });
  });

  describe("createScene", () => {
    it("should create scene", async () => {
      const mockScene = {
        id: "1",
        sessionId: "s1",
        name: "New Scene",
        summary: "Sum",
        worldId: "w1",
        entityIds: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scene: mockScene })
      });

      const result = await createScene("s1", "New Scene", "Sum", "w1", [], "token");

      expect(result).toEqual(mockScene);
    });

    it("should create scene with entityIds", async () => {
      const mockScene = {
        id: "1",
        sessionId: "s1",
        name: "New Scene",
        summary: "Sum",
        worldId: "w1",
        entityIds: ["e1", "e2"]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scene: mockScene })
      });

      const result = await createScene("s1", "New Scene", "Sum", "w1", ["e1", "e2"], "token");

      expect(result).toEqual(mockScene);
    });

    it("should create scene without token", async () => {
      const mockScene = {
        id: "1",
        sessionId: "s1",
        name: "New Scene",
        summary: "Sum",
        worldId: "w1",
        entityIds: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scene: mockScene })
      });

      const result = await createScene("s1", "New Scene", "Sum", "w1");

      expect(result).toEqual(mockScene);
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Invalid world ID" })
      });

      await expect(createScene("s1", "New", "Sum", "invalid", [], "token")).rejects.toThrow("Invalid world ID");
    });

    it("should throw generic error when response has no error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(createScene("s1", "New", "Sum", "w1", [], "token")).rejects.toThrow("Failed to create scene");
    });
  });

  describe("fetchCampaignPlayers", () => {
    it("should fetch players", async () => {
      const mockPlayers = ["player1", "player2"];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ players: mockPlayers })
      });

      const result = await fetchCampaignPlayers("c1");

      expect(result).toEqual(mockPlayers);
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      });

      await expect(fetchCampaignPlayers("c1")).rejects.toThrow("Failed to load players");
    });
  });

  describe("addPlayerToCampaign", () => {
    it("should add player", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await addPlayerToCampaign("c1", "player1", "token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/campaigns/c1/players"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ playerId: "player1" })
        })
      );
    });

    it("should add player without token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await addPlayerToCampaign("c1", "player1");

      const call = mockFetch.mock.calls[0][1];
      expect(call.headers).not.toHaveProperty("Authorization");
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Player not found" })
      });

      await expect(addPlayerToCampaign("c1", "invalid", "token")).rejects.toThrow("Player not found");
    });

    it("should throw generic error when response has no error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(addPlayerToCampaign("c1", "player1", "token")).rejects.toThrow("Failed to add player to campaign");
    });
  });

  describe("fetchStoryArcs", () => {
    it("should fetch story arcs", async () => {
      const mockArcs = [
        { id: "1", campaignId: "c1", name: "Arc 1", summary: "Sum", eventIds: [] }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ storyArcs: mockArcs })
      });

      const result = await fetchStoryArcs("c1");

      expect(result).toEqual(mockArcs);
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      });

      await expect(fetchStoryArcs("c1")).rejects.toThrow("Failed to load story arcs");
    });
  });

  describe("createStoryArc", () => {
    it("should create story arc", async () => {
      const mockArc = {
        id: "1",
        campaignId: "c1",
        name: "New Arc",
        summary: "Sum",
        eventIds: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ storyArc: mockArc })
      });

      const result = await createStoryArc("c1", "New Arc", "Sum", "token");

      expect(result).toEqual(mockArc);
    });

    it("should create story arc without token", async () => {
      const mockArc = {
        id: "1",
        campaignId: "c1",
        name: "New Arc",
        summary: "Sum",
        eventIds: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ storyArc: mockArc })
      });

      const result = await createStoryArc("c1", "New Arc", "Sum");

      expect(result).toEqual(mockArc);
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Arc name already exists" })
      });

      await expect(createStoryArc("c1", "Existing", "Sum", "token")).rejects.toThrow("Arc name already exists");
    });

    it("should throw generic error when response has no error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(createStoryArc("c1", "New", "Sum", "token")).rejects.toThrow("Failed to create story arc");
    });
  });

  describe("fetchTimeline", () => {
    it("should fetch timeline", async () => {
      const mockTimeline = { currentMoment: 1000 };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTimeline
      });

      const result = await fetchTimeline("c1");

      expect(result).toEqual(mockTimeline);
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      });

      await expect(fetchTimeline("c1")).rejects.toThrow("Failed to load timeline");
    });
  });

  describe("advanceTimeline", () => {
    it("should advance timeline", async () => {
      const mockTimeline = { currentMoment: 2000 };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTimeline
      });

      const result = await advanceTimeline("c1", 1, "day", "token");

      expect(result).toEqual(mockTimeline);
    });

    it("should advance timeline without token", async () => {
      const mockTimeline = { currentMoment: 2000 };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTimeline
      });

      const result = await advanceTimeline("c1", 1, "day");

      expect(result).toEqual(mockTimeline);
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Invalid time unit" })
      });

      await expect(advanceTimeline("c1", 1, "day", "token")).rejects.toThrow("Invalid time unit");
    });

    it("should throw generic error when response has no error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(advanceTimeline("c1", 1, "day", "token")).rejects.toThrow("Failed to advance timeline");
    });
  });

  describe("fetchStoryArcEvents", () => {
    it("should fetch story arc events", async () => {
      const mockEvents = ["event1", "event2"];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ events: mockEvents })
      });

      const result = await fetchStoryArcEvents("arc1");

      expect(result).toEqual(mockEvents);
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      });

      await expect(fetchStoryArcEvents("arc1")).rejects.toThrow("Failed to load story arc events");
    });
  });

  describe("addEventToStoryArc", () => {
    it("should add event to story arc", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await addEventToStoryArc("arc1", "event1", "token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/story-arcs/arc1/events"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ eventId: "event1" })
        })
      );
    });

    it("should add event without token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await addEventToStoryArc("arc1", "event1");

      const call = mockFetch.mock.calls[0][1];
      expect(call.headers).not.toHaveProperty("Authorization");
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Event not found" })
      });

      await expect(addEventToStoryArc("arc1", "invalid", "token")).rejects.toThrow("Event not found");
    });

    it("should throw generic error when response has no error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(addEventToStoryArc("arc1", "event1", "token")).rejects.toThrow("Failed to add event to story arc");
    });
  });
});
