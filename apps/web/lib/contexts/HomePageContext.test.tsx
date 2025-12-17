// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, renderHook } from "@testing-library/react";
import { HomePageProvider, useHomePage } from "./HomePageContext";
import { useHomePageState } from "../hooks/useHomePageState";
import { useHomePageHandlers } from "../hooks/useHomePageHandlers";
import { useHomePageData } from "../hooks/useHomePageData";
import { useCustomEvent } from "../hooks/useCustomEvent";
import { OPEN_USER_MANAGEMENT_EVENT, OPEN_CREATE_WORLD_EVENT } from "../auth/authEvents";

// Mock the hooks
vi.mock("../hooks/useHomePageState");
vi.mock("../hooks/useHomePageData");
vi.mock("../hooks/useHomePageHandlers");
vi.mock("../hooks/useCustomEvent");

describe("HomePageContext", () => {
  beforeEach(() => {
    vi.mocked(useHomePageState).mockReturnValue({
      activeTab: null,
      setActiveTab: vi.fn(),
      activeMode: null,
      setActiveMode: vi.fn(),
      planningSubTab: "World Entities",
      setPlanningSubTab: vi.fn(),
      campaignView: null,
      setCampaignView: vi.fn(),
      loginForm: { form: { name: "", password: "" }, setField: vi.fn(), resetForm: vi.fn() },
      userManagementForm: { form: { username: "", role: "" }, setField: vi.fn(), resetForm: vi.fn() },
      createUserForm: { form: { username: "", password: "", roles: [] }, setField: vi.fn(), resetForm: vi.fn() },
      worldForm: { form: { name: "", description: "" }, setField: vi.fn(), resetForm: vi.fn() },
      entityForm: { form: { name: "", summary: "", beginningTimestamp: "", endingTimestamp: "" }, setField: vi.fn(), resetForm: vi.fn() },
      campaignForm: { form: { name: "", summary: "" }, setField: vi.fn(), resetForm: vi.fn() },
      sessionForm: { form: { name: "" }, setField: vi.fn(), resetForm: vi.fn() },
      playerForm: { form: { username: "" }, setField: vi.fn(), resetForm: vi.fn() },
      storyArcForm: { form: { name: "", summary: "" }, setField: vi.fn(), resetForm: vi.fn() },
      sceneForm: { form: { name: "", summary: "", worldId: "" }, setField: vi.fn(), resetForm: vi.fn() },
      currentUser: null,
      setCurrentUser: vi.fn(),
      error: null,
      setError: vi.fn(),
      isLoading: false,
      setIsLoading: vi.fn(),
      authServiceUnavailable: false,
      setAuthServiceUnavailable: vi.fn(),
      modal: { login: { isOpen: false, open: vi.fn(), close: vi.fn(), toggle: vi.fn() } },
      modals: {},
      openModal: vi.fn(),
      closeModal: vi.fn(),
      users: [],
      setUsers: vi.fn(),
      usersLoaded: false,
      setUsersLoaded: vi.fn(),
      worlds: [],
      setWorlds: vi.fn(),
      worldsLoaded: false,
      setWorldsLoaded: vi.fn(),
      campaigns: [],
      setCampaigns: vi.fn(),
      campaignsLoaded: false,
      setCampaignsLoaded: vi.fn(),
      entities: [],
      setEntities: vi.fn(),
      entitiesLoadedFor: null,
      setEntitiesLoadedFor: vi.fn(),
      sessions: [],
      setSessions: vi.fn(),
      sessionsLoadedFor: null,
      setSessionsLoadedFor: vi.fn(),
      players: [],
      setPlayers: vi.fn(),
      playersLoadedFor: null,
      setPlayersLoadedFor: vi.fn(),
      storyArcs: [],
      setStoryArcs: vi.fn(),
      storyArcsLoadedFor: null,
      setStoryArcsLoadedFor: vi.fn(),
      storyArcEvents: [],
      setStoryArcEvents: vi.fn(),
      storyArcEventsLoadedFor: null,
      setStoryArcEventsLoadedFor: vi.fn(),
      allEvents: [],
      setAllEvents: vi.fn(),
      timeline: null,
      setTimeline: vi.fn(),
      timelineLoadedFor: null,
      setTimelineLoadedFor: vi.fn(),
      scenes: [],
      setScenes: vi.fn(),
      scenesLoadedFor: null,
      setScenesLoadedFor: vi.fn(),
      selectedIds: { worldId: null, campaignId: null, storyArcId: null, sessionId: null, eventId: "" },
      setSelectionField: vi.fn(),
      resetSelection: vi.fn(),
      selectedEntityType: "all",
      setSelectedEntityType: vi.fn()
    } as any);

    vi.mocked(useHomePageHandlers).mockReturnValue({
      handleLogin: vi.fn(),
      handleLogout: vi.fn(),
      handleAssignRole: vi.fn(),
      handleRevokeRole: vi.fn(),
      handleDeleteUser: vi.fn(),
      handleCreateUser: vi.fn(),
      handleCreateWorld: vi.fn(),
      handleCreateEntity: vi.fn(),
      handleCreateCampaign: vi.fn(),
      handleCreateSession: vi.fn(),
      handleAddPlayer: vi.fn(),
      handleCreateStoryArc: vi.fn(),
      handleAddEventToStoryArc: vi.fn(),
      handleAdvanceTimeline: vi.fn(),
      handleCreateScene: vi.fn()
    } as any);

    vi.mocked(useHomePageData).mockReturnValue(undefined);
    vi.mocked(useCustomEvent).mockReturnValue(undefined);
  });

  it("should provide context values", () => {
    const TestComponent = () => {
      const context = useHomePage();
      return (
        <div>
          <span data-testid="has-handlers">{context.handlers ? "true" : "false"}</span>
        </div>
      );
    };

    const { getByTestId } = render(
      <HomePageProvider>
        <TestComponent />
      </HomePageProvider>
    );

    expect(getByTestId("has-handlers").textContent).toBe("true");
  });

  it("should throw error when useHomePage is used outside provider", () => {
    const originalError = console.error;
    console.error = vi.fn(() => {});

    try {
      renderHook(() => useHomePage());
      expect.fail("Should have thrown");
    } catch (error) {
      expect((error as Error).message).toContain("useHomePage must be used within a HomePageProvider");
    } finally {
      console.error = originalError;
    }
  });

  it("wires OPEN_USER_MANAGEMENT_EVENT to update tab and selection", () => {
    const setActiveTab = vi.fn();
    const setActiveMode = vi.fn();
    const setSelectionField = vi.fn();

    // Override state for this test to use our spies
    vi.mocked(useHomePageState).mockReturnValueOnce({
      ...(vi.mocked(useHomePageState).mock.calls[0]?.[0] ?? {}),
      activeTab: null,
      setActiveTab,
      activeMode: null,
      setActiveMode,
      setSelectionField,
      currentUser: null,
      setCurrentUser: vi.fn(),
      planningSubTab: "World Entities",
      setPlanningSubTab: vi.fn(),
      campaignView: null,
      setCampaignView: vi.fn(),
      loginForm: { form: { name: "", password: "" }, setField: vi.fn(), resetForm: vi.fn() },
      userManagementForm: { form: { username: "", role: "" }, setField: vi.fn(), resetForm: vi.fn() },
      createUserForm: { form: { username: "", password: "", roles: [] }, setField: vi.fn(), resetForm: vi.fn() },
      worldForm: { form: { name: "", description: "" }, setField: vi.fn(), resetForm: vi.fn() },
      entityForm: { form: { name: "", summary: "", beginningTimestamp: "", endingTimestamp: "" }, setField: vi.fn(), resetForm: vi.fn() },
      campaignForm: { form: { name: "", summary: "" }, setField: vi.fn(), resetForm: vi.fn() },
      sessionForm: { form: { name: "" }, setField: vi.fn(), resetForm: vi.fn() },
      playerForm: { form: { username: "" }, setField: vi.fn(), resetForm: vi.fn() },
      storyArcForm: { form: { name: "", summary: "" }, setField: vi.fn(), resetForm: vi.fn() },
      sceneForm: { form: { name: "", summary: "", worldId: "" }, setField: vi.fn(), resetForm: vi.fn() },
      error: null,
      setError: vi.fn(),
      isLoading: false,
      setIsLoading: vi.fn(),
      authServiceUnavailable: false,
      setAuthServiceUnavailable: vi.fn(),
      modal: { login: { isOpen: false, open: vi.fn(), close: vi.fn(), toggle: vi.fn() } },
      modals: {},
      openModal: vi.fn(),
      closeModal: vi.fn(),
      users: [],
      setUsers: vi.fn(),
      usersLoaded: false,
      setUsersLoaded: vi.fn(),
      worlds: [],
      setWorlds: vi.fn(),
      worldsLoaded: false,
      setWorldsLoaded: vi.fn(),
      campaigns: [],
      setCampaigns: vi.fn(),
      campaignsLoaded: false,
      setCampaignsLoaded: vi.fn(),
      entities: [],
      setEntities: vi.fn(),
      entitiesLoadedFor: null,
      setEntitiesLoadedFor: vi.fn(),
      sessions: [],
      setSessions: vi.fn(),
      sessionsLoadedFor: null,
      setSessionsLoadedFor: vi.fn(),
      players: [],
      setPlayers: vi.fn(),
      playersLoadedFor: null,
      setPlayersLoadedFor: vi.fn(),
      storyArcs: [],
      setStoryArcs: vi.fn(),
      storyArcsLoadedFor: null,
      setStoryArcsLoadedFor: vi.fn(),
      storyArcEvents: [],
      setStoryArcEvents: vi.fn(),
      storyArcEventsLoadedFor: null,
      setStoryArcEventsLoadedFor: vi.fn(),
      allEvents: [],
      setAllEvents: vi.fn(),
      timeline: null,
      setTimeline: vi.fn(),
      timelineLoadedFor: null,
      setTimelineLoadedFor: vi.fn(),
      scenes: [],
      setScenes: vi.fn(),
      scenesLoadedFor: null,
      setScenesLoadedFor: vi.fn(),
      selectedIds: { worldId: null, campaignId: null, storyArcId: null, sessionId: null, eventId: "" },
      resetSelection: vi.fn(),
      selectedEntityType: "all",
      setSelectedEntityType: vi.fn()
    } as any);

    vi.mocked(useCustomEvent).mockImplementation(((eventName, handler) => {
      if (eventName === OPEN_USER_MANAGEMENT_EVENT) {
        // call the handler immediately to simulate event
        handler({} as CustomEvent);
      }
      return undefined as any;
    }) as any);

    render(
      <HomePageProvider>
        <div />
      </HomePageProvider>
    );

    expect(setActiveTab).toHaveBeenCalledWith("Users");
    expect(setActiveMode).toHaveBeenCalledWith(null);
    expect(setSelectionField).toHaveBeenCalledWith("worldId", null);

    // restore default mock to avoid affecting other tests
    vi.mocked(useCustomEvent).mockReturnValue(undefined);
  });

  it("wires OPEN_CREATE_WORLD_EVENT to open world modal when currentUser exists", () => {
    const setActiveTab = vi.fn();
    const setActiveMode = vi.fn();
    const openModal = vi.fn();

    vi.mocked(useHomePageState).mockReturnValueOnce({
      ...(vi.mocked(useHomePageState).mock.calls[0]?.[0] ?? {}),
      activeTab: null,
      setActiveTab,
      activeMode: null,
      setActiveMode,
      openModal,
      currentUser: { user: { username: "admin", roles: ["admin"] }, token: "token" },
      planningSubTab: "World Entities",
      setPlanningSubTab: vi.fn(),
      campaignView: null,
      setCampaignView: vi.fn(),
      loginForm: { form: { name: "", password: "" }, setField: vi.fn(), resetForm: vi.fn() },
      userManagementForm: { form: { username: "", role: "" }, setField: vi.fn(), resetForm: vi.fn() },
      createUserForm: { form: { username: "", password: "", roles: [] }, setField: vi.fn(), resetForm: vi.fn() },
      worldForm: { form: { name: "", description: "" }, setField: vi.fn(), resetForm: vi.fn() },
      entityForm: { form: { name: "", summary: "", beginningTimestamp: "", endingTimestamp: "" }, setField: vi.fn(), resetForm: vi.fn() },
      campaignForm: { form: { name: "", summary: "" }, setField: vi.fn(), resetForm: vi.fn() },
      sessionForm: { form: { name: "" }, setField: vi.fn(), resetForm: vi.fn() },
      playerForm: { form: { username: "" }, setField: vi.fn(), resetForm: vi.fn() },
      storyArcForm: { form: { name: "", summary: "" }, setField: vi.fn(), resetForm: vi.fn() },
      sceneForm: { form: { name: "", summary: "", worldId: "" }, setField: vi.fn(), resetForm: vi.fn() },
      error: null,
      setError: vi.fn(),
      isLoading: false,
      setIsLoading: vi.fn(),
      authServiceUnavailable: false,
      setAuthServiceUnavailable: vi.fn(),
      modal: { login: { isOpen: false, open: vi.fn(), close: vi.fn(), toggle: vi.fn() } },
      modals: {},
      closeModal: vi.fn(),
      users: [],
      setUsers: vi.fn(),
      usersLoaded: false,
      setUsersLoaded: vi.fn(),
      worlds: [],
      setWorlds: vi.fn(),
      worldsLoaded: false,
      setWorldsLoaded: vi.fn(),
      campaigns: [],
      setCampaigns: vi.fn(),
      campaignsLoaded: false,
      setCampaignsLoaded: vi.fn(),
      entities: [],
      setEntities: vi.fn(),
      entitiesLoadedFor: null,
      setEntitiesLoadedFor: vi.fn(),
      sessions: [],
      setSessions: vi.fn(),
      sessionsLoadedFor: null,
      setSessionsLoadedFor: vi.fn(),
      players: [],
      setPlayers: vi.fn(),
      playersLoadedFor: null,
      setPlayersLoadedFor: vi.fn(),
      storyArcs: [],
      setStoryArcs: vi.fn(),
      storyArcsLoadedFor: null,
      setStoryArcsLoadedFor: vi.fn(),
      storyArcEvents: [],
      setStoryArcEvents: vi.fn(),
      storyArcEventsLoadedFor: null,
      setStoryArcEventsLoadedFor: vi.fn(),
      allEvents: [],
      setAllEvents: vi.fn(),
      timeline: null,
      setTimeline: vi.fn(),
      timelineLoadedFor: null,
      setTimelineLoadedFor: vi.fn(),
      scenes: [],
      setScenes: vi.fn(),
      scenesLoadedFor: null,
      setScenesLoadedFor: vi.fn(),
      selectedIds: { worldId: null, campaignId: null, storyArcId: null, sessionId: null, eventId: "" },
      setSelectionField: vi.fn(),
      resetSelection: vi.fn(),
      selectedEntityType: "all",
      setSelectedEntityType: vi.fn()
    } as any);

    vi.mocked(useCustomEvent).mockImplementation(((eventName, handler) => {
      if (eventName === OPEN_CREATE_WORLD_EVENT) {
        handler({} as CustomEvent);
      }
      return undefined as any;
    }) as any);

    render(
      <HomePageProvider>
        <div />
      </HomePageProvider>
    );

    expect(setActiveTab).toHaveBeenCalledWith("World");
    expect(setActiveMode).toHaveBeenCalledWith("plan");
    expect(openModal).toHaveBeenCalledWith("world");

    vi.mocked(useCustomEvent).mockReturnValue(undefined);
  });
});
