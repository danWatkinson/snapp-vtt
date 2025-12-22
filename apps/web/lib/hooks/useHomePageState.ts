import { useState } from "react";
import { useModals } from "./useModals";
import { useFormState } from "./useFormState";
import { useSelection } from "./useSelection";
import { useSelectionEvents } from "./events/useSelectionEvents";
import { useNavigationEvents } from "./events/useNavigationEvents";
import { useDataLoadedEvents } from "./events/useDataLoadedEvents";
import { useErrorEvents } from "./events/useErrorEvents";
import type { LoginResponse, User } from "../clients/authClient";
import type { World, WorldEntity } from "../clients/worldClient";
import type {
  Campaign,
  Session,
  Scene,
  StoryArc,
  Timeline
} from "../clients/campaignClient";
import type { DigitalAsset } from "../clients/assetsClient";

type CurrentUser = LoginResponse | null;

/**
 * Hook to manage all state for the HomePage component.
 * Consolidates all state declarations into a single hook.
 */
export function useHomePageState() {
  // Navigation state
  const [activeTab, setActiveTab] = useState<
    "World" | "Campaigns" | "Sessions" | "Assets" | "Users" | null
  >(null);
  const [activeMode, setActiveMode] = useState<"plan" | "play" | null>(null);
  const [subTab, setSubTab] = useState<
    "World Entities" | "Campaigns" | "Story Arcs" | "Users"
  >("World Entities");
  const [campaignView, setCampaignView] = useState<"sessions" | "players" | "story-arcs" | "timeline" | null>(null);

  // Form state
  const loginForm = useFormState({ name: "admin", password: "" });
  const userManagementForm = useFormState({ username: "alice", role: "gm" });
  const createUserForm = useFormState({ username: "", password: "", roles: [] as string[] });
  const worldForm = useFormState({ name: "", description: "" });
  const entityForm = useFormState({ 
    name: "", 
    summary: "", 
    beginningTimestamp: "", 
    endingTimestamp: "",
    relationshipTargetId: "",
    relationshipType: "" as "" | "contains" | "is contained by" | "borders against" | "is near" | "is connected to",
    locationId: ""
  });
  const campaignForm = useFormState({ name: "", summary: "" });
  const sessionForm = useFormState({ name: "" });
  const playerForm = useFormState({ username: "" });
  const storyArcForm = useFormState({ name: "", summary: "" });
  const sceneForm = useFormState({ name: "", summary: "", worldId: "" });

  // Auth and UI state
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authServiceUnavailable, setAuthServiceUnavailable] = useState(false);

  // Modal state
  const { modal, modals, openModal, closeModal } = useModals();

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [worldsLoaded, setWorldsLoaded] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [entities, setEntities] = useState<WorldEntity[]>([]);
  const [entitiesLoadedFor, setEntitiesLoadedFor] = useState<string | null>(null);
  const [crossRefEntitiesLoadedFor, setCrossRefEntitiesLoadedFor] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoadedFor, setSessionsLoadedFor] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [playersLoadedFor, setPlayersLoadedFor] = useState<string | null>(null);
  const [storyArcs, setStoryArcs] = useState<StoryArc[]>([]);
  const [storyArcsLoadedFor, setStoryArcsLoadedFor] = useState<string | null>(null);
  const [storyArcEvents, setStoryArcEvents] = useState<string[]>([]);
  const [storyArcEventsLoadedFor, setStoryArcEventsLoadedFor] = useState<string | null>(null);
  const [allEvents, setAllEvents] = useState<WorldEntity[]>([]);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [timelineLoadedFor, setTimelineLoadedFor] = useState<string | null>(
    null
  );
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [scenesLoadedFor, setScenesLoadedFor] = useState<string | null>(null);
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Selection state
  const { selection: selectedIds, setField: setSelectionField, reset: resetSelection } = useSelection({
    worldId: null as string | null,
    campaignId: null as string | null,
    storyArcId: null as string | null,
    sessionId: null as string | null,
    eventId: "" as string
  });

  const [selectedEntityType, setSelectedEntityType] = useState<
    "all" | "location" | "creature" | "faction" | "event"
  >("all");

  // Use extracted event hooks
  useSelectionEvents({
    selectedIds,
    worlds,
    campaigns
  });

  useNavigationEvents({
    activeMode,
    subTab,
    campaignView,
    activeTab,
    selectedIds,
    worlds,
    campaigns
  });

  useDataLoadedEvents({
    worldsLoaded,
    campaignsLoaded,
    entitiesLoadedFor,
    crossRefEntitiesLoadedFor,
    sessionsLoadedFor,
    playersLoadedFor,
    storyArcsLoadedFor,
    scenesLoadedFor,
    timelineLoadedFor,
    usersLoaded,
    assetsLoaded,
    worlds,
    campaigns,
    entities,
    sessions,
    players,
    storyArcs,
    scenes,
    users,
    assets,
    selectedIds,
    selectedEntityType
  });

  useErrorEvents({ error });

  return {
    // Navigation
    activeTab,
    setActiveTab,
    activeMode,
    setActiveMode,
    subTab,
    setSubTab,
    campaignView,
    setCampaignView,
    
    // Forms
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
    
    // Auth and UI
    currentUser,
    setCurrentUser,
    error,
    setError,
    isLoading,
    setIsLoading,
    authServiceUnavailable,
    setAuthServiceUnavailable,
    
    // Modals
    modal,
    modals,
    openModal,
    closeModal,
    
    // Data
    users,
    setUsers,
    usersLoaded,
    setUsersLoaded,
    worlds,
    setWorlds,
    worldsLoaded,
    setWorldsLoaded,
    campaigns,
    setCampaigns,
    campaignsLoaded,
    setCampaignsLoaded,
    entities,
    setEntities,
    entitiesLoadedFor,
    setEntitiesLoadedFor,
    crossRefEntitiesLoadedFor,
    setCrossRefEntitiesLoadedFor,
    sessions,
    setSessions,
    sessionsLoadedFor,
    setSessionsLoadedFor,
    players,
    setPlayers,
    playersLoadedFor,
    setPlayersLoadedFor,
    storyArcs,
    setStoryArcs,
    storyArcsLoadedFor,
    setStoryArcsLoadedFor,
    storyArcEvents,
    setStoryArcEvents,
    storyArcEventsLoadedFor,
    setStoryArcEventsLoadedFor,
    allEvents,
    setAllEvents,
    timeline,
    setTimeline,
    timelineLoadedFor,
    setTimelineLoadedFor,
    scenes,
    setScenes,
    scenesLoadedFor,
    setScenesLoadedFor,
    assets,
    setAssets,
    assetsLoaded,
    setAssetsLoaded,
    
    // Selection
    selectedIds,
    setSelectionField,
    resetSelection,
    selectedEntityType,
    setSelectedEntityType
  };
}
