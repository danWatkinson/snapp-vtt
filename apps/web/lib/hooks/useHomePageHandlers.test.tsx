// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHomePageHandlers } from "./useHomePageHandlers";
import { useFormState } from "./useFormState";
import { useSelection } from "./useSelection";
import * as authClient from "../clients/authClient";
import * as worldClient from "../clients/worldClient";
import * as campaignClient from "../clients/campaignClient";

// Mock the client functions
vi.mock("../clients/authClient");
vi.mock("../clients/worldClient");
vi.mock("../clients/campaignClient");

describe("useHomePageHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockProps = () => {
    const loginForm = renderHook(() => useFormState({ name: "admin", password: "password" })).result.current;
    const worldForm = renderHook(() => useFormState({ name: "World", description: "Desc" })).result.current;
    const campaignForm = renderHook(() => useFormState({ name: "Campaign", summary: "Sum" })).result.current;
    const entityForm = renderHook(() =>
      useFormState({ name: "Entity", summary: "Sum", beginningTimestamp: "", endingTimestamp: "" })
    ).result.current;
    const sessionForm = renderHook(() => useFormState({ name: "Session" })).result.current;
    const playerForm = renderHook(() => useFormState({ username: "player1" })).result.current;
    const storyArcForm = renderHook(() => useFormState({ name: "Arc", summary: "Sum" })).result.current;
    const sceneForm = renderHook(() => useFormState({ name: "Scene", summary: "Sum", worldId: "w1" })).result.current;
    const userManagementForm = renderHook(() => useFormState({ username: "user1", role: "gm" })).result.current;
    const createUserForm = renderHook(() => useFormState({ username: "newuser", password: "pass", roles: [] })).result.current;
    const selection = renderHook(() =>
      useSelection({ worldId: null, campaignId: null, storyArcId: null, sessionId: null, eventId: "" })
    ).result.current;

    const resetSelectionSpy = vi.fn(() => selection.reset());

    return {
      loginForm,
      userManagementForm,
      createUserForm,
      worldForm,
      entityForm,
      campaignForm,
      sessionForm,
      playerForm,
      storyArcForm,
      sceneForm,
      setIsLoading: vi.fn(),
      setError: vi.fn(),
      setAuthServiceUnavailable: vi.fn(),
      setCurrentUser: vi.fn(),
      setActiveTab: vi.fn(),
      setActiveMode: vi.fn(),
      setPlanningSubTab: vi.fn(),
      setSelectedEntityType: vi.fn(),
      setWorlds: vi.fn(),
      setCampaigns: vi.fn(),
      setEntities: vi.fn(),
      setSessions: vi.fn(),
      setPlayers: vi.fn(),
      setStoryArcs: vi.fn(),
      setStoryArcEvents: vi.fn(),
      setScenes: vi.fn(),
      setTimeline: vi.fn(),
      setUsersLoaded: vi.fn(),
      setEntitiesLoadedFor: vi.fn(),
      setSessionsLoadedFor: vi.fn(),
      setPlayersLoadedFor: vi.fn(),
      setStoryArcsLoadedFor: vi.fn(),
      setStoryArcEventsLoadedFor: vi.fn(),
      setScenesLoadedFor: vi.fn(),
      selectedIds: selection.selection,
      setSelectionField: selection.setField,
      resetSelection: resetSelectionSpy,
      currentUser: null,
      selectedEntityType: "all" as const,
      closeModal: vi.fn()
    };
  };

  it("should return handler functions", () => {
    const props = createMockProps();
    const { result } = renderHook(() => useHomePageHandlers(props));

    expect(typeof result.current.handleLogin).toBe("function");
    expect(typeof result.current.handleLogout).toBe("function");
    expect(typeof result.current.handleCreateWorld).toBe("function");
    expect(typeof result.current.handleCreateEntity).toBe("function");
    expect(typeof result.current.handleCreateCampaign).toBe("function");
  });

  it("should handle login", async () => {
    const mockLoginResponse = {
      user: { username: "admin", roles: [] },
      token: "test-token"
    };
    vi.mocked(authClient.login).mockResolvedValue(mockLoginResponse);

    const props = createMockProps();
    const { result } = renderHook(() => useHomePageHandlers(props));

    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleLogin(mockEvent);
    });

    expect(authClient.login).toHaveBeenCalledWith("admin", "password");
    expect(props.setCurrentUser).toHaveBeenCalledWith(mockLoginResponse);
    expect(props.closeModal).toHaveBeenCalledWith("login");
  });

  it("should require admin before assigning role", async () => {
    const props = createMockProps();
    props.currentUser = null;

    const { result } = renderHook(() => useHomePageHandlers(props));
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleAssignRole(mockEvent);
    });

    expect(props.setError).toHaveBeenCalledWith("You must log in as an admin first");
    expect(authClient.assignRoles).not.toHaveBeenCalled();
  });

  it("should handle create user", async () => {
    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" } as any;

    const { result } = renderHook(() => useHomePageHandlers(props));
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleCreateUser(mockEvent);
    });

    expect(authClient.createUser).toHaveBeenCalledWith(
      "token",
      props.createUserForm.form.username,
      props.createUserForm.form.password,
      props.createUserForm.form.roles
    );
    expect(props.closeModal).toHaveBeenCalledWith("createUser");
    expect(props.setUsersLoaded).toHaveBeenCalledWith(false);
  });

  it("should handle logout", () => {
    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: [] }, token: "token" };

    const { result } = renderHook(() => useHomePageHandlers(props));

    act(() => {
      result.current.handleLogout();
    });

    expect(props.setCurrentUser).toHaveBeenCalledWith(null);
    expect(props.resetSelection).toHaveBeenCalled();
  });

  it("should handle create world", async () => {
    const mockWorld = { id: "1", name: "World", description: "Desc" };
    vi.mocked(worldClient.createWorld).mockResolvedValue(mockWorld as any);

    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: [] }, token: "token" } as any;

    const { result } = renderHook(() => useHomePageHandlers(props));

    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleCreateWorld(mockEvent);
    });

    expect(worldClient.createWorld).toHaveBeenCalledWith("World", "Desc", "token");
    expect(props.setWorlds).toHaveBeenCalled();
  });

  it("should handle create campaign", async () => {
    const mockCampaign = { id: "1", name: "Campaign", summary: "Sum", playerIds: [], currentMoment: 0 };
    vi.mocked(campaignClient.createCampaign).mockResolvedValue(mockCampaign as any);

    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: [] }, token: "token" } as any;

    const { result } = renderHook(() => useHomePageHandlers(props));

    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleCreateCampaign(mockEvent);
    });

    expect(campaignClient.createCampaign).toHaveBeenCalledWith("Campaign", "Sum", "token");
    expect(props.setCampaigns).toHaveBeenCalled();
  });

  it("should early-return in handleCreateEntity when no worldId", async () => {
    const props = createMockProps();
    const { result } = renderHook(() => useHomePageHandlers(props));

    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleCreateEntity(mockEvent);
    });

    expect(worldClient.createWorldEntity).not.toHaveBeenCalled();
  });

  it("should set error in handleCreateScene when session or world missing", async () => {
    const props = createMockProps();
    // Clear worldId to trigger guard
    props.sceneForm.form.worldId = "" as any;

    const { result } = renderHook(() => useHomePageHandlers(props));

    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleCreateScene(mockEvent);
    });

    expect(props.setError).toHaveBeenCalledWith("Session and World are required");
  });

  it("should handle add player to campaign", async () => {
    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" } as any;
    // Directly set selectedIds to simulate a selected campaign
    props.selectedIds.campaignId = "c1";

    const { result } = renderHook(() => useHomePageHandlers(props));
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleAddPlayer(mockEvent);
    });

    expect(campaignClient.addPlayerToCampaign).toHaveBeenCalledWith("c1", "player1", "token");
    expect(props.setPlayers).toHaveBeenCalled();
    expect(props.setPlayersLoadedFor).toHaveBeenCalledWith(null);
    expect(props.setStoryArcsLoadedFor).toHaveBeenCalledWith(null);
  });

  it("should handle create story arc", async () => {
    const mockArc = { id: "1", campaignId: "c1", name: "Arc", summary: "Sum", eventIds: [] };
    vi.mocked(campaignClient.createStoryArc).mockResolvedValue(mockArc as any);

    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" } as any;
    // Directly set selectedIds to simulate a selected campaign
    props.selectedIds.campaignId = "c1";

    const { result } = renderHook(() => useHomePageHandlers(props));
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleCreateStoryArc(mockEvent);
    });

    expect(campaignClient.createStoryArc).toHaveBeenCalledWith("c1", "Arc", "Sum", "token");
    expect(props.setStoryArcs).toHaveBeenCalled();
    expect(props.setStoryArcsLoadedFor).toHaveBeenCalledWith(null);
  });

  it("should handle add event to story arc", async () => {
    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" } as any;
    // Directly set selectedIds to simulate selections
    props.selectedIds.storyArcId = "sa1";
    props.selectedIds.eventId = "e1";

    const { result } = renderHook(() => useHomePageHandlers(props));
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleAddEventToStoryArc(mockEvent);
    });

    expect(campaignClient.addEventToStoryArc).toHaveBeenCalledWith("sa1", "e1", "token");
    expect(props.setStoryArcEvents).toHaveBeenCalled();
    expect(props.setStoryArcEventsLoadedFor).toHaveBeenCalledWith(null);
  });

  it("should handle advance timeline", async () => {
    const mockTimeline = { currentMoment: 123 };
    vi.mocked(campaignClient.advanceTimeline).mockResolvedValue(mockTimeline as any);

    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" } as any;
    // Directly set selectedIds to simulate a selected campaign
    props.selectedIds.campaignId = "c1";

    const { result } = renderHook(() => useHomePageHandlers(props));

    await act(async () => {
      await result.current.handleAdvanceTimeline(1, "day");
    });

    expect(campaignClient.advanceTimeline).toHaveBeenCalledWith("c1", 1, "day", "token");
    expect(props.setTimeline).toHaveBeenCalledWith(mockTimeline as any);
  });

  it("should handle create scene (success path)", async () => {
    const mockScene = { id: "1", sessionId: "s1", name: "Scene", summary: "Sum", worldId: "w1", entityIds: [] };
    vi.mocked(campaignClient.createScene).mockResolvedValue(mockScene as any);

    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" } as any;
    // Directly set selectedIds to simulate a selected session
    props.selectedIds.sessionId = "s1";

    const { result } = renderHook(() => useHomePageHandlers(props));
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleCreateScene(mockEvent);
    });

    expect(campaignClient.createScene).toHaveBeenCalledWith("s1", "Scene", "Sum", "w1", [], "token");
    expect(props.setScenes).toHaveBeenCalled();
    expect(props.setScenesLoadedFor).toHaveBeenCalledWith(null);
  });
});
