import type { FormEvent } from "react";
import { AUTH_EVENT } from "../auth/authEvents";
import { AUTH_USERNAME_KEY } from "../auth/authStorage";
import {
  assignRoles,
  login,
  type LoginResponse,
  revokeRole,
  deleteUser,
  createUser
} from "../clients/authClient";
import {
  createWorld,
  fetchWorlds,
  createWorldEntity
} from "../clients/worldClient";
import {
  createCampaign,
  createSession,
  addPlayerToCampaign,
  createStoryArc,
  addEventToStoryArc,
  advanceTimeline,
  createScene
} from "../clients/campaignClient";
import { withAsyncAction } from "./useAsyncAction";
import type { useFormState } from "./useFormState";
import type { useSelection } from "./useSelection";

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
          setError,
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
          }
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
          setError,
          onSuccess: () => {
            setUsersLoaded(false);
          }
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
          setError,
          onSuccess: () => {
            setUsersLoaded(false);
          }
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
          setError,
          onSuccess: () => {
            setUsersLoaded(false);
          }
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
          setError,
          onSuccess: () => {
            createUserForm.resetForm();
            closeModal("createUser");
            setUsersLoaded(false);
          }
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
          setError,
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
          }
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
          setError,
          onSuccess: (entity) => {
            setEntities((prev) => [...prev, entity]);
            entityForm.resetForm();
            closeModal("entity");
            setEntitiesLoadedFor(null);
          }
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
          setError,
          onSuccess: (camp) => {
            setCampaigns((prev) => [...prev, camp]);
            campaignForm.resetForm();
            closeModal("campaign");
          }
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
          setError,
          onSuccess: (session) => {
            setSessions((prev) => [...prev, session]);
            sessionForm.resetForm();
            closeModal("session");
            setSessionsLoadedFor(null);
          }
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
          setError,
          onSuccess: () => {
            setPlayers((prev) => [...prev, playerForm.form.username]);
            playerForm.resetForm();
            closeModal("player");
            setPlayersLoadedFor(null);
            setStoryArcsLoadedFor(null);
          }
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
          setError,
          onSuccess: (storyArc) => {
            setStoryArcs((prev) => [...prev, storyArc]);
            storyArcForm.resetForm();
            closeModal("storyArc");
            setStoryArcsLoadedFor(null);
          }
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
          setError,
          onSuccess: () => {
            setStoryArcEvents((prev) => [...prev, selectedIds.eventId]);
            setSelectionField("eventId", "");
            closeModal("storyArcEvent");
            setStoryArcEventsLoadedFor(null);
          }
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
          setError,
          onSuccess: (updated) => {
            setTimeline(updated);
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
          setError,
          onSuccess: (scene) => {
            setScenes((prev) => [...prev, scene]);
            sceneForm.resetForm();
            closeModal("scene");
            setScenesLoadedFor(null);
          }
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
