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
import { useEffect, useRef } from "react";
import { fetchAssets } from "../clients/assetsClient";
import { isAuthError } from "../auth/authErrors";

interface UseHomePageDataProps {
  activeTab: "World" | "Campaigns" | "Sessions" | "Assets" | "Users" | null;
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
  assetsLoaded: boolean;
  
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
  setAssets: (assets: any[]) => void;
  setAssetsLoaded: (loaded: boolean) => void;
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
    assetsLoaded,
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
    setAssets,
    setAssetsLoaded,
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

  // Assets: load when user is authenticated, and refetch when user changes
  // Use useEffect to avoid race conditions with state updates
  // IMPORTANT: Don't trigger logout on assets fetch failure - assets service might not be available
  // in all environments (like tests). Only logout on explicit auth errors from user actions.
  const lastUserIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!currentUser || !currentUser.user) {
      // Clear assets when user logs out or user data is incomplete
      setAssets([]);
      setAssetsLoaded(false);
      lastUserIdRef.current = null;
      return;
    }
    
    const currentUserId = currentUser.user.username;
    
    // If user changed, reset the loaded flag to trigger a refetch
    if (lastUserIdRef.current !== null && lastUserIdRef.current !== currentUserId) {
      setAssetsLoaded(false);
      setAssets([]);
    }
    
    lastUserIdRef.current = currentUserId;
    
    // Only fetch if we haven't loaded assets for this user yet
    if (assetsLoaded) {
      return;
    }
    
    let cancelled = false;
    
    fetchAssets(currentUser.token)
      .then((assets) => {
        if (!cancelled) {
          setAssets(assets);
          setAssetsLoaded(true);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        
        // Don't logout on assets fetch errors - assets service might not be running
        // in test environments. Assets are optional, so we silently fail.
        // Only user-initiated actions should trigger logout on auth errors.
        // Don't set error for asset fetch failures - they're non-critical and
        // the assets service might not be available in all environments
        // setError(message);
      });
    
    return () => {
      cancelled = true;
    };
  }, [currentUser, assetsLoaded, setAssets, setAssetsLoaded]);
}
