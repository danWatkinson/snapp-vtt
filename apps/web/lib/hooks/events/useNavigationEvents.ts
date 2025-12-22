import { useEffect, useRef } from "react";
import { dispatchTransitionEvent } from "../../utils/eventDispatcher";
import {
  PLANNING_MODE_ENTERED_EVENT,
  PLANNING_MODE_EXITED_EVENT,
  PLANNING_SUBTAB_CHANGED_EVENT,
  CAMPAIGN_VIEW_CHANGED_EVENT,
  MAIN_TAB_CHANGED_EVENT
} from "../../auth/authEvents";
import type { World } from "../../clients/worldClient";
import type { Campaign } from "../../clients/campaignClient";

interface SelectionIds {
  worldId: string | null;
  campaignId: string | null;
  storyArcId: string | null;
  sessionId: string | null;
  eventId: string;
}

interface UseNavigationEventsProps {
  activeMode: "plan" | "play" | null;
  subTab: "World Entities" | "Campaigns" | "Story Arcs" | "Users";
  campaignView: "sessions" | "players" | "story-arcs" | "timeline" | null;
  activeTab: "World" | "Campaigns" | "Sessions" | "Assets" | "Users" | null;
  selectedIds: SelectionIds;
  worlds: World[];
  campaigns: Campaign[];
}

/**
 * Hook to dispatch navigation-related transition events.
 * Handles mode, sub-tab, campaign view, and main tab change events.
 */
export function useNavigationEvents({
  activeMode,
  subTab,
  campaignView,
  activeTab,
  selectedIds,
  worlds,
  campaigns
}: UseNavigationEventsProps) {
  const prevActiveModeRef = useRef(activeMode);
  const prevSubTabRef = useRef(subTab);
  const prevCampaignViewRef = useRef(campaignView);
  const prevActiveTabRef = useRef(activeTab);

  // Dispatch mode events when activeMode changes
  useEffect(() => {
    const prevActiveMode = prevActiveModeRef.current;
    
    if (activeMode === "plan" && prevActiveMode !== "plan") {
      // Mode entered
      dispatchTransitionEvent(PLANNING_MODE_ENTERED_EVENT, {
        worldId: selectedIds.worldId,
        worldName: worlds.find(w => w.id === selectedIds.worldId)?.name || null,
        subTab: subTab
      });
    } else if (activeMode !== "plan" && prevActiveMode === "plan") {
      // Mode exited
      dispatchTransitionEvent(PLANNING_MODE_EXITED_EVENT, {
        previousWorldId: selectedIds.worldId,
        previousWorldName: worlds.find(w => w.id === selectedIds.worldId)?.name || null
      });
    }
    
    prevActiveModeRef.current = activeMode;
  }, [activeMode, selectedIds.worldId, worlds, subTab]);

  // Dispatch sub-tab change events
  useEffect(() => {
    const prevSubTab = prevSubTabRef.current;
    
    if (subTab !== prevSubTab && activeMode === "plan") {
      // Only dispatch if we're in the appropriate mode
      dispatchTransitionEvent(PLANNING_SUBTAB_CHANGED_EVENT, {
        subTab: subTab,
        previousSubTab: prevSubTab,
        worldId: selectedIds.worldId,
        worldName: worlds.find(w => w.id === selectedIds.worldId)?.name || null
      });
    }
    
    prevSubTabRef.current = subTab;
  }, [subTab, activeMode, selectedIds.worldId, worlds]);

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
}
