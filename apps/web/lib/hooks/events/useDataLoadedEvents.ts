import { useEffect, useRef } from "react";
import { dispatchTransitionEvent } from "../../utils/eventDispatcher";
import {
  WORLDS_LOADED_EVENT,
  CAMPAIGNS_LOADED_EVENT,
  ENTITIES_LOADED_EVENT,
  SESSIONS_LOADED_EVENT,
  PLAYERS_LOADED_EVENT,
  STORY_ARCS_LOADED_EVENT,
  SCENES_LOADED_EVENT,
  TIMELINE_LOADED_EVENT,
  USERS_LOADED_EVENT,
  ASSETS_LOADED_EVENT
} from "../../auth/authEvents";
import type { WorldEntity } from "../../clients/worldClient";
import type { User } from "../../clients/authClient";
import type { Campaign, Session, StoryArc, Timeline, Scene } from "../../clients/campaignClient";
import type { DigitalAsset } from "../../clients/assetsClient";

interface SelectionIds {
  worldId: string | null;
  campaignId: string | null;
  storyArcId: string | null;
  sessionId: string | null;
  eventId: string;
}

interface UseDataLoadedEventsProps {
  // Loaded flags
  worldsLoaded: boolean;
  campaignsLoaded: boolean;
  entitiesLoadedFor: string | null;
  crossRefEntitiesLoadedFor: string | null;
  sessionsLoadedFor: string | null;
  playersLoadedFor: string | null;
  storyArcsLoadedFor: string | null;
  scenesLoadedFor: string | null;
  timelineLoadedFor: string | null;
  usersLoaded: boolean;
  assetsLoaded: boolean;
  
  // Data arrays
  worlds: unknown[];
  campaigns: Campaign[];
  entities: WorldEntity[];
  sessions: Session[];
  players: string[];
  storyArcs: StoryArc[];
  scenes: Scene[];
  users: User[];
  assets: DigitalAsset[];
  
  // Context
  selectedIds: SelectionIds;
  selectedEntityType: "all" | "location" | "creature" | "faction" | "event";
}

/**
 * Hook to dispatch data-loaded transition events when loaded flags change.
 * Handles all data loading events for worlds, campaigns, entities, sessions, etc.
 */
export function useDataLoadedEvents({
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
}: UseDataLoadedEventsProps) {
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
}
