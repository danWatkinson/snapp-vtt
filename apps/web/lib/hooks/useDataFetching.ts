import { useEffect } from "react";
import { isAuthError } from "../auth/authErrors";

/**
 * Hook to fetch campaigns when the Campaigns tab is active.
 * Fetches campaigns for the selected world using server-side filtering.
 */
export function useCampaigns(
  activeTab: string | null,
  campaignsLoaded: boolean,
  selectedWorldId: string | null,
  fetchCampaignsByWorld: (worldId: string) => Promise<any[]>,
  setCampaigns: (campaigns: any[]) => void,
  setCampaignsLoaded: (loaded: boolean) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (activeTab !== "Campaigns" || campaignsLoaded) return;
    // Campaigns require a world - only fetch if world is selected
    if (!selectedWorldId) {
      setCampaigns([]);
      setCampaignsLoaded(true);
      return;
    }
    (async () => {
      try {
        // Fetch campaigns for the selected world
        const existing = await fetchCampaignsByWorld(selectedWorldId);
        setCampaigns(existing);
        setCampaignsLoaded(true);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [activeTab, campaignsLoaded, selectedWorldId, fetchCampaignsByWorld, setCampaigns, setCampaignsLoaded, setError]);
}

/**
 * Hook to fetch campaign sessions.
 */
export function useCampaignSessions(
  selectedCampaignId: string | null,
  sessionsLoadedFor: string | null,
  fetchCampaignSessions: (campaignId: string) => Promise<any[]>,
  setSessions: (sessions: any[]) => void,
  setSessionsLoadedFor: (key: string | null) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (!selectedCampaignId) return;
    if (sessionsLoadedFor === selectedCampaignId) return;
    (async () => {
      try {
        const loaded = await fetchCampaignSessions(selectedCampaignId);
        setSessions(loaded);
        setSessionsLoadedFor(selectedCampaignId);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedCampaignId, sessionsLoadedFor, fetchCampaignSessions, setSessions, setSessionsLoadedFor, setError]);
}

/**
 * Hook to fetch campaign players.
 */
export function useCampaignPlayers(
  selectedCampaignId: string | null,
  playersLoadedFor: string | null,
  fetchCampaignPlayers: (campaignId: string) => Promise<string[]>,
  setPlayers: (players: string[]) => void,
  setPlayersLoadedFor: (key: string | null) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (!selectedCampaignId) return;
    if (playersLoadedFor === selectedCampaignId) return;
    (async () => {
      try {
        const loaded = await fetchCampaignPlayers(selectedCampaignId);
        setPlayers(loaded);
        setPlayersLoadedFor(selectedCampaignId);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedCampaignId, playersLoadedFor, fetchCampaignPlayers, setPlayers, setPlayersLoadedFor, setError]);
}

/**
 * Hook to fetch story arcs for a campaign.
 */
export function useStoryArcs(
  selectedCampaignId: string | null,
  storyArcsLoadedFor: string | null,
  fetchStoryArcs: (campaignId: string) => Promise<any[]>,
  setStoryArcs: (arcs: any[]) => void,
  setStoryArcsLoadedFor: (key: string | null) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (!selectedCampaignId) return;
    if (storyArcsLoadedFor === selectedCampaignId) return;
    (async () => {
      try {
        const loaded = await fetchStoryArcs(selectedCampaignId);
        setStoryArcs(loaded);
        setStoryArcsLoadedFor(selectedCampaignId);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedCampaignId, storyArcsLoadedFor, fetchStoryArcs, setStoryArcs, setStoryArcsLoadedFor, setError]);
}

/**
 * Hook to fetch story arc events.
 */
export function useStoryArcEvents(
  selectedStoryArcId: string | null,
  storyArcEventsLoadedFor: string | null,
  worlds: any[],
  fetchStoryArcEvents: (arcId: string) => Promise<string[]>,
  fetchWorldEntities: (worldId: string, type: string) => Promise<any[]>,
  setStoryArcEvents: (events: string[]) => void,
  setStoryArcEventsLoadedFor: (key: string | null) => void,
  setAllEvents: (events: any[]) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (!selectedStoryArcId) return;
    if (storyArcEventsLoadedFor === selectedStoryArcId) return;
    (async () => {
      try {
        const loaded = await fetchStoryArcEvents(selectedStoryArcId);
        setStoryArcEvents(loaded);
        setStoryArcEventsLoadedFor(selectedStoryArcId);
        // Load event details for display
        const allWorldsEvents: any[] = [];
        for (const world of worlds) {
          const events = await fetchWorldEntities(world.id, "event");
          allWorldsEvents.push(...events);
        }
        setAllEvents(allWorldsEvents);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedStoryArcId, storyArcEventsLoadedFor, worlds, fetchStoryArcEvents, fetchWorldEntities, setStoryArcEvents, setStoryArcEventsLoadedFor, setAllEvents, setError]);
}

/**
 * Hook to fetch session scenes.
 */
export function useSessionScenes(
  selectedSessionId: string | null,
  scenesLoadedFor: string | null,
  fetchSessionScenes: (sessionId: string) => Promise<any[]>,
  setScenes: (scenes: any[]) => void,
  setScenesLoadedFor: (key: string | null) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (!selectedSessionId) return;
    if (scenesLoadedFor === selectedSessionId) return;
    (async () => {
      try {
        const loaded = await fetchSessionScenes(selectedSessionId);
        setScenes(loaded);
        setScenesLoadedFor(selectedSessionId);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedSessionId, scenesLoadedFor, fetchSessionScenes, setScenes, setScenesLoadedFor, setError]);
}

/**
 * Hook to fetch world entities.
 */
export function useWorldEntities(
  selectedWorldId: string | null,
  selectedEntityType: "all" | "location" | "creature" | "faction" | "event",
  entitiesLoadedFor: string | null,
  fetchWorldEntities: (worldId: string, type?: string) => Promise<any[]>,
  setEntities: (entities: any[]) => void,
  setEntitiesLoadedFor: (key: string | null) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (!selectedWorldId) return;
    const cacheKey = `${selectedWorldId}-${selectedEntityType}`;
    if (entitiesLoadedFor === cacheKey) return;
    (async () => {
      try {
        // If "all", fetch without type filter; otherwise filter by type
        const loaded = selectedEntityType === "all"
          ? await fetchWorldEntities(selectedWorldId)
          : await fetchWorldEntities(selectedWorldId, selectedEntityType);
        
        // Preserve entities of types that aren't being fetched (e.g., events when fetching locations)
        // This ensures cross-referenced entities aren't lost when switching tabs
        setEntities((prev) => {
          console.log('[useDataFetching] Fetching entities:', {
            entityType: selectedEntityType,
            fetchedCount: loaded.length,
            prevCount: prev.length
          });
          
          // Create a Map of fetched entities by ID
          const entityMap = new Map<string, typeof loaded[0]>();
          loaded.forEach(entity => entityMap.set(entity.id, entity));
          
          // Preserve entities of other types (e.g., events when fetching locations, locations when fetching events)
          prev.forEach(existingEntity => {
            if (existingEntity.type !== selectedEntityType) {
              // Entity is of a different type - preserve it if not in fetched list
              if (!entityMap.has(existingEntity.id)) {
                entityMap.set(existingEntity.id, existingEntity);
              }
            } else if (!entityMap.has(existingEntity.id)) {
              // Entity is of the same type but not in fetched list - keep it (newly created, not yet in backend)
              entityMap.set(existingEntity.id, existingEntity);
            }
          });
          
          const finalEntities = Array.from(entityMap.values());
          console.log('[useDataFetching] Final entities:', {
            totalCount: finalEntities.length
          });
          
          return finalEntities;
        });
        
        setEntitiesLoadedFor(cacheKey);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedWorldId, selectedEntityType, entitiesLoadedFor, fetchWorldEntities, setEntities, setEntitiesLoadedFor, setError]);
}

/**
 * Hook to fetch worlds.
 */
export function useWorlds(
  currentUser: any,
  worldsLoaded: boolean,
  fetchWorlds: () => Promise<any[]>,
  setWorlds: (worlds: any[]) => void,
  setWorldsLoaded: (loaded: boolean) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (!currentUser || worldsLoaded) return;
    (async () => {
      try {
        const existing = await fetchWorlds();
        setWorlds(existing);
        setWorldsLoaded(true);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [currentUser, worldsLoaded, fetchWorlds, setWorlds, setWorldsLoaded, setError]);
}

/**
 * Hook to fetch users (admin only).
 */
export function useUsers(
  activeTab: string | null,
  currentUser: any,
  usersLoaded: boolean,
  listUsers: (token: string) => Promise<any[]>,
  setUsers: (users: any[]) => void,
  setUsersLoaded: (loaded: boolean) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (activeTab !== "Users" || !currentUser) {
      setUsersLoaded(false);
      return;
    }
    if (!currentUser.user.roles.includes("admin")) {
      setUsersLoaded(false);
      return;
    }
    if (usersLoaded) return;
    (async () => {
      try {
        const loaded = await listUsers(currentUser.token);
        setUsers(loaded);
        setUsersLoaded(true);
      } catch (err) {
        // Don't logout on users fetch errors - might be service unavailable
        // Only user-initiated actions should trigger logout on auth errors
        setError((err as Error).message);
        setUsersLoaded(false);
      }
    })();
  }, [activeTab, currentUser, usersLoaded, listUsers, setUsers, setUsersLoaded, setError]);
}

/**
 * Hook to fetch timeline data (complex - loads timeline, story arcs, and events).
 */
export function useTimeline(
  selectedCampaignId: string | null,
  timelineLoadedFor: string | null,
  campaignView: string | null,
  worlds: any[],
  fetchTimeline: (campaignId: string) => Promise<any>,
  fetchStoryArcs: (campaignId: string) => Promise<any[]>,
  fetchStoryArcEvents: (arcId: string) => Promise<string[]>,
  fetchWorldEntities: (worldId: string, type: string) => Promise<any[]>,
  setTimeline: (timeline: any) => void,
  setTimelineLoadedFor: (key: string | null) => void,
  setStoryArcs: (arcs: any[]) => void,
  setAllEvents: (events: any[]) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (!selectedCampaignId) return;
    if (timelineLoadedFor === selectedCampaignId) return;
    if (campaignView !== "timeline") return;
    (async () => {
      try {
        const loaded = await fetchTimeline(selectedCampaignId);
        setTimeline(loaded);
        setTimelineLoadedFor(selectedCampaignId);
        // Also load story arcs and their events for timeline display
        const arcs = await fetchStoryArcs(selectedCampaignId);
        setStoryArcs(arcs);
        // Load all events from all story arcs
        const allEventIds = new Set<string>();
        for (const arc of arcs) {
          const eventIds = await fetchStoryArcEvents(arc.id);
          eventIds.forEach((id) => allEventIds.add(id));
        }
        // Load event details from all worlds
        const allWorldsEvents: any[] = [];
        for (const world of worlds) {
          const events = await fetchWorldEntities(world.id, "event");
          allWorldsEvents.push(...events);
        }
        // Filter to only events in story arcs
        const timelineEvents = allWorldsEvents.filter((e: any) =>
          allEventIds.has(e.id)
        );
        setAllEvents(timelineEvents);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedCampaignId, timelineLoadedFor, campaignView, worlds, fetchTimeline, fetchStoryArcs, fetchStoryArcEvents, fetchWorldEntities, setTimeline, setTimelineLoadedFor, setStoryArcs, setAllEvents, setError]);
}

/**
 * Hook to load all world events when story arc event modal opens.
 */
export function useAllWorldEvents(
  storyArcEventModalOpen: boolean,
  worlds: any[],
  fetchWorldEntities: (worldId: string, type: string) => Promise<any[]>,
  setAllEvents: (events: any[]) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (!storyArcEventModalOpen) return;
    // Load all events from all worlds when opening the modal
    (async () => {
      try {
        const allWorldsEvents: any[] = [];
        for (const world of worlds) {
          const events = await fetchWorldEntities(world.id, "event");
          allWorldsEvents.push(...events);
        }
        setAllEvents(allWorldsEvents);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [storyArcEventModalOpen, worlds, fetchWorldEntities, setAllEvents, setError]);
}
