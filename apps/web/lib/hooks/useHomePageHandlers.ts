import type { FormEvent } from "react";
import { AUTH_EVENT } from "../auth/authEvents";
import {
  WORLD_CREATED_EVENT,
  WORLD_UPDATED_EVENT,
  CAMPAIGN_CREATED_EVENT,
  CREATURE_CREATED_EVENT,
  FACTION_CREATED_EVENT,
  LOCATION_CREATED_EVENT,
  EVENT_CREATED_EVENT,
  SESSION_CREATED_EVENT,
  SCENE_CREATED_EVENT,
  PLAYER_ADDED_EVENT,
  STORY_ARC_CREATED_EVENT,
  USER_CREATED_EVENT,
  USER_DELETED_EVENT,
  ROLE_ASSIGNED_EVENT,
  ROLE_REVOKED_EVENT
} from "../auth/authEvents";
import { AUTH_USERNAME_KEY } from "../auth/authStorage";
import { dispatchTransitionEvent } from "../utils/eventDispatcher";
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
  createWorldEntity,
  updateWorldSplashImage
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
import { isAuthError } from "../auth/authErrors";
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
  setActiveTab: (tab: "World" | "Campaigns" | "Sessions" | "Assets" | "Users" | null) => void;
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
  setUsers: React.Dispatch<React.SetStateAction<any[]>>;
  setAssets: React.Dispatch<React.SetStateAction<any[]>>;
  setAllEvents: React.Dispatch<React.SetStateAction<any[]>>;
  setUsersLoaded: (loaded: boolean) => void;
  setWorldsLoaded: (loaded: boolean) => void;
  setCampaignsLoaded: (loaded: boolean) => void;
  setAssetsLoaded: (loaded: boolean) => void;
  setEntitiesLoadedFor: (key: string | null) => void;
  setSessionsLoadedFor: (key: string | null) => void;
  setPlayersLoadedFor: (key: string | null) => void;
  setStoryArcsLoadedFor: (key: string | null) => void;
  setStoryArcEventsLoadedFor: (key: string | null) => void;
  setScenesLoadedFor: (key: string | null) => void;
  setTimelineLoadedFor: (key: string | null) => void;
  
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
    setUsers,
    setAssets,
    setAllEvents,
    setUsersLoaded,
    setWorldsLoaded,
    setCampaignsLoaded,
    setAssetsLoaded,
    setEntitiesLoadedFor,
    setSessionsLoadedFor,
    setPlayersLoadedFor,
    setStoryArcsLoadedFor,
    setStoryArcEventsLoadedFor,
    setScenesLoadedFor,
    setTimelineLoadedFor,
    selectedIds,
    setSelectionField,
    resetSelection,
    currentUser,
    selectedEntityType,
    closeModal
  } = props;

  // Define handleLogout early so it can be used in onAuthError callbacks
  function handleLogout() {
    // Close all modals first (they might be blocking the UI update)
    closeModal("login");
    closeModal("world");
    closeModal("campaign");
    closeModal("session");
    closeModal("scene");
    closeModal("entity");
    closeModal("userManagement");
    closeModal("createUser");
    
    // Clear user state - this should trigger the UI to switch to guest view
    setCurrentUser(null);
    
    // Reset all forms
    loginForm.resetForm({ name: "admin", password: "" });
    userManagementForm.resetForm({ username: "alice", role: "gm" });
    createUserForm.resetForm({ username: "", password: "", roles: [] });
    worldForm.resetForm({ name: "", description: "" });
    entityForm.resetForm({ name: "", summary: "", beginningTimestamp: "", endingTimestamp: "" });
    campaignForm.resetForm({ name: "", summary: "" });
    sessionForm.resetForm({ name: "" });
    playerForm.resetForm({ username: "" });
    storyArcForm.resetForm({ name: "", summary: "" });
    sceneForm.resetForm({ name: "", summary: "", worldId: "" });
    
    // Reset navigation state
    setActiveTab(null);
    setActiveMode(null);
    setPlanningSubTab("World Entities");
    resetSelection();
    setSelectedEntityType("all");
    setError(null);
    setAuthServiceUnavailable(false);
    
    // Clear all data arrays
    setWorlds([]);
    setCampaigns([]);
    setEntities([]);
    setSessions([]);
    setPlayers([]);
    setStoryArcs([]);
    setStoryArcEvents([]);
    setScenes([]);
    setTimeline(null);
    setUsers([]);
    setAssets([]);
    setAllEvents([]);
    
    // Reset all loaded flags
    setUsersLoaded(false);
    setWorldsLoaded(false);
    setCampaignsLoaded(false);
    setAssetsLoaded(false);
    setEntitiesLoadedFor(null);
    setSessionsLoadedFor(null);
    setPlayersLoadedFor(null);
    setStoryArcsLoadedFor(null);
    setStoryArcEventsLoadedFor(null);
    setScenesLoadedFor(null);
    setTimelineLoadedFor(null);
    
    /* c8 ignore next */ // SSR guard; window is only available in browser/JS DOM
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_USERNAME_KEY);
      // Dispatch AUTH_EVENT to notify other components (like AuthContext)
      // This will trigger the HomePageContext listener we added to ensure everything is cleared
      window.dispatchEvent(
        new CustomEvent(AUTH_EVENT, { detail: { username: null } })
      );
    }
  }

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
            /* c8 ignore next */ // SSR guard; window is only available in browser/JS DOM
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
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      // Error already handled by withAsyncAction
      /* c8 ignore stop */
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
          onAuthError: handleLogout,
          onSuccess: (result) => {
            setUsersLoaded(false);
            // Dispatch role assigned event
            // assignRoles may return a User object or just a success response
            Promise.resolve().then(() => {
              dispatchTransitionEvent(ROLE_ASSIGNED_EVENT, {
                username: userManagementForm.form.username,
                role: userManagementForm.form.role,
                updatedUser: result
              });
            });
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      // Error already handled by withAsyncAction
      /* c8 ignore stop */
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
          onSuccess: (user) => {
            setUsersLoaded(false);
            // Dispatch role revoked event
            Promise.resolve().then(() => {
              dispatchTransitionEvent(ROLE_REVOKED_EVENT, {
                username: username,
                role: role,
                updatedUser: user
              });
            });
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      // Error already handled by withAsyncAction
      /* c8 ignore stop */
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
          onAuthError: handleLogout,
          onSuccess: () => {
            setUsersLoaded(false);
            // Dispatch user deleted event
            Promise.resolve().then(() => {
              dispatchTransitionEvent(USER_DELETED_EVENT, {
                username: username
              });
            });
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      // Error already handled by withAsyncAction
      /* c8 ignore stop */
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
          onSuccess: (user) => {
            createUserForm.resetForm();
            closeModal("createUser");
            setUsersLoaded(false);
            // Dispatch user created event
            Promise.resolve().then(() => {
              dispatchTransitionEvent(USER_CREATED_EVENT, {
                username: user.username,
                roles: user.roles
              });
            });
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      // Error already handled by withAsyncAction
      /* c8 ignore stop */
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
          onAuthError: handleLogout,
          onSuccess: (world) => {
            setWorlds((prev) => [...prev, world]);
            worldForm.resetForm();
            closeModal("world");
            dispatchTransitionEvent(WORLD_CREATED_EVENT, {
              entityId: world.id,
              entityName: world.name,
              entityType: "world"
            });
          },
          onError: async (err) => {
            if (err.message.includes("already exists")) {
              try {
                const existing = await fetchWorlds();
                setWorlds(existing);
              } catch (reloadErr) {
                /* c8 ignore start */ // Ignoring reload errors; user can retry manually
                // Ignore reload errors
                /* c8 ignore stop */
              }
            }
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      // Error already handled by withAsyncAction
      /* c8 ignore stop */
    }
  }

  async function handleSetWorldSplash(
    worldId: string,
    splashImageAssetId: string | null
  ) {
    if (!currentUser) return;
    try {
      await withAsyncAction(
        () => updateWorldSplashImage(worldId, splashImageAssetId, currentUser.token),
        {
          setIsLoading,
          setError,
          onAuthError: handleLogout,
          onSuccess: (updatedWorld) => {
            setWorlds((prev) =>
              prev.map((w) => (w.id === updatedWorld.id ? updatedWorld : w))
            );
            // Dispatch world updated event
            Promise.resolve().then(() => {
              dispatchTransitionEvent(WORLD_UPDATED_EVENT, {
                worldId: updatedWorld.id,
                worldName: updatedWorld.name,
                updateType: splashImageAssetId ? "splashImageSet" : "splashImageCleared",
                splashImageAssetId: splashImageAssetId
              });
            });
          }
        }
      );
    } catch (err) {
      /* c8 ignore next */ // Error already handled by withAsyncAction; catch is defensive
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
          onAuthError: handleLogout,
          onSuccess: (entity) => {
            setEntities((prev) => [...prev, entity]);
            entityForm.resetForm();
            closeModal("entity");
            // Don't reset entitiesLoadedFor - keep the cache so the entity stays in the list
            // The entity is already added to state above, so it will appear in the UI
            // Dispatch type-specific entity creation event after a microtask
            const eventMap: Record<string, string> = {
              creature: CREATURE_CREATED_EVENT,
              faction: FACTION_CREATED_EVENT,
              location: LOCATION_CREATED_EVENT,
              event: EVENT_CREATED_EVENT
            };
            const eventName = eventMap[selectedEntityType];
            if (eventName) {
              Promise.resolve().then(() => {
                dispatchTransitionEvent(eventName, {
                  entityId: entity.id,
                  entityName: entity.name,
                  entityType: selectedEntityType,
                  worldId: selectedIds.worldId
                });
              });
            }
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      // Error already handled by withAsyncAction
      /* c8 ignore stop */
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
          onAuthError: handleLogout,
          onSuccess: (camp) => {
            setCampaigns((prev) => [...prev, camp]);
            campaignForm.resetForm();
            closeModal("campaign");
            // Dispatch event after a microtask to ensure state updates and modal close have processed
            Promise.resolve().then(() => {
              dispatchTransitionEvent(CAMPAIGN_CREATED_EVENT, {
                entityId: camp.id,
                entityName: camp.name,
                entityType: "campaign"
              });
            });
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      // Error already handled by withAsyncAction
      /* c8 ignore stop */
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
          onAuthError: handleLogout,
          onSuccess: (session) => {
            setSessions((prev) => [...prev, session]);
            sessionForm.resetForm();
            closeModal("session");
            setSessionsLoadedFor(null);
            dispatchTransitionEvent(SESSION_CREATED_EVENT, {
              entityId: session.id,
              entityName: session.name,
              entityType: "session",
              campaignId: selectedIds.campaignId
            });
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      // Error already handled by withAsyncAction
      /* c8 ignore stop */
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
          onAuthError: handleLogout,
          onSuccess: () => {
            setPlayers((prev) => [...prev, playerForm.form.username]);
            playerForm.resetForm();
            closeModal("player");
            setPlayersLoadedFor(null);
            setStoryArcsLoadedFor(null);
            dispatchTransitionEvent(PLAYER_ADDED_EVENT, {
              username: playerForm.form.username,
              campaignId: selectedIds.campaignId
            });
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      // Error already handled by withAsyncAction
      /* c8 ignore stop */
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
          onAuthError: handleLogout,
          onSuccess: (storyArc) => {
            setStoryArcs((prev) => [...prev, storyArc]);
            storyArcForm.resetForm();
            closeModal("storyArc");
            setStoryArcsLoadedFor(null);
            dispatchTransitionEvent(STORY_ARC_CREATED_EVENT, {
              entityId: storyArc.id,
              entityName: storyArc.name,
              entityType: "storyArc",
              campaignId: selectedIds.campaignId
            });
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      // Error already handled by withAsyncAction
      /* c8 ignore stop */
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
          onAuthError: handleLogout,
          onSuccess: () => {
            setStoryArcEvents((prev) => [...prev, selectedIds.eventId]);
            setSelectionField("eventId", "");
            closeModal("storyArcEvent");
            setStoryArcEventsLoadedFor(null);
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      // Error already handled by withAsyncAction
      /* c8 ignore stop */
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
          onAuthError: handleLogout,
          onSuccess: (updated) => {
            setTimeline(updated);
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      // Error already handled by withAsyncAction
      /* c8 ignore stop */
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
          onAuthError: handleLogout,
          onSuccess: (scene) => {
            setScenes((prev) => [...prev, scene]);
            sceneForm.resetForm();
            closeModal("scene");
            setScenesLoadedFor(null);
            dispatchTransitionEvent(SCENE_CREATED_EVENT, {
              entityId: scene.id,
              entityName: scene.name,
              entityType: "scene",
              sessionId: selectedIds.sessionId,
              worldId: sceneForm.form.worldId
            });
          }
        }
      );
    } catch (err) {
      /* c8 ignore next */ // Error already handled by withAsyncAction; catch is defensive
      // Error already handled by withAsyncAction
    }
  }

  return {
    handleLogin,
    handleAssignRole,
    handleRevokeRole,
    handleDeleteUser,
    handleCreateUser,
    handleCreateWorld,
    handleSetWorldSplash,
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
