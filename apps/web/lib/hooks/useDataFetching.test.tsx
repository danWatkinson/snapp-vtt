// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  useCampaigns,
  useCampaignSessions,
  useCampaignPlayers,
  useStoryArcs,
  useStoryArcEvents,
  useSessionScenes,
  useWorldEntities,
  useWorlds,
  useUsers,
  useTimeline,
  useAllWorldEvents
} from "./useDataFetching";

describe("useDataFetching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useCampaigns", () => {
    it("should fetch campaigns by world when Campaigns tab is active and world is selected", async () => {
      const fetchCampaignsByWorld = vi.fn().mockResolvedValue([{ id: "1", name: "Campaign 1", worldId: "world-1" }]);
      const setCampaigns = vi.fn();
      const setCampaignsLoaded = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useCampaigns("Campaigns", false, "world-1", fetchCampaignsByWorld, setCampaigns, setCampaignsLoaded, setError)
      );

      await waitFor(() => {
        expect(fetchCampaignsByWorld).toHaveBeenCalledWith("world-1");
        expect(setCampaigns).toHaveBeenCalledWith([{ id: "1", name: "Campaign 1", worldId: "world-1" }]);
        expect(setCampaignsLoaded).toHaveBeenCalledWith(true);
      });
    });

    it("should not fetch if tab is not Campaigns", () => {
      const fetchCampaignsByWorld = vi.fn();
      const setCampaigns = vi.fn();
      const setCampaignsLoaded = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useCampaigns("World", false, "world-1", fetchCampaignsByWorld, setCampaigns, setCampaignsLoaded, setError)
      );

      expect(fetchCampaignsByWorld).not.toHaveBeenCalled();
    });

    it("should not fetch if already loaded", () => {
      const fetchCampaignsByWorld = vi.fn();
      const setCampaigns = vi.fn();
      const setCampaignsLoaded = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useCampaigns("Campaigns", true, "world-1", fetchCampaignsByWorld, setCampaigns, setCampaignsLoaded, setError)
      );

      expect(fetchCampaignsByWorld).not.toHaveBeenCalled();
    });

    it("should set empty campaigns when no world is selected", () => {
      const fetchCampaignsByWorld = vi.fn();
      const setCampaigns = vi.fn();
      const setCampaignsLoaded = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useCampaigns("Campaigns", false, null, fetchCampaignsByWorld, setCampaigns, setCampaignsLoaded, setError)
      );

      expect(setCampaigns).toHaveBeenCalledWith([]);
      expect(setCampaignsLoaded).toHaveBeenCalledWith(true);
      expect(fetchCampaignsByWorld).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const fetchCampaignsByWorld = vi.fn().mockRejectedValue(new Error("Network error"));
      const setCampaigns = vi.fn();
      const setCampaignsLoaded = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useCampaigns("Campaigns", false, "world-1", fetchCampaignsByWorld, setCampaigns, setCampaignsLoaded, setError)
      );

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("Network error");
      });
    });
  });

  describe("useCampaignSessions", () => {
    it("should fetch sessions when campaign is selected", async () => {
      const fetchCampaignSessions = vi.fn().mockResolvedValue([{ id: "1", name: "Session 1" }]);
      const setSessions = vi.fn();
      const setSessionsLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useCampaignSessions("c1", null, fetchCampaignSessions, setSessions, setSessionsLoadedFor, setError)
      );

      await waitFor(() => {
        expect(fetchCampaignSessions).toHaveBeenCalledWith("c1");
        expect(setSessions).toHaveBeenCalled();
        expect(setSessionsLoadedFor).toHaveBeenCalledWith("c1");
      });
    });

    it("should not fetch if no campaign selected", () => {
      const fetchCampaignSessions = vi.fn();
      const setSessions = vi.fn();
      const setSessionsLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useCampaignSessions(null, null, fetchCampaignSessions, setSessions, setSessionsLoadedFor, setError)
      );

      expect(fetchCampaignSessions).not.toHaveBeenCalled();
    });

    it("should not fetch if already loaded for this campaign", () => {
      const fetchCampaignSessions = vi.fn();
      const setSessions = vi.fn();
      const setSessionsLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useCampaignSessions("c1", "c1", fetchCampaignSessions, setSessions, setSessionsLoadedFor, setError)
      );

      expect(fetchCampaignSessions).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const fetchCampaignSessions = vi.fn().mockRejectedValue(new Error("Network error"));
      const setSessions = vi.fn();
      const setSessionsLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useCampaignSessions("c1", null, fetchCampaignSessions, setSessions, setSessionsLoadedFor, setError)
      );

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("Network error");
      });
    });
  });

  describe("useCampaignPlayers", () => {
    it("should fetch players when campaign is selected", async () => {
      const fetchCampaignPlayers = vi.fn().mockResolvedValue(["player1", "player2"]);
      const setPlayers = vi.fn();
      const setPlayersLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useCampaignPlayers("c1", null, fetchCampaignPlayers, setPlayers, setPlayersLoadedFor, setError)
      );

      await waitFor(() => {
        expect(fetchCampaignPlayers).toHaveBeenCalledWith("c1");
        expect(setPlayers).toHaveBeenCalledWith(["player1", "player2"]);
      });
    });

    it("should not fetch players if no campaign is selected", () => {
      const fetchCampaignPlayers = vi.fn();
      const setPlayers = vi.fn();
      const setPlayersLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useCampaignPlayers(null, null, fetchCampaignPlayers, setPlayers, setPlayersLoadedFor, setError)
      );

      expect(fetchCampaignPlayers).not.toHaveBeenCalled();
    });

    it("should not fetch players if already loaded for this campaign", () => {
      const fetchCampaignPlayers = vi.fn();
      const setPlayers = vi.fn();
      const setPlayersLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useCampaignPlayers("c1", "c1", fetchCampaignPlayers, setPlayers, setPlayersLoadedFor, setError)
      );

      expect(fetchCampaignPlayers).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const fetchCampaignPlayers = vi.fn().mockRejectedValue(new Error("Network error"));
      const setPlayers = vi.fn();
      const setPlayersLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useCampaignPlayers("c1", null, fetchCampaignPlayers, setPlayers, setPlayersLoadedFor, setError)
      );

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("Network error");
      });
    });
  });

  describe("useStoryArcs", () => {
    it("should fetch story arcs when campaign is selected", async () => {
      const fetchStoryArcs = vi.fn().mockResolvedValue([{ id: "1", name: "Arc 1" }]);
      const setStoryArcs = vi.fn();
      const setStoryArcsLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useStoryArcs("c1", null, fetchStoryArcs, setStoryArcs, setStoryArcsLoadedFor, setError)
      );

      await waitFor(() => {
        expect(fetchStoryArcs).toHaveBeenCalledWith("c1");
        expect(setStoryArcs).toHaveBeenCalled();
      });
    });

    it("should not fetch story arcs if no campaign is selected", () => {
      const fetchStoryArcs = vi.fn();
      const setStoryArcs = vi.fn();
      const setStoryArcsLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useStoryArcs(null, null, fetchStoryArcs, setStoryArcs, setStoryArcsLoadedFor, setError)
      );

      expect(fetchStoryArcs).not.toHaveBeenCalled();
    });

    it("should not fetch story arcs if already loaded for this campaign", () => {
      const fetchStoryArcs = vi.fn();
      const setStoryArcs = vi.fn();
      const setStoryArcsLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useStoryArcs("c1", "c1", fetchStoryArcs, setStoryArcs, setStoryArcsLoadedFor, setError)
      );

      expect(fetchStoryArcs).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const fetchStoryArcs = vi.fn().mockRejectedValue(new Error("Network error"));
      const setStoryArcs = vi.fn();
      const setStoryArcsLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useStoryArcs("c1", null, fetchStoryArcs, setStoryArcs, setStoryArcsLoadedFor, setError)
      );

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("Network error");
      });
    });
  });

  describe("useWorldEntities", () => {
    it("should fetch all entities when type is 'all'", async () => {
      const fetchWorldEntities = vi.fn().mockResolvedValue([{ id: "1", type: "location" }]);
      const setEntities = vi.fn();
      const setEntitiesLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useWorldEntities("w1", "all", null, fetchWorldEntities, setEntities, setEntitiesLoadedFor, setError)
      );

      await waitFor(
        () => {
          expect(fetchWorldEntities).toHaveBeenCalled();
          const calls = fetchWorldEntities.mock.calls;
          expect(calls[0][0]).toBe("w1");
          // When type is "all", second argument should be undefined or not passed
        },
        { timeout: 2000, interval: 100 }
      );
    });

    it("should not fetch entities if no world is selected", () => {
      const fetchWorldEntities = vi.fn();
      const setEntities = vi.fn();
      const setEntitiesLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useWorldEntities(null, "location", null, fetchWorldEntities, setEntities, setEntitiesLoadedFor, setError)
      );

      expect(fetchWorldEntities).not.toHaveBeenCalled();
    });

    it("should fetch filtered entities when type is specified", async () => {
      const fetchWorldEntities = vi.fn().mockResolvedValue([{ id: "1", type: "location" }]);
      const setEntities = vi.fn();
      const setEntitiesLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useWorldEntities("w1", "location", null, fetchWorldEntities, setEntities, setEntitiesLoadedFor, setError)
      );

      await waitFor(() => {
        expect(fetchWorldEntities).toHaveBeenCalledWith("w1", "location");
      });
    });

    it("should not fetch if already loaded for this world and type", () => {
      const fetchWorldEntities = vi.fn();
      const setEntities = vi.fn();
      const setEntitiesLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useWorldEntities("w1", "location", "w1-location", fetchWorldEntities, setEntities, setEntitiesLoadedFor, setError)
      );

      expect(fetchWorldEntities).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const fetchWorldEntities = vi.fn().mockRejectedValue(new Error("Network error"));
      const setEntities = vi.fn();
      const setEntitiesLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useWorldEntities("w1", "location", null, fetchWorldEntities, setEntities, setEntitiesLoadedFor, setError)
      );

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("Network error");
      });
    });
  });

  describe("useWorlds", () => {
    it("should fetch worlds when user is present and not loaded", async () => {
      const fetchWorlds = vi.fn().mockResolvedValue([{ id: "1", name: "World 1" }]);
      const setWorlds = vi.fn();
      const setWorldsLoaded = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useWorlds({ id: "1" }, false, fetchWorlds, setWorlds, setWorldsLoaded, setError)
      );

      await waitFor(() => {
        expect(fetchWorlds).toHaveBeenCalled();
        expect(setWorlds).toHaveBeenCalled();
      });
    });

    it("should not fetch if no user", () => {
      const fetchWorlds = vi.fn();
      const setWorlds = vi.fn();
      const setWorldsLoaded = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useWorlds(null, false, fetchWorlds, setWorlds, setWorldsLoaded, setError)
      );

      expect(fetchWorlds).not.toHaveBeenCalled();
    });

    it("should not fetch if already loaded", () => {
      const fetchWorlds = vi.fn();
      const setWorlds = vi.fn();
      const setWorldsLoaded = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useWorlds({ id: "1" }, true, fetchWorlds, setWorlds, setWorldsLoaded, setError)
      );

      expect(fetchWorlds).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const fetchWorlds = vi.fn().mockRejectedValue(new Error("Network error"));
      const setWorlds = vi.fn();
      const setWorldsLoaded = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useWorlds({ id: "1" }, false, fetchWorlds, setWorlds, setWorldsLoaded, setError)
      );

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("Network error");
      });
    });
  });

  describe("useUsers", () => {
    it("should fetch users when Users tab is active and user is admin", async () => {
      const listUsers = vi.fn().mockResolvedValue([{ id: "1", username: "user1" }]);
      const setUsers = vi.fn();
      const setUsersLoaded = vi.fn();
      const setError = vi.fn();
      const currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" };

      renderHook(() =>
        useUsers("Users", currentUser, false, listUsers, setUsers, setUsersLoaded, setError)
      );

      await waitFor(
        () => {
          expect(listUsers).toHaveBeenCalledWith("token");
          expect(setUsers).toHaveBeenCalled();
        },
        { timeout: 2000, interval: 100 }
      );
    });

    it("should not fetch if tab is not Users", () => {
      const listUsers = vi.fn();
      const setUsers = vi.fn();
      const setUsersLoaded = vi.fn();
      const setError = vi.fn();
      const currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" };

      renderHook(() =>
        useUsers("World", currentUser, false, listUsers, setUsers, setUsersLoaded, setError)
      );

      expect(listUsers).not.toHaveBeenCalled();
    });

    it("should not fetch if user is not admin", () => {
      const listUsers = vi.fn();
      const setUsers = vi.fn();
      const setUsersLoaded = vi.fn();
      const setError = vi.fn();
      const currentUser = { user: { username: "user", roles: [] }, token: "token" };

      renderHook(() =>
        useUsers("Users", currentUser, false, listUsers, setUsers, setUsersLoaded, setError)
      );

      expect(listUsers).not.toHaveBeenCalled();
    });

    it("should handle errors and reset usersLoaded", async () => {
      const listUsers = vi.fn().mockRejectedValue(new Error("Network error"));
      const setUsers = vi.fn();
      const setUsersLoaded = vi.fn();
      const setError = vi.fn();
      const currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" };

      renderHook(() =>
        useUsers("Users", currentUser, false, listUsers, setUsers, setUsersLoaded, setError)
      );

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("Network error");
        expect(setUsersLoaded).toHaveBeenCalledWith(false);
      });
    });

    it("should not refetch users when usersLoaded is true", () => {
      const listUsers = vi.fn();
      const setUsers = vi.fn();
      const setUsersLoaded = vi.fn();
      const setError = vi.fn();
      const currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" };

      renderHook(() =>
        useUsers("Users", currentUser, true, listUsers, setUsers, setUsersLoaded, setError)
      );

      expect(listUsers).not.toHaveBeenCalled();
    });

    it("should set usersLoaded to false when tab is not Users", () => {
      const listUsers = vi.fn();
      const setUsers = vi.fn();
      const setUsersLoaded = vi.fn();
      const setError = vi.fn();
      const currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" };

      renderHook(() =>
        useUsers("World", currentUser, false, listUsers, setUsers, setUsersLoaded, setError)
      );

      expect(listUsers).not.toHaveBeenCalled();
      expect(setUsersLoaded).toHaveBeenCalledWith(false);
    });

    it("should set usersLoaded to false when no currentUser", () => {
      const listUsers = vi.fn();
      const setUsers = vi.fn();
      const setUsersLoaded = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useUsers("Users", null, false, listUsers, setUsers, setUsersLoaded, setError)
      );

      expect(listUsers).not.toHaveBeenCalled();
      expect(setUsersLoaded).toHaveBeenCalledWith(false);
    });

    it("should set usersLoaded to false when user is not admin", () => {
      const listUsers = vi.fn();
      const setUsers = vi.fn();
      const setUsersLoaded = vi.fn();
      const setError = vi.fn();
      const currentUser = { user: { username: "user", roles: [] }, token: "token" };

      renderHook(() =>
        useUsers("Users", currentUser, false, listUsers, setUsers, setUsersLoaded, setError)
      );

      expect(listUsers).not.toHaveBeenCalled();
      expect(setUsersLoaded).toHaveBeenCalledWith(false);
    });
  });

  describe("useSessionScenes", () => {
    it("should fetch scenes when session is selected", async () => {
      const fetchSessionScenes = vi.fn().mockResolvedValue([{ id: "1", name: "Scene 1" }]);
      const setScenes = vi.fn();
      const setScenesLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useSessionScenes("s1", null, fetchSessionScenes, setScenes, setScenesLoadedFor, setError)
      );

      await waitFor(() => {
        expect(fetchSessionScenes).toHaveBeenCalledWith("s1");
        expect(setScenes).toHaveBeenCalledWith([{ id: "1", name: "Scene 1" }]);
        expect(setScenesLoadedFor).toHaveBeenCalledWith("s1");
      });
    });

    it("should not fetch if no session selected", () => {
      const fetchSessionScenes = vi.fn();
      const setScenes = vi.fn();
      const setScenesLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useSessionScenes(null, null, fetchSessionScenes, setScenes, setScenesLoadedFor, setError)
      );

      expect(fetchSessionScenes).not.toHaveBeenCalled();
    });

    it("should not fetch if already loaded for this session", () => {
      const fetchSessionScenes = vi.fn();
      const setScenes = vi.fn();
      const setScenesLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useSessionScenes("s1", "s1", fetchSessionScenes, setScenes, setScenesLoadedFor, setError)
      );

      expect(fetchSessionScenes).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const fetchSessionScenes = vi.fn().mockRejectedValue(new Error("Network error"));
      const setScenes = vi.fn();
      const setScenesLoadedFor = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useSessionScenes("s1", null, fetchSessionScenes, setScenes, setScenesLoadedFor, setError)
      );

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("Network error");
      });
    });
  });

  describe("useStoryArcEvents", () => {
    it("should fetch story arc events and world events", async () => {
      const fetchStoryArcEvents = vi.fn().mockResolvedValue(["e1", "e2"]);
      const fetchWorldEntities = vi
        .fn()
        .mockResolvedValueOnce([{ id: "e1" }, { id: "x" }])
        .mockResolvedValueOnce([{ id: "e2" }, { id: "y" }]);
      const setStoryArcEvents = vi.fn();
      const setStoryArcEventsLoadedFor = vi.fn();
      const setAllEvents = vi.fn();
      const setError = vi.fn();
      const worlds = [{ id: "w1" }, { id: "w2" }];

      renderHook(() =>
        useStoryArcEvents(
          "sa1",
          null,
          worlds,
          fetchStoryArcEvents,
          fetchWorldEntities,
          setStoryArcEvents,
          setStoryArcEventsLoadedFor,
          setAllEvents,
          setError
        )
      );

      await waitFor(() => {
        expect(fetchStoryArcEvents).toHaveBeenCalledWith("sa1");
        expect(setStoryArcEvents).toHaveBeenCalledWith(["e1", "e2"]);
        expect(setStoryArcEventsLoadedFor).toHaveBeenCalledWith("sa1");
        expect(fetchWorldEntities).toHaveBeenCalledTimes(2);
        const [eventsArg] = setAllEvents.mock.calls[0];
        expect(eventsArg).toEqual([
          { id: "e1" },
          { id: "x" },
          { id: "e2" },
          { id: "y" }
        ]);
        expect(setError).not.toHaveBeenCalled();
      });
    });

    it("should not fetch if no story arc selected", () => {
      const fetchStoryArcEvents = vi.fn();
      const fetchWorldEntities = vi.fn();
      const setStoryArcEvents = vi.fn();
      const setStoryArcEventsLoadedFor = vi.fn();
      const setAllEvents = vi.fn();
      const setError = vi.fn();
      const worlds: any[] = [];

      renderHook(() =>
        useStoryArcEvents(
          null,
          null,
          worlds,
          fetchStoryArcEvents,
          fetchWorldEntities,
          setStoryArcEvents,
          setStoryArcEventsLoadedFor,
          setAllEvents,
          setError
        )
      );

      expect(fetchStoryArcEvents).not.toHaveBeenCalled();
    });

    it("should not fetch if already loaded for this story arc", () => {
      const fetchStoryArcEvents = vi.fn();
      const fetchWorldEntities = vi.fn();
      const setStoryArcEvents = vi.fn();
      const setStoryArcEventsLoadedFor = vi.fn();
      const setAllEvents = vi.fn();
      const setError = vi.fn();
      const worlds: any[] = [];

      renderHook(() =>
        useStoryArcEvents(
          "sa1",
          "sa1",
          worlds,
          fetchStoryArcEvents,
          fetchWorldEntities,
          setStoryArcEvents,
          setStoryArcEventsLoadedFor,
          setAllEvents,
          setError
        )
      );

      expect(fetchStoryArcEvents).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const fetchStoryArcEvents = vi.fn().mockRejectedValue(new Error("Network error"));
      const fetchWorldEntities = vi.fn();
      const setStoryArcEvents = vi.fn();
      const setStoryArcEventsLoadedFor = vi.fn();
      const setAllEvents = vi.fn();
      const setError = vi.fn();
      const worlds: any[] = [];

      renderHook(() =>
        useStoryArcEvents(
          "sa1",
          null,
          worlds,
          fetchStoryArcEvents,
          fetchWorldEntities,
          setStoryArcEvents,
          setStoryArcEventsLoadedFor,
          setAllEvents,
          setError
        )
      );

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("Network error");
      });
    });
  });

  describe("useTimeline", () => {
    it("should fetch timeline, story arcs, and events when in timeline view", async () => {
      const fetchTimeline = vi.fn().mockResolvedValue({ currentMoment: 1000 });
      const fetchStoryArcs = vi.fn().mockResolvedValue([
        { id: "arc1", name: "Arc 1" },
        { id: "arc2", name: "Arc 2" }
      ]);
      const fetchStoryArcEvents = vi
        .fn()
        .mockResolvedValueOnce(["e1"])
        .mockResolvedValueOnce(["e2"]);
      const fetchWorldEntities = vi
        .fn()
        .mockResolvedValue([{ id: "e1" }, { id: "e2" }, { id: "x" }]);
      const setTimeline = vi.fn();
      const setTimelineLoadedFor = vi.fn();
      const setStoryArcs = vi.fn();
      const setAllEvents = vi.fn();
      const setError = vi.fn();
      const worlds = [{ id: "w1" }];

      renderHook(() =>
        useTimeline(
          "c1",
          null,
          "timeline",
          worlds,
          fetchTimeline,
          fetchStoryArcs,
          fetchStoryArcEvents,
          fetchWorldEntities,
          setTimeline,
          setTimelineLoadedFor,
          setStoryArcs,
          setAllEvents,
          setError
        )
      );

      await waitFor(() => {
        expect(fetchTimeline).toHaveBeenCalledWith("c1");
        expect(setTimeline).toHaveBeenCalledWith({ currentMoment: 1000 });
        expect(setTimelineLoadedFor).toHaveBeenCalledWith("c1");
        expect(fetchStoryArcs).toHaveBeenCalledWith("c1");
        expect(setStoryArcs).toHaveBeenCalled();
        expect(fetchStoryArcEvents).toHaveBeenCalledTimes(2);
        expect(fetchWorldEntities).toHaveBeenCalledWith("w1", "event");
        const [eventsArg] = setAllEvents.mock.calls[0];
        expect(eventsArg).toEqual([{ id: "e1" }, { id: "e2" }]);
        expect(setError).not.toHaveBeenCalled();
      });
    });

    it("should not fetch if no campaign selected", () => {
      const fetchTimeline = vi.fn();
      const fetchStoryArcs = vi.fn();
      const fetchStoryArcEvents = vi.fn();
      const fetchWorldEntities = vi.fn();
      const setTimeline = vi.fn();
      const setTimelineLoadedFor = vi.fn();
      const setStoryArcs = vi.fn();
      const setAllEvents = vi.fn();
      const setError = vi.fn();
      const worlds: any[] = [];

      renderHook(() =>
        useTimeline(
          null,
          null,
          "timeline",
          worlds,
          fetchTimeline,
          fetchStoryArcs,
          fetchStoryArcEvents,
          fetchWorldEntities,
          setTimeline,
          setTimelineLoadedFor,
          setStoryArcs,
          setAllEvents,
          setError
        )
      );

      expect(fetchTimeline).not.toHaveBeenCalled();
    });

    it("should not fetch if timeline already loaded for this campaign", () => {
      const fetchTimeline = vi.fn();
      const fetchStoryArcs = vi.fn();
      const fetchStoryArcEvents = vi.fn();
      const fetchWorldEntities = vi.fn();
      const setTimeline = vi.fn();
      const setTimelineLoadedFor = vi.fn();
      const setStoryArcs = vi.fn();
      const setAllEvents = vi.fn();
      const setError = vi.fn();
      const worlds: any[] = [];

      renderHook(() =>
        useTimeline(
          "c1",
          "c1",
          "timeline",
          worlds,
          fetchTimeline,
          fetchStoryArcs,
          fetchStoryArcEvents,
          fetchWorldEntities,
          setTimeline,
          setTimelineLoadedFor,
          setStoryArcs,
          setAllEvents,
          setError
        )
      );

      expect(fetchTimeline).not.toHaveBeenCalled();
    });

    it("should not fetch if campaignView is not 'timeline'", () => {
      const fetchTimeline = vi.fn();
      const fetchStoryArcs = vi.fn();
      const fetchStoryArcEvents = vi.fn();
      const fetchWorldEntities = vi.fn();
      const setTimeline = vi.fn();
      const setTimelineLoadedFor = vi.fn();
      const setStoryArcs = vi.fn();
      const setAllEvents = vi.fn();
      const setError = vi.fn();
      const worlds: any[] = [];

      renderHook(() =>
        useTimeline(
          "c1",
          null,
          "campaigns",
          worlds,
          fetchTimeline,
          fetchStoryArcs,
          fetchStoryArcEvents,
          fetchWorldEntities,
          setTimeline,
          setTimelineLoadedFor,
          setStoryArcs,
          setAllEvents,
          setError
        )
      );

      expect(fetchTimeline).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const fetchTimeline = vi.fn().mockRejectedValue(new Error("Network error"));
      const fetchStoryArcs = vi.fn();
      const fetchStoryArcEvents = vi.fn();
      const fetchWorldEntities = vi.fn();
      const setTimeline = vi.fn();
      const setTimelineLoadedFor = vi.fn();
      const setStoryArcs = vi.fn();
      const setAllEvents = vi.fn();
      const setError = vi.fn();
      const worlds: any[] = [];

      renderHook(() =>
        useTimeline(
          "c1",
          null,
          "timeline",
          worlds,
          fetchTimeline,
          fetchStoryArcs,
          fetchStoryArcEvents,
          fetchWorldEntities,
          setTimeline,
          setTimelineLoadedFor,
          setStoryArcs,
          setAllEvents,
          setError
        )
      );

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("Network error");
      });
    });
  });

  describe("useAllWorldEvents", () => {
    it("should fetch all world events when modal opens", async () => {
      const fetchWorldEntities = vi
        .fn()
        .mockResolvedValueOnce([{ id: "e1" }])
        .mockResolvedValueOnce([{ id: "e2" }]);
      const setAllEvents = vi.fn();
      const setError = vi.fn();
      const worlds = [{ id: "w1" }, { id: "w2" }];

      renderHook(() =>
        useAllWorldEvents(true, worlds, fetchWorldEntities, setAllEvents, setError)
      );

      await waitFor(() => {
        expect(fetchWorldEntities).toHaveBeenCalledTimes(2);
        const [eventsArg] = setAllEvents.mock.calls[0];
        expect(eventsArg).toEqual([{ id: "e1" }, { id: "e2" }]);
        expect(setError).not.toHaveBeenCalled();
      });
    });

    it("should not fetch when modal is closed", () => {
      const fetchWorldEntities = vi.fn();
      const setAllEvents = vi.fn();
      const setError = vi.fn();
      const worlds: any[] = [];

      renderHook(() =>
        useAllWorldEvents(false, worlds, fetchWorldEntities, setAllEvents, setError)
      );

      expect(fetchWorldEntities).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const fetchWorldEntities = vi.fn().mockRejectedValue(new Error("Network error"));
      const setAllEvents = vi.fn();
      const setError = vi.fn();
      const worlds = [{ id: "w1" }];

      renderHook(() =>
        useAllWorldEvents(true, worlds, fetchWorldEntities, setAllEvents, setError)
      );

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("Network error");
      });
    });
  });
});
