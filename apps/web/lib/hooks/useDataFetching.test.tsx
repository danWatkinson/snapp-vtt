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
    it("should fetch campaigns when Campaigns tab is active", async () => {
      const fetchCampaigns = vi.fn().mockResolvedValue([{ id: "1", name: "Campaign 1" }]);
      const setCampaigns = vi.fn();
      const setCampaignsLoaded = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useCampaigns("Campaigns", false, fetchCampaigns, setCampaigns, setCampaignsLoaded, setError)
      );

      await waitFor(() => {
        expect(fetchCampaigns).toHaveBeenCalled();
        expect(setCampaigns).toHaveBeenCalledWith([{ id: "1", name: "Campaign 1" }]);
        expect(setCampaignsLoaded).toHaveBeenCalledWith(true);
      });
    });

    it("should not fetch if tab is not Campaigns", () => {
      const fetchCampaigns = vi.fn();
      const setCampaigns = vi.fn();
      const setCampaignsLoaded = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useCampaigns("World", false, fetchCampaigns, setCampaigns, setCampaignsLoaded, setError)
      );

      expect(fetchCampaigns).not.toHaveBeenCalled();
    });

    it("should not fetch if already loaded", () => {
      const fetchCampaigns = vi.fn();
      const setCampaigns = vi.fn();
      const setCampaignsLoaded = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useCampaigns("Campaigns", true, fetchCampaigns, setCampaigns, setCampaignsLoaded, setError)
      );

      expect(fetchCampaigns).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const fetchCampaigns = vi.fn().mockRejectedValue(new Error("Network error"));
      const setCampaigns = vi.fn();
      const setCampaignsLoaded = vi.fn();
      const setError = vi.fn();

      renderHook(() =>
        useCampaigns("Campaigns", false, fetchCampaigns, setCampaigns, setCampaignsLoaded, setError)
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
  });
});
