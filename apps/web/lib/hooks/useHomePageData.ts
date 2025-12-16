import {
  useCampaigns,
  useCampaignSessions,
  useCampaignPlayers,
  useStoryArcs,
  useStoryArcEvents,
  useSessionScenes,
  useWorldEntities,
  useWorlds,
  useUsers,
  useTimeline,
  useAllWorldEvents
} from "./useDataFetching";
import { listUsers } from "../clients/authClient";
import { fetchWorlds, fetchWorldEntities } from "../clients/worldClient";
import {
  fetchCampaigns,
  fetchCampaignSessions,
  fetchSessionScenes,
  fetchCampaignPlayers,
  fetchStoryArcs,
  fetchStoryArcEvents,
  fetchTimeline
} from "../clients/campaignClient";
import type { LoginResponse } from "../clients/authClient";

interface UseHomePageDataProps {
  activeTab: "World" | "Campaigns" | "Sessions" | "Users" | null;
  currentUser: LoginResponse | null;
  selectedIds: {
    worldId: string | null;
    campaignId: string | null;
    storyArcId: string | null;
    sessionId: string | null;
    eventId: string;
  };
  selectedEntityType: "all" | "location" | "creature" | "faction" | "event";
  campaignView: "sessions" | "players" | "story-arcs" | "timeline" | null;
  worlds: any[];
  modals: Record<string, boolean>;
  
  // Data state
  usersLoaded: boolean;
  worldsLoaded: boolean;
  campaignsLoaded: boolean;
  entitiesLoadedFor: string | null;
  sessionsLoadedFor: string | null;
  playersLoadedFor: string | null;
  storyArcsLoadedFor: string | null;
  storyArcEventsLoadedFor: string | null;
  timelineLoadedFor: string | null;
  scenesLoadedFor: string | null;
  
  // Setters
  setUsers: (users: any[]) => void;
  setUsersLoaded: (loaded: boolean) => void;
  setWorlds: (worlds: any[]) => void;
  setWorldsLoaded: (loaded: boolean) => void;
  setCampaigns: (campaigns: any[]) => void;
  setCampaignsLoaded: (loaded: boolean) => void;
  setEntities: (entities: any[]) => void;
  setEntitiesLoadedFor: (key: string | null) => void;
  setSessions: (sessions: any[]) => void;
  setSessionsLoadedFor: (key: string | null) => void;
  setPlayers: (players: string[]) => void;
  setPlayersLoadedFor: (key: string | null) => void;
  setStoryArcs: (arcs: any[]) => void;
  setStoryArcsLoadedFor: (key: string | null) => void;
  setStoryArcEvents: (events: string[]) => void;
  setStoryArcEventsLoadedFor: (key: string | null) => void;
  setAllEvents: (events: any[]) => void;
  setTimeline: (timeline: any) => void;
  setTimelineLoadedFor: (key: string | null) => void;
  setScenes: (scenes: any[]) => void;
  setScenesLoadedFor: (key: string | null) => void;
  setError: (error: string | null) => void;
}

/**
 * Hook to manage all data fetching for the HomePage component.
 * Consolidates all data fetching hook calls into a single hook.
 */
export function useHomePageData(props: UseHomePageDataProps) {
  const {
    activeTab,
    currentUser,
    selectedIds,
    selectedEntityType,
    campaignView,
    worlds,
    modals,
    usersLoaded,
    worldsLoaded,
    campaignsLoaded,
    entitiesLoadedFor,
    sessionsLoadedFor,
    playersLoadedFor,
    storyArcsLoadedFor,
    storyArcEventsLoadedFor,
    timelineLoadedFor,
    scenesLoadedFor,
    setUsers,
    setUsersLoaded,
    setWorlds,
    setWorldsLoaded,
    setCampaigns,
    setCampaignsLoaded,
    setEntities,
    setEntitiesLoadedFor,
    setSessions,
    setSessionsLoadedFor,
    setPlayers,
    setPlayersLoadedFor,
    setStoryArcs,
    setStoryArcsLoadedFor,
    setStoryArcEvents,
    setStoryArcEventsLoadedFor,
    setAllEvents,
    setTimeline,
    setTimelineLoadedFor,
    setScenes,
    setScenesLoadedFor,
    setError
  } = props;

  useUsers(
    activeTab,
    currentUser,
    usersLoaded,
    listUsers,
    setUsers,
    setUsersLoaded,
    setError
  );

  useWorlds(
    currentUser,
    worldsLoaded,
    fetchWorlds,
    setWorlds,
    setWorldsLoaded,
    setError
  );

  useWorldEntities(
    selectedIds.worldId,
    selectedEntityType,
    entitiesLoadedFor,
    fetchWorldEntities,
    setEntities,
    setEntitiesLoadedFor,
    setError
  );

  useCampaigns(
    activeTab,
    campaignsLoaded,
    fetchCampaigns,
    setCampaigns,
    setCampaignsLoaded,
    setError
  );

  useCampaignSessions(
    selectedIds.campaignId,
    sessionsLoadedFor,
    fetchCampaignSessions,
    setSessions,
    setSessionsLoadedFor,
    setError
  );

  useCampaignPlayers(
    selectedIds.campaignId,
    playersLoadedFor,
    fetchCampaignPlayers,
    setPlayers,
    setPlayersLoadedFor,
    setError
  );

  useStoryArcs(
    selectedIds.campaignId,
    storyArcsLoadedFor,
    fetchStoryArcs,
    setStoryArcs,
    setStoryArcsLoadedFor,
    setError
  );

  useTimeline(
    selectedIds.campaignId,
    timelineLoadedFor,
    campaignView,
    worlds,
    fetchTimeline,
    fetchStoryArcs,
    fetchStoryArcEvents,
    fetchWorldEntities,
    setTimeline,
    setTimelineLoadedFor,
    setStoryArcs,
    setAllEvents,
    setError
  );

  useStoryArcEvents(
    selectedIds.storyArcId,
    storyArcEventsLoadedFor,
    worlds,
    fetchStoryArcEvents,
    fetchWorldEntities,
    setStoryArcEvents,
    setStoryArcEventsLoadedFor,
    setAllEvents,
    setError
  );

  useAllWorldEvents(
    modals.storyArcEvent,
    worlds,
    fetchWorldEntities,
    setAllEvents,
    setError
  );

  useSessionScenes(
    selectedIds.sessionId,
    scenesLoadedFor,
    fetchSessionScenes,
    setScenes,
    setScenesLoadedFor,
    setError
  );
}
