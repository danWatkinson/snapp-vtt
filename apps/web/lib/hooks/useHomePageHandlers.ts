import type { FormEvent } from "react";
import { AUTH_EVENT } from "../authEvents";
import { AUTH_USERNAME_KEY } from "../authStorage";
import {
  assignRoles,
  login,
  type LoginResponse,
  revokeRole,
  deleteUser,
  createUser
} from "../authClient";
import {
  createWorld,
  fetchWorlds,
  createWorldEntity
} from "../worldClient";
import {
  createCampaign,
  createSession,
  addPlayerToCampaign,
  createStoryArc,
  addEventToStoryArc,
  advanceTimeline,
  createScene
} from "../campaignClient";
import { withAsyncAction } from "../useAsyncAction";
import type { useFormState } from "../useFormState";
import type { useSelection } from "../useSelection";

interface UseHomePageHandlersProps {
  // Form states
  loginForm: ReturnType<typeof useFormState<{ name: string; password: string }>>;
  userManagementForm: ReturnType<typeof useFormState<{ username: string; role: string }>>;
  createUserForm: ReturnType<typeof useFormState<{ username: string; password: string; roles: string[] }>>;
  worldForm: ReturnType<typeof useFormState<{ name: string; description: string }>>;
  entityForm: ReturnType<typeof useFormState<{ name: string; summary: string; beginningTimestamp: string; endingTimestamp: string }>>;
  campaignForm: ReturnType<typeof useFormState<{ name: string; summary: string }>>;
  sessionForm: ReturnType<typeof useFormState<{ name: string }>>;
  playerForm: ReturnType<typeof useFormState<{ username: string }>>;
  storyArcForm: ReturnType<typeof useFormState<{ name: string; summary: string }>>;
  sceneForm: ReturnType<typeof useFormState<{ name: string; summary: string; worldId: string }>>;
  
  // State setters
  setIsLoading: (loading: boolean) => void;
  setStatus: (status: string | null) => void;
  setError: (error: string | null) => void;
  setAuthServiceUnavailable: (unavailable: boolean) => void;
  setCurrentUser: (user: LoginResponse | null) => void;
  setActiveTab: (tab: "World" | "Campaigns" | "Sessions" | "Users" | null) => void;
  setActiveMode: (mode: "plan" | "play" | null) => void;
  setPlanningSubTab: (tab: "World Entities" | "Campaigns" | "Story Arcs" | "Users") => void;
  setSelectedEntityType: (type: "all" | "location" | "creature" | "faction" | "event") => void;
  
  // Data setters
  setWorlds: React.Dispatch<React.SetStateAction<any[]>>;
  setCampaigns: React.Dispatch<React.SetStateAction<any[]>>;
  setEntities: React.Dispatch<React.SetStateAction<any[]>>;
  setSessions: React.Dispatch<React.SetStateAction<any[]>>;
  setPlayers: React.Dispatch<React.SetStateAction<string[]>>;
  setStoryArcs: React.Dispatch<React.SetStateAction<any[]>>;
  setStoryArcEvents: React.Dispatch<React.SetStateAction<string[]>>;
  setScenes: React.Dispatch<React.SetStateAction<any[]>>;
  setTimeline: (timeline: any) => void;
  setUsersLoaded: (loaded: boolean) => void;
  setEntitiesLoadedFor: (key: string | null) => void;
  setSessionsLoadedFor: (key: string | null) => void;
  setPlayersLoadedFor: (key: string | null) => void;
  setStoryArcsLoadedFor: (key: string | null) => void;
  setStoryArcEventsLoadedFor: (key: string | null) => void;
  setScenesLoadedFor: (key: string | null) => void;
  
  // Selection
  selectedIds: {
    worldId: string | null;
    campaignId: string | null;
    storyArcId: string | null;
    sessionId: string | null;
    eventId: string;
  };
  setSelectionField: <K extends "worldId" | "campaignId" | "storyArcId" | "sessionId" | "eventId">(field: K, value: any) => void;
  resetSelection: () => void;
  
  // Other state
  currentUser: LoginResponse | null;
  selectedEntityType: "all" | "location" | "creature" | "faction" | "event";
  
  // Modal control
  closeModal: (key: string) => void;
}

export function useHomePageHandlers(props: UseHomePageHandlersProps) {
  const {
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
    setIsLoading,
    setStatus,
    setError,
    setAuthServiceUnavailable,
    setCurrentUser,
    setActiveTab,
    setActiveMode,
    setPlanningSubTab,
    setSelectedEntityType,
    setWorlds,
    setCampaigns,
    setEntities,
    setSessions,
    setPlayers,
    setStoryArcs,
    setStoryArcEvents,
    setScenes,
    setTimeline,
    setUsersLoaded,
    setEntitiesLoadedFor,
    setSessionsLoadedFor,
    setPlayersLoadedFor,
    setStoryArcsLoadedFor,
    setStoryArcEventsLoadedFor,
    setScenesLoadedFor,
    selectedIds,
    setSelectionField,
    resetSelection,
    currentUser,
    selectedEntityType,
    closeModal
  } = props;

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setAuthServiceUnavailable(false);
    try {
      const result = await withAsyncAction(
        () => login(loginForm.form.name, loginForm.form.password),
        {
          setIsLoading,
          setStatus,
          setError,
          loadingMessage: "Logging in…",
          onSuccess: (result) => {
            setCurrentUser(result);
            loginForm.setField("password", "");
            if (typeof window !== "undefined") {
              window.localStorage.setItem(AUTH_USERNAME_KEY, result.user.username);
              window.dispatchEvent(
                new CustomEvent(AUTH_EVENT, {
                  detail: { username: result.user.username }
                })
              );
            }
            closeModal("login");
          },
          onError: (error) => {
            const isNetworkError = (error as any).isNetworkError || 
              (error.name === "TypeError" && error.message.includes("Failed to fetch"));
            
            if (isNetworkError) {
              setAuthServiceUnavailable(true);
              // eslint-disable-next-line no-console
              console.error("Auth service connection error:", error);
              setError("Unable to connect to the authentication service. Please check your connection. If using self-signed certificates, you may need to accept the certificate in your browser.");
            } else {
              setAuthServiceUnavailable(false);
            }
          },
          successMessage: (result) => `Logged in as ${result.user.username}`
        }
      );
    } catch (err) {
      // Error already handled by withAsyncAction
    }
  }

  async function handleAssignRole(e: FormEvent) {
    e.preventDefault();
    if (!currentUser) {
      setError("You must log in as an admin first");
      return;
    }
    try {
      await withAsyncAction(
        () => assignRoles(currentUser.token, userManagementForm.form.username, [userManagementForm.form.role]),
        {
          setIsLoading,
          setStatus,
          setError,
          loadingMessage: "Assigning role…",
          onSuccess: () => {
            setUsersLoaded(false);
          },
          successMessage: (updated) => `User ${updated.user.username} now has roles: ${updated.user.roles.join(", ")}`
        }
      );
    } catch (err) {
      // Error already handled by withAsyncAction
    }
  }

  async function handleRevokeRole(username: string, role: string) {
    if (!currentUser) return;
    try {
      await withAsyncAction(
        () => revokeRole(currentUser.token, username, role),
        {
          setIsLoading,
          setStatus,
          setError,
          loadingMessage: `Revoking ${role} from ${username}…`,
          onSuccess: () => {
            setUsersLoaded(false);
          },
          successMessage: () => `Role '${role}' revoked from ${username}`
        }
      );
    } catch (err) {
      // Error already handled by withAsyncAction
    }
  }

  async function handleDeleteUser(username: string) {
    if (!currentUser) return;
    if (!confirm(`Are you sure you want to delete user '${username}'?`)) {
      return;
    }
    try {
      await withAsyncAction(
        () => deleteUser(currentUser.token, username),
        {
          setIsLoading,
          setStatus,
          setError,
          loadingMessage: `Deleting user ${username}…`,
          onSuccess: () => {
            setUsersLoaded(false);
          },
          successMessage: () => `User '${username}' deleted`
        }
      );
    } catch (err) {
      // Error already handled by withAsyncAction
    }
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    try {
      await withAsyncAction(
        () => createUser(currentUser.token, createUserForm.form.username, createUserForm.form.password, createUserForm.form.roles),
        {
          setIsLoading,
          setStatus,
          setError,
          loadingMessage: "Creating user…",
          onSuccess: () => {
            createUserForm.resetForm();
            closeModal("createUser");
            setUsersLoaded(false);
          },
          successMessage: () => `User '${createUserForm.form.username}' created`
        }
      );
    } catch (err) {
      // Error already handled by withAsyncAction
    }
  }

  async function handleCreateWorld(e: FormEvent) {
    e.preventDefault();
    try {
      await withAsyncAction(
        () => createWorld(worldForm.form.name, worldForm.form.description, currentUser?.token),
        {
          setIsLoading,
          setStatus,
          setError,
          loadingMessage: "Creating world…",
          onSuccess: (world) => {
            setWorlds((prev) => [...prev, world]);
            worldForm.resetForm();
            closeModal("world");
          },
          onError: async (err) => {
            if (err.message.includes("already exists")) {
              try {
                const existing = await fetchWorlds();
                setWorlds(existing);
              } catch (reloadErr) {
                // Ignore reload errors
              }
            }
          },
          successMessage: (world) => `World '${world.name}' created`
        }
      );
    } catch (err) {
      // Error already handled by withAsyncAction
    }
  }

  async function handleCreateEntity(e: FormEvent) {
    e.preventDefault();
    if (!selectedIds.worldId || selectedEntityType === "all") return;
    try {
      const beginningTimestamp =
        selectedEntityType === "event" && entityForm.form.beginningTimestamp
          ? new Date(entityForm.form.beginningTimestamp).getTime()
          : undefined;
      const endingTimestamp =
        selectedEntityType === "event" && entityForm.form.endingTimestamp
          ? new Date(entityForm.form.endingTimestamp).getTime()
          : undefined;
      await withAsyncAction(
        () => createWorldEntity(
          selectedIds.worldId!,
          selectedEntityType,
          entityForm.form.name,
          entityForm.form.summary,
          beginningTimestamp,
          endingTimestamp,
          currentUser?.token
        ),
        {
          setIsLoading,
          setStatus,
          setError,
          loadingMessage: `Creating ${selectedEntityType}…`,
          onSuccess: (entity) => {
            setEntities((prev) => [...prev, entity]);
            entityForm.resetForm();
            closeModal("entity");
            setEntitiesLoadedFor(null);
          },
          successMessage: (entity) => `${selectedEntityType.charAt(0).toUpperCase() + selectedEntityType.slice(1)} '${entity.name}' created`
        }
      );
    } catch (err) {
      // Error already handled by withAsyncAction
    }
  }

  async function handleCreateCampaign(e: FormEvent) {
    e.preventDefault();
    try {
      await withAsyncAction(
        () => createCampaign(campaignForm.form.name, campaignForm.form.summary, currentUser?.token),
        {
          setIsLoading,
          setStatus,
          setError,
          loadingMessage: "Creating campaign…",
          onSuccess: (camp) => {
            setCampaigns((prev) => [...prev, camp]);
            campaignForm.resetForm();
            closeModal("campaign");
          },
          successMessage: (camp) => `Campaign '${camp.name}' created`
        }
      );
    } catch (err) {
      // Error already handled by withAsyncAction
    }
  }

  async function handleCreateSession(e: FormEvent) {
    e.preventDefault();
    if (!selectedIds.campaignId) return;
    try {
      await withAsyncAction(
        () => createSession(selectedIds.campaignId!, sessionForm.form.name, currentUser?.token),
        {
          setIsLoading,
          setStatus,
          setError,
          loadingMessage: "Creating session…",
          onSuccess: (session) => {
            setSessions((prev) => [...prev, session]);
            sessionForm.resetForm();
            closeModal("session");
            setSessionsLoadedFor(null);
          },
          successMessage: (session) => `Session '${session.name}' created`
        }
      );
    } catch (err) {
      // Error already handled by withAsyncAction
    }
  }

  async function handleAddPlayer(e: FormEvent) {
    e.preventDefault();
    if (!selectedIds.campaignId) return;
    try {
      await withAsyncAction(
        () => addPlayerToCampaign(selectedIds.campaignId!, playerForm.form.username, currentUser?.token),
        {
          setIsLoading,
          setStatus,
          setError,
          loadingMessage: "Adding player…",
          onSuccess: () => {
            setPlayers((prev) => [...prev, playerForm.form.username]);
            playerForm.resetForm();
            closeModal("player");
            setPlayersLoadedFor(null);
            setStoryArcsLoadedFor(null);
          },
          successMessage: () => `Player '${playerForm.form.username}' added`
        }
      );
    } catch (err) {
      // Error already handled by withAsyncAction
    }
  }

  async function handleCreateStoryArc(e: FormEvent) {
    e.preventDefault();
    if (!selectedIds.campaignId) return;
    try {
      await withAsyncAction(
        () => createStoryArc(selectedIds.campaignId!, storyArcForm.form.name, storyArcForm.form.summary, currentUser?.token),
        {
          setIsLoading,
          setStatus,
          setError,
          loadingMessage: "Creating story arc…",
          onSuccess: (storyArc) => {
            setStoryArcs((prev) => [...prev, storyArc]);
            storyArcForm.resetForm();
            closeModal("storyArc");
            setStoryArcsLoadedFor(null);
          },
          successMessage: (storyArc) => `Story arc '${storyArc.name}' created`
        }
      );
    } catch (err) {
      // Error already handled by withAsyncAction
    }
  }

  async function handleAddEventToStoryArc(e: FormEvent) {
    e.preventDefault();
    if (!selectedIds.storyArcId || !selectedIds.eventId) return;
    try {
      await withAsyncAction(
        () => addEventToStoryArc(selectedIds.storyArcId!, selectedIds.eventId, currentUser?.token),
        {
          setIsLoading,
          setStatus,
          setError,
          loadingMessage: "Adding event to story arc…",
          onSuccess: () => {
            setStoryArcEvents((prev) => [...prev, selectedIds.eventId]);
            setSelectionField("eventId", "");
            closeModal("storyArcEvent");
            setStoryArcEventsLoadedFor(null);
          },
          successMessage: () => "Event added to story arc"
        }
      );
    } catch (err) {
      // Error already handled by withAsyncAction
    }
  }

  async function handleAdvanceTimeline(
    amount: number,
    unit: "second" | "minute" | "hour" | "day" | "week" | "month" | "year"
  ) {
    if (!selectedIds.campaignId) return;
    try {
      await withAsyncAction(
        () => advanceTimeline(selectedIds.campaignId!, amount, unit, currentUser?.token),
        {
          setIsLoading,
          setStatus,
          setError,
          loadingMessage: `Advancing timeline by ${amount} ${unit}…`,
          onSuccess: (updated) => {
            setTimeline(updated);
            setStatus(`Timeline advanced by ${amount} ${unit}`);
            setTimeout(() => setStatus(null), 2000);
          }
        }
      );
    } catch (err) {
      // Error already handled by withAsyncAction
    }
  }

  async function handleCreateScene(e: FormEvent) {
    e.preventDefault();
    if (!selectedIds.sessionId || !sceneForm.form.worldId) {
      setError("Session and World are required");
      return;
    }
    try {
      await withAsyncAction(
        () => createScene(selectedIds.sessionId!, sceneForm.form.name, sceneForm.form.summary, sceneForm.form.worldId, [], currentUser?.token),
        {
          setIsLoading,
          setStatus,
          setError,
          loadingMessage: "Creating scene…",
          onSuccess: (scene) => {
            setScenes((prev) => [...prev, scene]);
            sceneForm.resetForm();
            closeModal("scene");
            setScenesLoadedFor(null);
          },
          successMessage: (scene) => `Scene '${scene.name}' created`
        }
      );
    } catch (err) {
      // Error already handled by withAsyncAction
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    loginForm.resetForm({ name: "admin", password: "" });
    setActiveTab(null);
    setActiveMode(null);
    setPlanningSubTab("World Entities");
    resetSelection();
    setSelectedEntityType("all");
    setStatus(null);
    setError(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_USERNAME_KEY);
      window.dispatchEvent(
        new CustomEvent(AUTH_EVENT, { detail: { username: null } })
      );
    }
  }

  return {
    handleLogin,
    handleAssignRole,
    handleRevokeRole,
    handleDeleteUser,
    handleCreateUser,
    handleCreateWorld,
    handleCreateEntity,
    handleCreateCampaign,
    handleCreateSession,
    handleAddPlayer,
    handleCreateStoryArc,
    handleAddEventToStoryArc,
    handleAdvanceTimeline,
    handleCreateScene,
    handleLogout
  };
}
