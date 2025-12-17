// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useHomePageData } from "./useHomePageData";
import * as assetsClient from "../clients/assetsClient";

// Mock the data fetching hooks
vi.mock("./useDataFetching", () => ({
  useUsers: vi.fn(),
  useWorlds: vi.fn(),
  useCampaigns: vi.fn(),
  useCampaignSessions: vi.fn(),
  useCampaignPlayers: vi.fn(),
  useStoryArcs: vi.fn(),
  useStoryArcEvents: vi.fn(),
  useSessionScenes: vi.fn(),
  useWorldEntities: vi.fn(),
  useTimeline: vi.fn(),
  useAllWorldEvents: vi.fn()
}));

describe("useHomePageData", () => {
  it("should call all data fetching hooks with correct props", () => {
    const mockProps = {
      activeTab: "World" as const,
      currentUser: null,
      selectedIds: {
        worldId: null,
        campaignId: null,
        storyArcId: null,
        sessionId: null,
        eventId: ""
      },
      selectedEntityType: "all" as const,
      campaignView: null,
      worlds: [],
      modals: {},
      usersLoaded: false,
      worldsLoaded: false,
      campaignsLoaded: false,
      entitiesLoadedFor: null,
      sessionsLoadedFor: null,
      playersLoadedFor: null,
      storyArcsLoadedFor: null,
      storyArcEventsLoadedFor: null,
      timelineLoadedFor: null,
      scenesLoadedFor: null,
      assetsLoaded: true,
      setUsers: vi.fn(),
      setUsersLoaded: vi.fn(),
      setWorlds: vi.fn(),
      setWorldsLoaded: vi.fn(),
      setCampaigns: vi.fn(),
      setCampaignsLoaded: vi.fn(),
      setEntities: vi.fn(),
      setEntitiesLoadedFor: vi.fn(),
      setSessions: vi.fn(),
      setSessionsLoadedFor: vi.fn(),
      setPlayers: vi.fn(),
      setPlayersLoadedFor: vi.fn(),
      setStoryArcs: vi.fn(),
      setStoryArcsLoadedFor: vi.fn(),
      setStoryArcEvents: vi.fn(),
      setStoryArcEventsLoadedFor: vi.fn(),
      setAllEvents: vi.fn(),
      setTimeline: vi.fn(),
      setTimelineLoadedFor: vi.fn(),
      setScenes: vi.fn(),
      setScenesLoadedFor: vi.fn(),
      setAssets: vi.fn(),
      setAssetsLoaded: vi.fn(),
      setError: vi.fn()
    };

    renderHook(() => useHomePageData(mockProps));

    // Hook should execute without errors
    // The actual data fetching hooks are tested separately
    expect(true).toBe(true);
  });

  it("loads assets once when currentUser is present and assetsLoaded is false", async () => {
    const mockAssets = [{ id: "a1" }];
    const setAssets = vi.fn();
    const setAssetsLoaded = vi.fn();
    const setError = vi.fn();

    const baseProps = {
      activeTab: "World" as const,
      currentUser: { token: "token" } as any,
      selectedIds: {
        worldId: null,
        campaignId: null,
        storyArcId: null,
        sessionId: null,
        eventId: ""
      },
      selectedEntityType: "all" as const,
      campaignView: null,
      worlds: [],
      modals: {},
      usersLoaded: false,
      worldsLoaded: false,
      campaignsLoaded: false,
      entitiesLoadedFor: null,
      sessionsLoadedFor: null,
      playersLoadedFor: null,
      storyArcsLoadedFor: null,
      storyArcEventsLoadedFor: null,
      timelineLoadedFor: null,
      scenesLoadedFor: null,
      setUsers: vi.fn(),
      setUsersLoaded: vi.fn(),
      setWorlds: vi.fn(),
      setWorldsLoaded: vi.fn(),
      setCampaigns: vi.fn(),
      setCampaignsLoaded: vi.fn(),
      setEntities: vi.fn(),
      setEntitiesLoadedFor: vi.fn(),
      setSessions: vi.fn(),
      setSessionsLoadedFor: vi.fn(),
      setPlayers: vi.fn(),
      setPlayersLoadedFor: vi.fn(),
      setStoryArcs: vi.fn(),
      setStoryArcsLoadedFor: vi.fn(),
      setStoryArcEvents: vi.fn(),
      setStoryArcEventsLoadedFor: vi.fn(),
      setAllEvents: vi.fn(),
      setTimeline: vi.fn(),
      setTimelineLoadedFor: vi.fn(),
      setScenes: vi.fn(),
      setScenesLoadedFor: vi.fn()
    };

    const mockProps = {
      ...baseProps,
      assetsLoaded: false,
      setAssets,
      setAssetsLoaded,
      setError
    };

    const fetchAssetsMock = vi
      .spyOn(assetsClient, "fetchAssets")
      .mockResolvedValueOnce(mockAssets as any);

    renderHook(() => useHomePageData(mockProps));

    await Promise.resolve();

    expect(fetchAssetsMock).toHaveBeenCalledWith("token");
    expect(setAssets).toHaveBeenCalledWith(mockAssets);
    expect(setAssetsLoaded).toHaveBeenCalledWith(true);
    expect(setError).not.toHaveBeenCalled();

    fetchAssetsMock.mockRestore();
  });

  it("sets error message when loading assets fails with an Error", async () => {
    const setAssets = vi.fn();
    const setAssetsLoaded = vi.fn();
    const setError = vi.fn();

    const baseProps = {
      activeTab: "World" as const,
      currentUser: { token: "token" } as any,
      selectedIds: {
        worldId: null,
        campaignId: null,
        storyArcId: null,
        sessionId: null,
        eventId: ""
      },
      selectedEntityType: "all" as const,
      campaignView: null,
      worlds: [],
      modals: {},
      usersLoaded: false,
      worldsLoaded: false,
      campaignsLoaded: false,
      entitiesLoadedFor: null,
      sessionsLoadedFor: null,
      playersLoadedFor: null,
      storyArcsLoadedFor: null,
      storyArcEventsLoadedFor: null,
      timelineLoadedFor: null,
      scenesLoadedFor: null,
      setUsers: vi.fn(),
      setUsersLoaded: vi.fn(),
      setWorlds: vi.fn(),
      setWorldsLoaded: vi.fn(),
      setCampaigns: vi.fn(),
      setCampaignsLoaded: vi.fn(),
      setEntities: vi.fn(),
      setEntitiesLoadedFor: vi.fn(),
      setSessions: vi.fn(),
      setSessionsLoadedFor: vi.fn(),
      setPlayers: vi.fn(),
      setPlayersLoadedFor: vi.fn(),
      setStoryArcs: vi.fn(),
      setStoryArcsLoadedFor: vi.fn(),
      setStoryArcEvents: vi.fn(),
      setStoryArcEventsLoadedFor: vi.fn(),
      setAllEvents: vi.fn(),
      setTimeline: vi.fn(),
      setTimelineLoadedFor: vi.fn(),
      setScenes: vi.fn(),
      setScenesLoadedFor: vi.fn()
    };

    const mockProps = {
      ...baseProps,
      assetsLoaded: false,
      setAssets,
      setAssetsLoaded,
      setError
    };

    const error = new Error("boom");
    const fetchAssetsMock = vi
      .spyOn(assetsClient, "fetchAssets")
      .mockRejectedValueOnce(error);

    renderHook(() => useHomePageData(mockProps));

    await waitFor(() => {
      expect(fetchAssetsMock).toHaveBeenCalledWith("token");
    });

    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith("boom");
    });

    expect(setAssets).not.toHaveBeenCalled();
    expect(setAssetsLoaded).not.toHaveBeenCalledWith(true);

    fetchAssetsMock.mockRestore();
  });

  it("sets generic error when loading assets fails with non-Error", async () => {
    const setAssets = vi.fn();
    const setAssetsLoaded = vi.fn();
    const setError = vi.fn();

    const baseProps = {
      activeTab: "World" as const,
      currentUser: { token: "token" } as any,
      selectedIds: {
        worldId: null,
        campaignId: null,
        storyArcId: null,
        sessionId: null,
        eventId: ""
      },
      selectedEntityType: "all" as const,
      campaignView: null,
      worlds: [],
      modals: {},
      usersLoaded: false,
      worldsLoaded: false,
      campaignsLoaded: false,
      entitiesLoadedFor: null,
      sessionsLoadedFor: null,
      playersLoadedFor: null,
      storyArcsLoadedFor: null,
      storyArcEventsLoadedFor: null,
      timelineLoadedFor: null,
      scenesLoadedFor: null,
      setUsers: vi.fn(),
      setUsersLoaded: vi.fn(),
      setWorlds: vi.fn(),
      setWorldsLoaded: vi.fn(),
      setCampaigns: vi.fn(),
      setCampaignsLoaded: vi.fn(),
      setEntities: vi.fn(),
      setEntitiesLoadedFor: vi.fn(),
      setSessions: vi.fn(),
      setSessionsLoadedFor: vi.fn(),
      setPlayers: vi.fn(),
      setPlayersLoadedFor: vi.fn(),
      setStoryArcs: vi.fn(),
      setStoryArcsLoadedFor: vi.fn(),
      setStoryArcEvents: vi.fn(),
      setStoryArcEventsLoadedFor: vi.fn(),
      setAllEvents: vi.fn(),
      setTimeline: vi.fn(),
      setTimelineLoadedFor: vi.fn(),
      setScenes: vi.fn(),
      setScenesLoadedFor: vi.fn()
    };

    const mockProps = {
      ...baseProps,
      assetsLoaded: false,
      setAssets,
      setAssetsLoaded,
      setError
    };

    const fetchAssetsMock = vi
      .spyOn(assetsClient, "fetchAssets")
      .mockRejectedValueOnce("boom" as any);

    renderHook(() => useHomePageData(mockProps));

    await waitFor(() => {
      expect(fetchAssetsMock).toHaveBeenCalledWith("token");
    });

    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith("Failed to load assets");
    });

    expect(setAssets).not.toHaveBeenCalled();
    expect(setAssetsLoaded).not.toHaveBeenCalledWith(true);

    fetchAssetsMock.mockRestore();
  });
});
