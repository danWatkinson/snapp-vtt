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
  ROLE_REVOKED_EVENT,
  ENTITIES_LOADED_EVENT
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
  updateWorldSplashImage,
  addLocationRelationship,
  addEventRelationship,
  addFactionRelationship,
  fetchWorldEntities
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
  entityForm: ReturnType<typeof useFormState<{ name: string; summary: string; beginningTimestamp: string; endingTimestamp: string; relationshipTargetId: string; relationshipType: "" | "contains" | "is contained by" | "borders against" | "is near" | "is connected to"; locationId: string }>>;
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
  setCrossRefEntitiesLoadedFor: (key: string | null) => void;
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
    setCrossRefEntitiesLoadedFor,
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
    entityForm.resetForm({ name: "", summary: "", beginningTimestamp: "", endingTimestamp: "", relationshipTargetId: "", relationshipType: "", locationId: "" });
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
    console.log('[useHomePageHandlers] handleCreateEntity called:', {
      selectedIdsWorldId: selectedIds.worldId,
      selectedEntityType,
      willReturnEarly: !selectedIds.worldId || selectedEntityType === "all"
    });
    if (!selectedIds.worldId || selectedEntityType === "all") {
      console.log('[useHomePageHandlers] handleCreateEntity returning early');
      return;
    }
    try {
      const beginningTimestamp =
        selectedEntityType === "event" && entityForm.form.beginningTimestamp
          ? new Date(entityForm.form.beginningTimestamp).getTime()
          : undefined;
      const endingTimestamp =
        selectedEntityType === "event" && entityForm.form.endingTimestamp
          ? new Date(entityForm.form.endingTimestamp).getTime()
          : undefined;
      // parentLocationId removed - use relationships instead
      const locationId =
        selectedEntityType === "event" && entityForm.form.locationId
          ? entityForm.form.locationId
          : undefined;
      
      // Read relationship info BEFORE the async action so it's accessible to onSuccess callback
      // We'll re-read it inside the async action to get the latest values after React state updates
      let relationshipTargetId =
        (selectedEntityType === "location" || selectedEntityType === "event" || selectedEntityType === "faction") && entityForm.form.relationshipTargetId
          ? entityForm.form.relationshipTargetId
          : undefined;
      let relationshipType =
        (selectedEntityType === "location" || selectedEntityType === "event" || selectedEntityType === "faction") && entityForm.form.relationshipType && entityForm.form.relationshipType.trim() !== ""
          ? entityForm.form.relationshipType as "contains" | "is contained by" | "borders against" | "is near" | "is connected to"
          : undefined;
      
      await withAsyncAction(
        async () => {
          // Re-read relationship info INSIDE the async action to ensure we get the latest form values
          // This is important because React state updates are asynchronous
          relationshipTargetId =
            (selectedEntityType === "location" || selectedEntityType === "event" || selectedEntityType === "faction") && entityForm.form.relationshipTargetId
              ? entityForm.form.relationshipTargetId
              : undefined;
          // Check for both truthy value AND non-empty string (empty string is falsy but we want to be explicit)
          relationshipType =
            (selectedEntityType === "location" || selectedEntityType === "event" || selectedEntityType === "faction") && entityForm.form.relationshipType && entityForm.form.relationshipType.trim() !== ""
              ? entityForm.form.relationshipType as "contains" | "is contained by" | "borders against" | "is near" | "is connected to"
              : undefined;
          
          // If we have a relationship target but no type, wait a moment and re-read (handles timing issues)
          if (relationshipTargetId && !relationshipType) {
            console.warn('[useHomePageHandlers] Relationship target set but type is missing, waiting and re-reading...', {
              relationshipTargetId,
              formRelationshipType: entityForm.form.relationshipType,
              formRelationshipTargetId: entityForm.form.relationshipTargetId
            });
            await new Promise(resolve => setTimeout(resolve, 200));
            relationshipType =
              (selectedEntityType === "location" || selectedEntityType === "event" || selectedEntityType === "faction") && entityForm.form.relationshipType && entityForm.form.relationshipType.trim() !== ""
                ? entityForm.form.relationshipType as "contains" | "is contained by" | "borders against" | "is near" | "is connected to"
                : undefined;
            if (!relationshipType) {
              console.error('[useHomePageHandlers] Relationship type still missing after wait!', {
                relationshipTargetId,
                formRelationshipType: entityForm.form.relationshipType,
                formRelationshipTargetId: entityForm.form.relationshipTargetId,
                allFormValues: entityForm.form
              });
            }
          }
          
          console.log('[useHomePageHandlers] Form values before entity creation:', {
            selectedEntityType,
            relationshipTargetId,
            relationshipType,
            formRelationshipTargetId: entityForm.form.relationshipTargetId,
            formRelationshipType: entityForm.form.relationshipType,
            hasRelationshipTargetId: !!entityForm.form.relationshipTargetId,
            hasRelationshipType: !!entityForm.form.relationshipType
          });
          
          const entity = await createWorldEntity(
            selectedIds.worldId!,
            selectedEntityType,
            entityForm.form.name,
            entityForm.form.summary,
            beginningTimestamp,
            endingTimestamp,
            locationId,
            currentUser?.token
          );
          
          console.log('[useHomePageHandlers] Entity created, checking relationship:', {
            selectedEntityType,
            relationshipTargetId,
            relationshipType,
            formRelationshipTargetId: entityForm.form.relationshipTargetId,
            formRelationshipType: entityForm.form.relationshipType,
            willCreateLocationRelationship: selectedEntityType === "location" && relationshipTargetId && relationshipType,
            willCreateEventRelationship: selectedEntityType === "event" && relationshipTargetId && relationshipType,
            willCreateFactionRelationship: selectedEntityType === "faction" && relationshipTargetId && relationshipType,
            conditionCheck: {
              isLocation: selectedEntityType === "location",
              isEvent: selectedEntityType === "event",
              isFaction: selectedEntityType === "faction",
              hasTargetId: !!relationshipTargetId,
              hasType: !!relationshipType,
              allTrueLocation: selectedEntityType === "location" && relationshipTargetId && relationshipType,
              allTrueEvent: selectedEntityType === "event" && relationshipTargetId && relationshipType,
              allTrueFaction: selectedEntityType === "faction" && relationshipTargetId && relationshipType
            }
          });
          
          // If creating a location with a relationship, add it
          if (selectedEntityType === "location" && relationshipTargetId && relationshipType) {
            console.log('[useHomePageHandlers] Condition passed - will create location relationship');
            console.log('[useHomePageHandlers] Creating location relationship:', {
              worldId: selectedIds.worldId,
              sourceLocationId: entity.id,
              sourceLocationName: entity.name,
              targetLocationId: relationshipTargetId,
              relationshipType
            });
            try {
              await addLocationRelationship(
                selectedIds.worldId!,
                entity.id,
                relationshipTargetId,
                relationshipType,
                currentUser?.token
              );
              console.log('[useHomePageHandlers] Location relationship created successfully');
              
              // Add the entity immediately so it appears in the UI
              setEntities((prev) => {
                const exists = prev.some(e => e.id === entity.id);
                if (exists) {
                  return prev.map(e => e.id === entity.id ? entity : e);
                }
                return [...prev, entity];
              });
              
              // Reload entities to get updated relationships from the backend
              setTimeout(async () => {
                try {
                  // Wait for backend to process the relationship
                  await new Promise(resolve => setTimeout(resolve, 500));
                  // Fetch all locations to get updated relationships
                  const allLocations = await fetchWorldEntities(selectedIds.worldId!, "location");
                  const allEvents = await fetchWorldEntities(selectedIds.worldId!, "event");
                  // Combine locations and events, ensuring no duplicates
                  const entityMap = new Map<string, typeof allLocations[0] | typeof allEvents[0]>();
                  [...allLocations, ...allEvents].forEach(e => entityMap.set(e.id, e));
                  // Preserve any newly created entities that might not be in the fetched list yet
                  setEntities((prev) => {
                    prev.forEach(existingEntity => {
                      if (!entityMap.has(existingEntity.id)) {
                        entityMap.set(existingEntity.id, existingEntity);
                      }
                    });
                    return Array.from(entityMap.values());
                  });
                  // After entities are set, dispatch the event and update cache
                  const cacheKey = `${selectedIds.worldId}-location`;
                  setEntitiesLoadedFor(cacheKey);
                  // Also mark cross-reference as loaded since we fetched events
                  setCrossRefEntitiesLoadedFor(`${selectedIds.worldId}-crossref-location`);
                  // Dispatch ENTITIES_LOADED_EVENT after reload completes
                  setEntities((currentEntities) => {
                    setTimeout(() => {
                      dispatchTransitionEvent(ENTITIES_LOADED_EVENT, {
                        worldId: selectedIds.worldId,
                        entityType: selectedEntityType,
                        count: currentEntities.length,
                        cacheKey: cacheKey,
                        crossRefLoaded: true,
                        reloaded: true
                      });
                    }, 100);
                    return currentEntities;
                  });
                } catch (reloadErr) {
                  console.error("Failed to reload entities after relationship creation:", reloadErr);
                }
              }, 100);
            } catch (relErr) {
              // Log error but don't fail the entity creation
              console.error("Failed to create location relationship:", relErr);
            }
          // If creating an event with a relationship (parent event), add it
          } else if (selectedEntityType === "event" && relationshipTargetId && relationshipType) {
            console.log('[useHomePageHandlers] Condition passed - will create event relationship');
            console.log('[useHomePageHandlers] Creating event relationship:', {
              worldId: selectedIds.worldId,
              sourceEventId: entity.id,
              sourceEventName: entity.name,
              targetEventId: relationshipTargetId,
              relationshipType
            });
            try {
              // For events, the relationship should be "is contained by" (sub-event is contained by parent)
              // But we need to create it from the parent's perspective: parent "contains" sub-event
              // So we reverse the relationship: if user selected "is contained by", we create "contains" from parent
              const actualRelationshipType = relationshipType === "is contained by" ? "contains" : relationshipType;
              await addEventRelationship(
                selectedIds.worldId!,
                relationshipTargetId, // Parent event (target)
                entity.id, // Sub-event (source)
                actualRelationshipType,
                currentUser?.token
              );
              console.log('[useHomePageHandlers] Event relationship created successfully');
              
              // Add the entity immediately so it appears in the UI
              setEntities((prev) => {
                const exists = prev.some(e => e.id === entity.id);
                if (exists) {
                  return prev.map(e => e.id === entity.id ? entity : e);
                }
                return [...prev, entity];
              });
              
              // Reload entities to get updated relationships from the backend
              setTimeout(async () => {
                try {
                  // Wait for backend to process the relationship
                  await new Promise(resolve => setTimeout(resolve, 500));
                  // Fetch all events to get updated relationships
                  const allEvents = await fetchWorldEntities(selectedIds.worldId!, "event");
                  const allLocations = await fetchWorldEntities(selectedIds.worldId!, "location");
                  // Combine events and locations, ensuring no duplicates
                  const entityMap = new Map<string, typeof allEvents[0] | typeof allLocations[0]>();
                  [...allEvents, ...allLocations].forEach(e => entityMap.set(e.id, e));
                  // Preserve any newly created entities that might not be in the fetched list yet
                  setEntities((prev) => {
                    prev.forEach(existingEntity => {
                      if (!entityMap.has(existingEntity.id)) {
                        entityMap.set(existingEntity.id, existingEntity);
                      }
                    });
                    return Array.from(entityMap.values());
                  });
                  // After entities are set, dispatch the event and update cache
                  const cacheKey = `${selectedIds.worldId}-event`;
                  setEntitiesLoadedFor(cacheKey);
                  // Also mark cross-reference as loaded since we fetched locations
                  setCrossRefEntitiesLoadedFor(`${selectedIds.worldId}-crossref-event`);
                  // Dispatch ENTITIES_LOADED_EVENT after reload completes
                  setEntities((currentEntities) => {
                    setTimeout(() => {
                      dispatchTransitionEvent(ENTITIES_LOADED_EVENT, {
                        worldId: selectedIds.worldId,
                        entityType: selectedEntityType,
                        count: currentEntities.length,
                        cacheKey: cacheKey,
                        crossRefLoaded: true,
                        reloaded: true
                      });
                    }, 100);
                    return currentEntities;
                  });
                } catch (reloadErr) {
                  console.error("Failed to reload entities after relationship creation:", reloadErr);
                }
              }, 100);
            } catch (relErr) {
              // Log error but don't fail the entity creation
              console.error("Failed to create event relationship:", relErr);
            }
          // If creating a faction with a relationship (parent faction), add it
          } else if (selectedEntityType === "faction" && relationshipTargetId && relationshipType) {
            console.log('[useHomePageHandlers] Condition passed - will create faction relationship');
            console.log('[useHomePageHandlers] Creating faction relationship:', {
              worldId: selectedIds.worldId,
              sourceFactionId: entity.id,
              sourceFactionName: entity.name,
              targetFactionId: relationshipTargetId,
              relationshipType
            });
            try {
              // For factions, the relationship should be "is contained by" (sub-faction is contained by parent)
              // But we need to create it from the parent's perspective: parent "contains" sub-faction
              // So we reverse the relationship: if user selected "is contained by", we create "contains" from parent
              const actualRelationshipType = relationshipType === "is contained by" ? "contains" : relationshipType;
              await addFactionRelationship(
                selectedIds.worldId!,
                relationshipTargetId, // Parent faction (target)
                entity.id, // Sub-faction (source)
                actualRelationshipType,
                currentUser?.token
              );
              console.log('[useHomePageHandlers] Faction relationship created successfully');
              
              // Add the entity immediately so it appears in the UI
              setEntities((prev) => {
                const exists = prev.some(e => e.id === entity.id);
                if (exists) {
                  return prev.map(e => e.id === entity.id ? entity : e);
                }
                return [...prev, entity];
              });
              
              // Reload entities to get updated relationships from the backend
              setTimeout(async () => {
                try {
                  // Wait for backend to process the relationship
                  await new Promise(resolve => setTimeout(resolve, 500));
                  // Fetch all factions to get updated relationships
                  const allFactions = await fetchWorldEntities(selectedIds.worldId!, "faction");
                  // Combine factions, ensuring no duplicates
                  const entityMap = new Map<string, typeof allFactions[0]>();
                  allFactions.forEach(e => entityMap.set(e.id, e));
                  // Preserve any newly created entities that might not be in the fetched list yet
                  setEntities((prev) => {
                    prev.forEach(existingEntity => {
                      if (!entityMap.has(existingEntity.id)) {
                        entityMap.set(existingEntity.id, existingEntity);
                      }
                    });
                    return Array.from(entityMap.values());
                  });
                  // After entities are set, dispatch the event and update cache
                  const cacheKey = `${selectedIds.worldId}-faction`;
                  setEntitiesLoadedFor(cacheKey);
                  // Dispatch ENTITIES_LOADED_EVENT after reload completes
                  setEntities((currentEntities) => {
                    setTimeout(() => {
                      dispatchTransitionEvent(ENTITIES_LOADED_EVENT, {
                        worldId: selectedIds.worldId,
                        entityType: selectedEntityType,
                        count: currentEntities.length,
                        cacheKey: cacheKey,
                        reloaded: true
                      });
                    }, 100);
                    return currentEntities;
                  });
                } catch (reloadErr) {
                  console.error("Failed to reload entities after relationship creation:", reloadErr);
                }
              }, 100);
            } catch (relErr) {
              // Log error but don't fail the entity creation
              console.error("Failed to create faction relationship:", relErr);
            }
          }
          
          return entity;
        },
        {
          setIsLoading,
          setError,
          onAuthError: handleLogout,
          onSuccess: async (entity) => {
            // If we created a location, event, or faction with a relationship, the reload already happened above
            // Otherwise, add the entity to state
            if (!((selectedEntityType === "location" || selectedEntityType === "event" || selectedEntityType === "faction") && relationshipTargetId && relationshipType)) {
            setEntities((prev) => [...prev, entity]);
            }
            entityForm.resetForm();
            closeModal("entity");
            // Don't reset entitiesLoadedFor - keep the cache so the entity stays in the list
            // The entity is already added to state above (or reloaded if relationship was created), so it will appear in the UI
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
    // Campaigns require a world - UI should prevent this, but defensive check
    if (!selectedIds.worldId) {
      setError("Please select a world before creating a campaign");
      return;
    }
    try {
      await withAsyncAction(
        () => createCampaign(campaignForm.form.name, campaignForm.form.summary, selectedIds.worldId!, currentUser?.token),
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
