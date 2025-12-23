import type { FormEvent } from "react";
import { AUTH_EVENT } from "../auth/authEvents";
import { AUTH_USERNAME_KEY } from "../auth/authStorage";
import { useAuthHandlers } from "./auth/useAuthHandlers";
import { useUserHandlers } from "./users/useUserHandlers";
import { useWorldHandlers } from "./world/useWorldHandlers";
import { useEntityHandlers } from "./entities/useEntityHandlers";
import { useCampaignHandlers } from "./campaign/useCampaignHandlers";
import { useStoryArcHandlers } from "./story-arcs/useStoryArcHandlers";
import { useSceneHandlers } from "./scenes/useSceneHandlers";
import { useTimelineHandlers } from "./timeline/useTimelineHandlers";
import type { useFormState } from "./useFormState";
import type { useSelection } from "./useSelection";
import type { useModals } from "./useModals";

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
  setCurrentUser: (user: any) => void;
  setActiveTab: (tab: "World" | "Campaigns" | "Sessions" | "Assets" | "Users" | null) => void;
  setActiveMode: (mode: "plan" | "play" | null) => void;
  setSubTab: (tab: "World Entities" | "Campaigns" | "Story Arcs" | "Users") => void;
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
  selectedIds: ReturnType<typeof useSelection>["selection"];
  setSelectionField: ReturnType<typeof useSelection>["setField"];
  resetSelection: () => void;
  currentUser: any;
  selectedEntityType: "all" | "location" | "creature" | "faction" | "event";
  closeModal: ReturnType<typeof useModals>["closeModal"];
}

/**
 * Main hook that composes all domain-specific handlers.
 * This is now a thin orchestrator that delegates to specialized handler hooks.
 */
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
    setSubTab,
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
    // Close all modals first
    closeModal("login");
    closeModal("world");
    closeModal("campaign");
    closeModal("session");
    closeModal("scene");
    closeModal("entity");
    closeModal("userManagement");
    closeModal("createUser");
    
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
    setSubTab("World Entities");
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
      window.dispatchEvent(
        new CustomEvent(AUTH_EVENT, { detail: { username: null } })
      );
    }
  }

  // Compose all domain-specific handlers
  const authHandlers = useAuthHandlers({
    loginForm,
    setIsLoading,
    setError,
    setAuthServiceUnavailable,
    setCurrentUser,
    closeModal,
    handleLogout
  });

  const userHandlers = useUserHandlers({
    userManagementForm,
    createUserForm,
    setIsLoading,
    setError,
    setUsersLoaded,
    closeModal,
    currentUser,
    handleLogout
  });

  const worldHandlers = useWorldHandlers({
    worldForm,
    setIsLoading,
    setError,
    setWorlds,
    setWorldsLoaded,
    closeModal,
    currentUser,
    handleLogout
  });

  const entityHandlers = useEntityHandlers({
    entityForm,
    setIsLoading,
    setError,
    setEntities,
    setEntitiesLoadedFor,
    setCrossRefEntitiesLoadedFor,
    closeModal,
    currentUser,
    selectedIds,
    selectedEntityType,
    handleLogout
  });

  const campaignHandlers = useCampaignHandlers({
    campaignForm,
    sessionForm,
    playerForm,
    setIsLoading,
    setError,
    setCampaigns,
    setSessions,
    setPlayers,
    setSessionsLoadedFor,
    setPlayersLoadedFor,
    setStoryArcsLoadedFor,
    closeModal,
    currentUser,
    selectedIds,
    setSelectionField,
    handleLogout
  });

  const storyArcHandlers = useStoryArcHandlers({
    storyArcForm,
    setIsLoading,
    setError,
    setStoryArcs,
    setStoryArcEvents,
    setStoryArcsLoadedFor,
    setStoryArcEventsLoadedFor,
    setSelectionField,
    closeModal,
    currentUser,
    selectedIds,
    handleLogout
  });

  const sceneHandlers = useSceneHandlers({
    sceneForm,
    setIsLoading,
    setError,
    setScenes,
    setScenesLoadedFor,
    closeModal,
    currentUser,
    selectedIds,
    handleLogout
  });

  const timelineHandlers = useTimelineHandlers({
    setIsLoading,
    setError,
    setTimeline,
    currentUser,
    selectedIds,
    handleLogout
  });

  // Return all handlers combined
  return {
    handleLogin: authHandlers.handleLogin,
    handleLogout,
    handleAssignRole: userHandlers.handleAssignRole,
    handleRevokeRole: userHandlers.handleRevokeRole,
    handleDeleteUser: userHandlers.handleDeleteUser,
    handleCreateUser: userHandlers.handleCreateUser,
    handleCreateWorld: worldHandlers.handleCreateWorld,
    handleSetWorldSplash: worldHandlers.handleSetWorldSplash,
    handleCreateEntity: entityHandlers.handleCreateEntity,
    handleCreateCampaign: campaignHandlers.handleCreateCampaign,
    handleCreateSession: campaignHandlers.handleCreateSession,
    handleAddPlayer: campaignHandlers.handleAddPlayer,
    handleCreateStoryArc: storyArcHandlers.handleCreateStoryArc,
    handleAddEventToStoryArc: storyArcHandlers.handleAddEventToStoryArc,
    handleAdvanceTimeline: timelineHandlers.handleAdvanceTimeline,
    handleCreateScene: sceneHandlers.handleCreateScene
  };
}
