import { useState, useEffect, useRef } from "react";
import { useModals } from "./useModals";
import { useFormState } from "./useFormState";
import { useSelection } from "./useSelection";
import { dispatchTransitionEvent } from "../utils/eventDispatcher";
import {
  WORLD_SELECTED_EVENT,
  WORLD_DESELECTED_EVENT,
  CAMPAIGN_SELECTED_EVENT,
  CAMPAIGN_DESELECTED_EVENT,
  PLANNING_MODE_ENTERED_EVENT,
  PLANNING_MODE_EXITED_EVENT,
  PLANNING_SUBTAB_CHANGED_EVENT,
  CAMPAIGN_VIEW_CHANGED_EVENT,
  MAIN_TAB_CHANGED_EVENT,
  WORLDS_LOADED_EVENT,
  CAMPAIGNS_LOADED_EVENT,
  ENTITIES_LOADED_EVENT,
  SESSIONS_LOADED_EVENT,
  PLAYERS_LOADED_EVENT,
  STORY_ARCS_LOADED_EVENT,
  SCENES_LOADED_EVENT,
  TIMELINE_LOADED_EVENT,
  USERS_LOADED_EVENT,
  ASSETS_LOADED_EVENT,
  ERROR_OCCURRED_EVENT,
  ERROR_CLEARED_EVENT
} from "../auth/authEvents";
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
  const [planningSubTab, setPlanningSubTab] = useState<
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

  // Track previous selection state to detect changes
  const prevSelectedIdsRef = useRef(selectedIds);
  const prevActiveModeRef = useRef(activeMode);
  const prevPlanningSubTabRef = useRef(planningSubTab);
  const prevCampaignViewRef = useRef(campaignView);
  const prevActiveTabRef = useRef(activeTab);
  
  // Track previous loaded states to detect changes
  const prevWorldsLoadedRef = useRef(worldsLoaded);
  const prevCampaignsLoadedRef = useRef(campaignsLoaded);
  const prevEntitiesLoadedForRef = useRef(entitiesLoadedFor);
  const prevCrossRefLoadedForRef = useRef(crossRefEntitiesLoadedFor);
  const prevSessionsLoadedForRef = useRef(sessionsLoadedFor);
  const prevPlayersLoadedForRef = useRef(playersLoadedFor);
  const prevStoryArcsLoadedForRef = useRef(storyArcsLoadedFor);
  const prevScenesLoadedForRef = useRef(scenesLoadedFor);
  const prevTimelineLoadedForRef = useRef(timelineLoadedFor);
  const prevUsersLoadedRef = useRef(usersLoaded);
  const prevAssetsLoadedRef = useRef(assetsLoaded);
  
  // Track previous error state to detect changes
  const prevErrorRef = useRef(error);

  // Dispatch selection events when selectedIds changes
  useEffect(() => {
    const prevSelectedIds = prevSelectedIdsRef.current;
    
    // World selection events
    if (selectedIds.worldId !== prevSelectedIds.worldId) {
      if (selectedIds.worldId) {
        // World selected
        const selectedWorld = worlds.find(w => w.id === selectedIds.worldId);
        dispatchTransitionEvent(WORLD_SELECTED_EVENT, {
          worldId: selectedIds.worldId,
          worldName: selectedWorld?.name || "Unknown",
          previousWorldId: prevSelectedIds.worldId
        });
      } else if (prevSelectedIds.worldId) {
        // World deselected
        const previousWorld = worlds.find(w => w.id === prevSelectedIds.worldId);
        dispatchTransitionEvent(WORLD_DESELECTED_EVENT, {
          previousWorldId: prevSelectedIds.worldId,
          previousWorldName: previousWorld?.name || "Unknown"
        });
      }
    }
    
    // Campaign selection events
    if (selectedIds.campaignId !== prevSelectedIds.campaignId) {
      if (selectedIds.campaignId) {
        // Campaign selected
        const selectedCampaign = campaigns.find(c => c.id === selectedIds.campaignId);
        dispatchTransitionEvent(CAMPAIGN_SELECTED_EVENT, {
          campaignId: selectedIds.campaignId,
          campaignName: selectedCampaign?.name || "Unknown",
          worldId: selectedIds.worldId, // Context: which world this campaign belongs to
          previousCampaignId: prevSelectedIds.campaignId
        });
      } else if (prevSelectedIds.campaignId) {
        // Campaign deselected
        const previousCampaign = campaigns.find(c => c.id === prevSelectedIds.campaignId);
        dispatchTransitionEvent(CAMPAIGN_DESELECTED_EVENT, {
          previousCampaignId: prevSelectedIds.campaignId,
          previousCampaignName: previousCampaign?.name || "Unknown",
          worldId: selectedIds.worldId
        });
      }
    }
    
    prevSelectedIdsRef.current = selectedIds;
  }, [selectedIds, worlds, campaigns]);

  // Dispatch planning mode events when activeMode changes
  useEffect(() => {
    const prevActiveMode = prevActiveModeRef.current;
    
    if (activeMode === "plan" && prevActiveMode !== "plan") {
      // Planning mode entered
      dispatchTransitionEvent(PLANNING_MODE_ENTERED_EVENT, {
        worldId: selectedIds.worldId,
        worldName: worlds.find(w => w.id === selectedIds.worldId)?.name || null,
        planningSubTab: planningSubTab
      });
    } else if (activeMode !== "plan" && prevActiveMode === "plan") {
      // Planning mode exited
      dispatchTransitionEvent(PLANNING_MODE_EXITED_EVENT, {
        previousWorldId: selectedIds.worldId,
        previousWorldName: worlds.find(w => w.id === selectedIds.worldId)?.name || null
      });
    }
    
    prevActiveModeRef.current = activeMode;
  }, [activeMode, selectedIds.worldId, worlds, planningSubTab]);

  // Dispatch planning sub-tab change events
  useEffect(() => {
    const prevPlanningSubTab = prevPlanningSubTabRef.current;
    
    if (planningSubTab !== prevPlanningSubTab && activeMode === "plan") {
      // Only dispatch if we're in planning mode
      dispatchTransitionEvent(PLANNING_SUBTAB_CHANGED_EVENT, {
        subTab: planningSubTab,
        previousSubTab: prevPlanningSubTab,
        worldId: selectedIds.worldId,
        worldName: worlds.find(w => w.id === selectedIds.worldId)?.name || null
      });
    }
    
    prevPlanningSubTabRef.current = planningSubTab;
  }, [planningSubTab, activeMode, selectedIds.worldId, worlds]);

  // Dispatch campaign view change events
  useEffect(() => {
    const prevCampaignView = prevCampaignViewRef.current;
    
    if (campaignView !== prevCampaignView) {
      dispatchTransitionEvent(CAMPAIGN_VIEW_CHANGED_EVENT, {
        view: campaignView,
        previousView: prevCampaignView,
        campaignId: selectedIds.campaignId,
        campaignName: campaigns.find(c => c.id === selectedIds.campaignId)?.name || null,
        worldId: selectedIds.worldId
      });
    }
    
    prevCampaignViewRef.current = campaignView;
  }, [campaignView, selectedIds.campaignId, selectedIds.worldId, campaigns]);

  // Dispatch main tab change events
  useEffect(() => {
    const prevActiveTab = prevActiveTabRef.current;
    
    if (activeTab !== prevActiveTab) {
      dispatchTransitionEvent(MAIN_TAB_CHANGED_EVENT, {
        tab: activeTab,
        previousTab: prevActiveTab
      });
    }
    
    prevActiveTabRef.current = activeTab;
  }, [activeTab]);

  // Dispatch data loaded events when loaded flags change from false to true
  useEffect(() => {
    const prevWorldsLoaded = prevWorldsLoadedRef.current;
    if (worldsLoaded && !prevWorldsLoaded) {
      dispatchTransitionEvent(WORLDS_LOADED_EVENT, {
        count: worlds.length
      });
    }
    prevWorldsLoadedRef.current = worldsLoaded;
  }, [worldsLoaded, worlds.length]);

  useEffect(() => {
    const prevCampaignsLoaded = prevCampaignsLoadedRef.current;
    if (campaignsLoaded && !prevCampaignsLoaded) {
      dispatchTransitionEvent(CAMPAIGNS_LOADED_EVENT, {
        count: campaigns.length
      });
    }
    prevCampaignsLoadedRef.current = campaignsLoaded;
  }, [campaignsLoaded, campaigns.length]);

  useEffect(() => {
    const prevEntitiesLoadedFor = prevEntitiesLoadedForRef.current;
    if (entitiesLoadedFor && entitiesLoadedFor !== prevEntitiesLoadedFor) {
      // Check if we need cross-referenced entities
      const needsCrossRef = (selectedEntityType === "event") || (selectedEntityType === "location");
      
      if (needsCrossRef) {
        // Wait for cross-referenced entities to load before firing event
        // The event will be fired when crossRefEntitiesLoadedFor matches
      } else {
        // No cross-referenced entities needed, fire event immediately
      dispatchTransitionEvent(ENTITIES_LOADED_EVENT, {
        worldId: selectedIds.worldId,
        entityType: selectedEntityType,
        count: entities.length,
        cacheKey: entitiesLoadedFor
      });
      }
    }
    prevEntitiesLoadedForRef.current = entitiesLoadedFor;
  }, [entitiesLoadedFor, selectedIds.worldId, selectedEntityType, entities.length]);

  // Fire ENTITIES_LOADED_EVENT when cross-referenced entities are loaded
  useEffect(() => {
    const prevCrossRefLoadedFor = prevCrossRefLoadedForRef.current;
    if (crossRefEntitiesLoadedFor && crossRefEntitiesLoadedFor !== prevCrossRefLoadedFor) {
      // Only fire if primary entities are also loaded
      const expectedCacheKey = `${selectedIds.worldId}-${selectedEntityType}`;
      if (entitiesLoadedFor === expectedCacheKey) {
        dispatchTransitionEvent(ENTITIES_LOADED_EVENT, {
          worldId: selectedIds.worldId,
          entityType: selectedEntityType,
          count: entities.length,
          cacheKey: entitiesLoadedFor,
          crossRefLoaded: true
        });
      }
    }
    prevCrossRefLoadedForRef.current = crossRefEntitiesLoadedFor;
  }, [crossRefEntitiesLoadedFor, entitiesLoadedFor, selectedIds.worldId, selectedEntityType, entities.length]);

  useEffect(() => {
    const prevSessionsLoadedFor = prevSessionsLoadedForRef.current;
    if (sessionsLoadedFor && sessionsLoadedFor !== prevSessionsLoadedFor) {
      dispatchTransitionEvent(SESSIONS_LOADED_EVENT, {
        campaignId: selectedIds.campaignId,
        count: sessions.length,
        cacheKey: sessionsLoadedFor
      });
    }
    prevSessionsLoadedForRef.current = sessionsLoadedFor;
  }, [sessionsLoadedFor, selectedIds.campaignId, sessions.length]);

  useEffect(() => {
    const prevPlayersLoadedFor = prevPlayersLoadedForRef.current;
    if (playersLoadedFor && playersLoadedFor !== prevPlayersLoadedFor) {
      dispatchTransitionEvent(PLAYERS_LOADED_EVENT, {
        campaignId: selectedIds.campaignId,
        count: players.length,
        cacheKey: playersLoadedFor
      });
    }
    prevPlayersLoadedForRef.current = playersLoadedFor;
  }, [playersLoadedFor, selectedIds.campaignId, players.length]);

  useEffect(() => {
    const prevStoryArcsLoadedFor = prevStoryArcsLoadedForRef.current;
    if (storyArcsLoadedFor && storyArcsLoadedFor !== prevStoryArcsLoadedFor) {
      dispatchTransitionEvent(STORY_ARCS_LOADED_EVENT, {
        campaignId: selectedIds.campaignId,
        count: storyArcs.length,
        cacheKey: storyArcsLoadedFor
      });
    }
    prevStoryArcsLoadedForRef.current = storyArcsLoadedFor;
  }, [storyArcsLoadedFor, selectedIds.campaignId, storyArcs.length]);

  useEffect(() => {
    const prevScenesLoadedFor = prevScenesLoadedForRef.current;
    if (scenesLoadedFor && scenesLoadedFor !== prevScenesLoadedFor) {
      dispatchTransitionEvent(SCENES_LOADED_EVENT, {
        sessionId: selectedIds.sessionId,
        count: scenes.length,
        cacheKey: scenesLoadedFor
      });
    }
    prevScenesLoadedForRef.current = scenesLoadedFor;
  }, [scenesLoadedFor, selectedIds.sessionId, scenes.length]);

  useEffect(() => {
    const prevTimelineLoadedFor = prevTimelineLoadedForRef.current;
    if (timelineLoadedFor && timelineLoadedFor !== prevTimelineLoadedFor) {
      dispatchTransitionEvent(TIMELINE_LOADED_EVENT, {
        campaignId: selectedIds.campaignId,
        cacheKey: timelineLoadedFor
      });
    }
    prevTimelineLoadedForRef.current = timelineLoadedFor;
  }, [timelineLoadedFor, selectedIds.campaignId]);

  useEffect(() => {
    const prevUsersLoaded = prevUsersLoadedRef.current;
    if (usersLoaded && !prevUsersLoaded) {
      dispatchTransitionEvent(USERS_LOADED_EVENT, {
        count: users.length
      });
    }
    prevUsersLoadedRef.current = usersLoaded;
  }, [usersLoaded, users.length]);

  useEffect(() => {
    const prevAssetsLoaded = prevAssetsLoadedRef.current;
    if (assetsLoaded && !prevAssetsLoaded) {
      dispatchTransitionEvent(ASSETS_LOADED_EVENT, {
        count: assets.length
      });
    }
    prevAssetsLoadedRef.current = assetsLoaded;
  }, [assetsLoaded, assets.length]);

  // Dispatch error events when error state changes
  useEffect(() => {
    const prevError = prevErrorRef.current;
    
    if (error && !prevError) {
      // Error occurred
      dispatchTransitionEvent(ERROR_OCCURRED_EVENT, {
        message: error,
        timestamp: Date.now()
      });
    } else if (!error && prevError) {
      // Error cleared
      dispatchTransitionEvent(ERROR_CLEARED_EVENT, {
        previousMessage: prevError,
        timestamp: Date.now()
      });
    }
    
    prevErrorRef.current = error;
  }, [error]);

  return {
    // Navigation
    activeTab,
    setActiveTab,
    activeMode,
    setActiveMode,
    planningSubTab,
    setPlanningSubTab,
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
