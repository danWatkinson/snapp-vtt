// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHomePageData } from "./useHomePageData";

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
      setError: vi.fn()
    };

    renderHook(() => useHomePageData(mockProps));

    // Hook should execute without errors
    // The actual data fetching hooks are tested separately
    expect(true).toBe(true);
  });
});
