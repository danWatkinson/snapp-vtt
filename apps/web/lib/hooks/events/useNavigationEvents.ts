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
  planningSubTab: "World Entities" | "Campaigns" | "Story Arcs" | "Users";
  campaignView: "sessions" | "players" | "story-arcs" | "timeline" | null;
  activeTab: "World" | "Campaigns" | "Sessions" | "Assets" | "Users" | null;
  selectedIds: SelectionIds;
  worlds: World[];
  campaigns: Campaign[];
}

/**
 * Hook to dispatch navigation-related transition events.
 * Handles planning mode, sub-tab, campaign view, and main tab change events.
 */
export function useNavigationEvents({
  activeMode,
  planningSubTab,
  campaignView,
  activeTab,
  selectedIds,
  worlds,
  campaigns
}: UseNavigationEventsProps) {
  const prevActiveModeRef = useRef(activeMode);
  const prevPlanningSubTabRef = useRef(planningSubTab);
  const prevCampaignViewRef = useRef(campaignView);
  const prevActiveTabRef = useRef(activeTab);

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
}
