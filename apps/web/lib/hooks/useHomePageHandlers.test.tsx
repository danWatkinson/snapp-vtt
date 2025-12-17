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

  it("should assign role when currentUser is present", async () => {
    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" } as any;

    const { result } = renderHook(() => useHomePageHandlers(props));
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleAssignRole(mockEvent);
    });

    expect(authClient.assignRoles).toHaveBeenCalledWith("token", "user1", ["gm"]);
    expect(props.setUsersLoaded).toHaveBeenCalledWith(false);
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

  it("should not create user when currentUser is missing", async () => {
    const props = createMockProps();
    props.currentUser = null;

    const { result } = renderHook(() => useHomePageHandlers(props));
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleCreateUser(mockEvent);
    });

    expect(authClient.createUser).not.toHaveBeenCalled();
  });

  it("should revoke role when currentUser is present", async () => {
    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" } as any;

    const { result } = renderHook(() => useHomePageHandlers(props));

    await act(async () => {
      await result.current.handleRevokeRole("user1", "gm");
    });

    expect(authClient.revokeRole).toHaveBeenCalledWith("token", "user1", "gm");
    expect(props.setUsersLoaded).toHaveBeenCalledWith(false);
  });

  it("should not revoke role when currentUser is missing", async () => {
    const props = createMockProps();
    props.currentUser = null;

    const { result } = renderHook(() => useHomePageHandlers(props));

    await act(async () => {
      await result.current.handleRevokeRole("user1", "gm");
    });

    expect(authClient.revokeRole).not.toHaveBeenCalled();
  });

  it("should not delete user when currentUser is missing", async () => {
    const props = createMockProps();
    props.currentUser = null;

    const { result } = renderHook(() => useHomePageHandlers(props));

    await act(async () => {
      await result.current.handleDeleteUser("user1");
    });

    expect(authClient.deleteUser).not.toHaveBeenCalled();
  });

  it("should not delete user when confirmation is rejected", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" } as any;

    const { result } = renderHook(() => useHomePageHandlers(props));

    await act(async () => {
      await result.current.handleDeleteUser("user1");
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(authClient.deleteUser).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it("should delete user and reset usersLoaded when confirmed", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" } as any;

    const { result } = renderHook(() => useHomePageHandlers(props));

    await act(async () => {
      await result.current.handleDeleteUser("user1");
    });

    expect(authClient.deleteUser).toHaveBeenCalledWith("token", "user1");
    expect(props.setUsersLoaded).toHaveBeenCalledWith(false);

    confirmSpy.mockRestore();
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

  it("should handle login network error by marking auth service unavailable", async () => {
    const networkError = new Error("Failed to fetch") as any;
    networkError.name = "TypeError";
    vi.mocked(authClient.login).mockRejectedValue(networkError);

    const props = createMockProps();
    const { result } = renderHook(() => useHomePageHandlers(props));
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleLogin(mockEvent);
    });

    expect(props.setAuthServiceUnavailable).toHaveBeenCalledWith(true);
    expect(props.setError).toHaveBeenCalledWith(
      "Unable to connect to the authentication service. Please check your connection. If using self-signed certificates, you may need to accept the certificate in your browser."
    );
  });

  it("should clear authServiceUnavailable on non-network login error", async () => {
    const err = new Error("Boom");
    vi.mocked(authClient.login).mockRejectedValue(err);

    const props = createMockProps();
    const { result } = renderHook(() => useHomePageHandlers(props));
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleLogin(mockEvent);
    });

    expect(props.setAuthServiceUnavailable).toHaveBeenCalledWith(false);
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

  it("should not reload worlds when createWorld error is not duplicate", async () => {
    const error = new Error("Boom");
    vi.mocked(worldClient.createWorld).mockRejectedValue(error as any);
    const fetchWorldsSpy = vi.mocked(worldClient.fetchWorlds);

    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: [] }, token: "token" } as any;

    const { result } = renderHook(() => useHomePageHandlers(props));
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleCreateWorld(mockEvent);
    });

    expect(worldClient.createWorld).toHaveBeenCalled();
    expect(fetchWorldsSpy).not.toHaveBeenCalled();
  });

  it("should reload worlds when createWorld reports duplicate name", async () => {
    const duplicateError = new Error("World name already exists");
    vi.mocked(worldClient.createWorld).mockRejectedValue(duplicateError as any);
    const existingWorlds = [{ id: "1", name: "Existing", description: "Desc" }];
    vi.mocked(worldClient.fetchWorlds).mockResolvedValue(existingWorlds as any);

    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: [] }, token: "token" } as any;

    const { result } = renderHook(() => useHomePageHandlers(props));
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleCreateWorld(mockEvent);
    });

    expect(worldClient.createWorld).toHaveBeenCalled();
    expect(worldClient.fetchWorlds).toHaveBeenCalled();
    expect(props.setWorlds).toHaveBeenCalledWith(existingWorlds as any);
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

  it("should create entity when world and type are set", async () => {
    const mockEntity = { id: "e1", name: "Entity" };
    vi.mocked(worldClient.createWorldEntity).mockResolvedValue(mockEntity as any);

    const props = createMockProps();
    // Set up selection and entity form for a non-"all" type; mutate form fields directly
    props.selectedIds.worldId = "w1";
    props.selectedEntityType = "event";
    props.entityForm.form.beginningTimestamp = "2024-01-01T00:00:00Z" as any;
    props.entityForm.form.endingTimestamp = "2024-01-02T00:00:00Z" as any;

    const { result } = renderHook(() => useHomePageHandlers(props));
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleCreateEntity(mockEvent);
    });

    expect(worldClient.createWorldEntity).toHaveBeenCalledWith(
      "w1",
      "event",
      "Entity",
      "Sum",
      expect.any(Number),
      expect.any(Number),
      undefined
    );
    expect(props.setEntities).toHaveBeenCalled();
    expect(props.setEntitiesLoadedFor).toHaveBeenCalledWith(null);
  });

  it("should create non-event entity with undefined timestamps", async () => {
    const mockEntity = { id: "e2", name: "Entity" };
    vi.mocked(worldClient.createWorldEntity).mockResolvedValue(mockEntity as any);

    const props = createMockProps();
    props.selectedIds.worldId = "w1";
    props.selectedEntityType = "location";

    const { result } = renderHook(() => useHomePageHandlers(props));
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleCreateEntity(mockEvent);
    });

    expect(worldClient.createWorldEntity).toHaveBeenCalledWith(
      "w1",
      "location",
      "Entity",
      "Sum",
      undefined,
      undefined,
      undefined
    );
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

  it("should not create session when no campaign is selected", async () => {
    const props = createMockProps();
    // campaignId remains null
    const { result } = renderHook(() => useHomePageHandlers(props));
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleCreateSession(mockEvent);
    });

    expect(campaignClient.createSession).not.toHaveBeenCalled();
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

  it("should not add player when no campaign is selected", async () => {
    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" } as any;
    // campaignId remains null

    const { result } = renderHook(() => useHomePageHandlers(props));
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleAddPlayer(mockEvent);
    });

    expect(campaignClient.addPlayerToCampaign).not.toHaveBeenCalled();
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

  it("should not create story arc when no campaign is selected", async () => {
    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" } as any;
    // campaignId remains null

    const { result } = renderHook(() => useHomePageHandlers(props));
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleCreateStoryArc(mockEvent);
    });

    expect(campaignClient.createStoryArc).not.toHaveBeenCalled();
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

  it("should not add event to story arc when selections are missing", async () => {
    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" } as any;
    // storyArcId and eventId remain unset/empty

    const { result } = renderHook(() => useHomePageHandlers(props));
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await result.current.handleAddEventToStoryArc(mockEvent);
    });

    expect(campaignClient.addEventToStoryArc).not.toHaveBeenCalled();
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

  it("should not advance timeline when no campaign is selected", async () => {
    const props = createMockProps();
    props.currentUser = { user: { username: "admin", roles: ["admin"] }, token: "token" } as any;
    // campaignId remains null

    const { result } = renderHook(() => useHomePageHandlers(props));

    await act(async () => {
      await result.current.handleAdvanceTimeline(1, "day");
    });

    expect(campaignClient.advanceTimeline).not.toHaveBeenCalled();
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
