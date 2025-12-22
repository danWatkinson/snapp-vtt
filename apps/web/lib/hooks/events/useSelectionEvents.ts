import { useEffect, useRef } from "react";
import { dispatchTransitionEvent } from "../../utils/eventDispatcher";
import {
  WORLD_SELECTED_EVENT,
  WORLD_DESELECTED_EVENT,
  CAMPAIGN_SELECTED_EVENT,
  CAMPAIGN_DESELECTED_EVENT
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

interface UseSelectionEventsProps {
  selectedIds: SelectionIds;
  worlds: World[];
  campaigns: Campaign[];
}

/**
 * Hook to dispatch selection-related transition events when selectedIds changes.
 * Handles world and campaign selection/deselection events.
 */
export function useSelectionEvents({
  selectedIds,
  worlds,
  campaigns
}: UseSelectionEventsProps) {
  const prevSelectedIdsRef = useRef(selectedIds);

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
}
