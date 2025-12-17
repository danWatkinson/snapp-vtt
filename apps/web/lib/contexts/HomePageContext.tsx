"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useHomePageState } from "../hooks/useHomePageState";
import { useHomePageData } from "../hooks/useHomePageData";
import { useHomePageHandlers } from "../hooks/useHomePageHandlers";
import { useCustomEvent } from "../hooks/useCustomEvent";
import {
  OPEN_USER_MANAGEMENT_EVENT,
  OPEN_CREATE_WORLD_EVENT
} from "../auth/authEvents";

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
    setUsersLoaded: state.setUsersLoaded,
    setEntitiesLoadedFor: state.setEntitiesLoadedFor,
    setSessionsLoadedFor: state.setSessionsLoadedFor,
    setPlayersLoadedFor: state.setPlayersLoadedFor,
    setStoryArcsLoadedFor: state.setStoryArcsLoadedFor,
    setStoryArcEventsLoadedFor: state.setStoryArcEventsLoadedFor,
    setScenesLoadedFor: state.setScenesLoadedFor,
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
    setError: state.setError
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
