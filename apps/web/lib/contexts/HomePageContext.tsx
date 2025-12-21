"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useHomePageState } from "../hooks/useHomePageState";
import { useHomePageData } from "../hooks/useHomePageData";
import { useHomePageHandlers } from "../hooks/useHomePageHandlers";
import { useCustomEvent } from "../hooks/useCustomEvent";
import {
  OPEN_USER_MANAGEMENT_EVENT,
  OPEN_CREATE_WORLD_EVENT,
  OPEN_CREATE_CAMPAIGN_EVENT,
  OPEN_MANAGE_ASSETS_EVENT,
  AUTH_EVENT
} from "../auth/authEvents";
import { AUTH_USERNAME_KEY } from "../auth/authStorage";

type HomePageState = ReturnType<typeof useHomePageState>;
type HomePageHandlers = ReturnType<typeof useHomePageHandlers>;

type HomePageContextType = HomePageState & {
  handlers: HomePageHandlers;
};

const HomePageContext = createContext<HomePageContextType | undefined>(undefined);

export function HomePageProvider({ children }: { children: ReactNode }) {
  const state = useHomePageState();

  const handlers = useHomePageHandlers({
    loginForm: state.loginForm,
    userManagementForm: state.userManagementForm,
    createUserForm: state.createUserForm,
    worldForm: state.worldForm,
    entityForm: state.entityForm,
    campaignForm: state.campaignForm,
    sessionForm: state.sessionForm,
    playerForm: state.playerForm,
    storyArcForm: state.storyArcForm,
    sceneForm: state.sceneForm,
    setIsLoading: state.setIsLoading,
    setError: state.setError,
    setAuthServiceUnavailable: state.setAuthServiceUnavailable,
    setCurrentUser: state.setCurrentUser,
    setActiveTab: state.setActiveTab,
    setActiveMode: state.setActiveMode,
    setPlanningSubTab: state.setPlanningSubTab,
    setSelectedEntityType: state.setSelectedEntityType,
    setWorlds: state.setWorlds,
    setCampaigns: state.setCampaigns,
    setEntities: state.setEntities,
    setSessions: state.setSessions,
    setPlayers: state.setPlayers,
    setStoryArcs: state.setStoryArcs,
    setStoryArcEvents: state.setStoryArcEvents,
    setScenes: state.setScenes,
    setTimeline: state.setTimeline,
    setUsers: state.setUsers,
    setAssets: state.setAssets,
    setAllEvents: state.setAllEvents,
    setUsersLoaded: state.setUsersLoaded,
    setWorldsLoaded: state.setWorldsLoaded,
    setCampaignsLoaded: state.setCampaignsLoaded,
    setAssetsLoaded: state.setAssetsLoaded,
    setEntitiesLoadedFor: state.setEntitiesLoadedFor,
    setCrossRefEntitiesLoadedFor: state.setCrossRefEntitiesLoadedFor,
    setSessionsLoadedFor: state.setSessionsLoadedFor,
    setPlayersLoadedFor: state.setPlayersLoadedFor,
    setStoryArcsLoadedFor: state.setStoryArcsLoadedFor,
    setStoryArcEventsLoadedFor: state.setStoryArcEventsLoadedFor,
    setScenesLoadedFor: state.setScenesLoadedFor,
    setTimelineLoadedFor: state.setTimelineLoadedFor,
    selectedIds: state.selectedIds,
    setSelectionField: state.setSelectionField,
    resetSelection: state.resetSelection,
    currentUser: state.currentUser,
    selectedEntityType: state.selectedEntityType,
    closeModal: state.closeModal
  });

  useHomePageData({
    activeTab: state.activeTab,
    currentUser: state.currentUser,
    selectedIds: state.selectedIds,
    selectedEntityType: state.selectedEntityType,
    campaignView: state.campaignView,
    worlds: state.worlds,
    modals: state.modals,
    usersLoaded: state.usersLoaded,
    worldsLoaded: state.worldsLoaded,
    campaignsLoaded: state.campaignsLoaded,
    entitiesLoadedFor: state.entitiesLoadedFor,
    sessionsLoadedFor: state.sessionsLoadedFor,
    playersLoadedFor: state.playersLoadedFor,
    storyArcsLoadedFor: state.storyArcsLoadedFor,
    storyArcEventsLoadedFor: state.storyArcEventsLoadedFor,
    timelineLoadedFor: state.timelineLoadedFor,
    scenesLoadedFor: state.scenesLoadedFor,
    setUsers: state.setUsers,
    setUsersLoaded: state.setUsersLoaded,
    setWorlds: state.setWorlds,
    setWorldsLoaded: state.setWorldsLoaded,
    setCampaigns: state.setCampaigns,
    setCampaignsLoaded: state.setCampaignsLoaded,
    setEntities: state.setEntities,
    setEntitiesLoadedFor: state.setEntitiesLoadedFor,
    setSessions: state.setSessions,
    setSessionsLoadedFor: state.setSessionsLoadedFor,
    setPlayers: state.setPlayers,
    setPlayersLoadedFor: state.setPlayersLoadedFor,
    setStoryArcs: state.setStoryArcs,
    setStoryArcsLoadedFor: state.setStoryArcsLoadedFor,
    setStoryArcEvents: state.setStoryArcEvents,
    setStoryArcEventsLoadedFor: state.setStoryArcEventsLoadedFor,
    setAllEvents: state.setAllEvents,
    setTimeline: state.setTimeline,
    setTimelineLoadedFor: state.setTimelineLoadedFor,
    setScenes: state.setScenes,
    setScenesLoadedFor: state.setScenesLoadedFor,
    assetsLoaded: state.assetsLoaded,
    setAssets: state.setAssets,
    setAssetsLoaded: state.setAssetsLoaded,
    setError: state.setError
    // Removed onAuthError - assets fetch errors shouldn't trigger logout
    // Only user-initiated actions should trigger logout on auth errors
  });

  // Set up custom event handlers
  useCustomEvent(OPEN_USER_MANAGEMENT_EVENT, () => {
    state.setActiveTab("Users");
    state.setActiveMode(null);
    state.setSelectionField("worldId", null);
  });

  useCustomEvent(OPEN_CREATE_WORLD_EVENT, () => {
    /* c8 ignore next */ // defensive guard; create-world event is only fired for authenticated users
    if (!state.currentUser) return;
    state.setActiveTab("World");
    state.setActiveMode("plan");
    state.openModal("world");
  });

  useCustomEvent(OPEN_CREATE_CAMPAIGN_EVENT, () => {
    /* c8 ignore next */ // defensive guard; create-campaign event is only fired for authenticated users in a world
    if (!state.currentUser || !state.selectedIds.worldId) return;
    state.setActiveTab("Campaigns");
    state.setActiveMode("plan");
    state.setPlanningSubTab("Campaigns");
    state.openModal("campaign");
  });

  useCustomEvent(OPEN_MANAGE_ASSETS_EVENT, () => {
    if (!state.currentUser) return;
    state.setActiveTab("Assets");
    state.setActiveMode(null);
  });

  // Ensure localStorage is cleared if currentUser is null on initialization
  // This prevents stale authentication state from showing "Log out" button
  // when the user is actually not authenticated
  // Only run on mount, not on every currentUser change, to avoid clearing
  // localStorage during legitimate state transitions
  useEffect(() => {
    /* c8 ignore next */ // SSR guard
    if (typeof window === "undefined") return;
    
    // Only clear on initial mount if currentUser is null
    // This handles the case where the page loads with stale localStorage
    // but we don't want to clear it during normal state transitions
    const stored = window.localStorage.getItem(AUTH_USERNAME_KEY);
    if (!state.currentUser && stored) {
      // Clear stale localStorage entry
      window.localStorage.removeItem(AUTH_USERNAME_KEY);
      // Don't dispatch AUTH_EVENT here - it would clear currentUser in the listener
      // Instead, just let useAuthUser sync naturally when it reads from localStorage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Listen for AUTH_EVENT to sync currentUser state when logout happens elsewhere
  useCustomEvent(AUTH_EVENT, (event: Event) => {
    const custom = event as CustomEvent<{ username: string | null }>;
    if (!custom.detail.username) {
      // Logout detected - clear all state
      state.setCurrentUser(null);
      state.setActiveTab(null);
      state.setActiveMode(null);
      state.setPlanningSubTab("World Entities");
      state.resetSelection();
      state.setSelectedEntityType("all");
      state.setError(null);
      // Clear all data
      state.setWorlds([]);
      state.setCampaigns([]);
      state.setEntities([]);
      state.setSessions([]);
      state.setPlayers([]);
      state.setStoryArcs([]);
      state.setStoryArcEvents([]);
      state.setScenes([]);
      state.setTimeline(null);
      state.setUsers([]);
      state.setAssets([]);
      state.setAllEvents([]);
      // Reset loaded flags
      state.setUsersLoaded(false);
      state.setWorldsLoaded(false);
      state.setCampaignsLoaded(false);
      state.setAssetsLoaded(false);
      state.setEntitiesLoadedFor(null);
      state.setSessionsLoadedFor(null);
      state.setPlayersLoadedFor(null);
      state.setStoryArcsLoadedFor(null);
      state.setStoryArcEventsLoadedFor(null);
      state.setScenesLoadedFor(null);
      state.setTimelineLoadedFor(null);
    }
  });

  return (
    <HomePageContext.Provider value={{ ...state, handlers }}>
      {children}
    </HomePageContext.Provider>
  );
}

export function useHomePage() {
  const context = useContext(HomePageContext);
  if (context === undefined) {
    throw new Error("useHomePage must be used within a HomePageProvider");
  }
  return context;
}
