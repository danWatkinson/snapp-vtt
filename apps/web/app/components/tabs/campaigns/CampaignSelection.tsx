"use client";

import TabList from "../../ui/TabList";
import TabButton from "../../ui/TabButton";
import EmptyState from "../../ui/EmptyState";
import type { Campaign } from "../../../../lib/clients/campaignClient";

interface CampaignSelectionProps {
  campaigns: Campaign[];
  selectedCampaignId: string | null;
  subTab: "World Entities" | "Campaigns" | "Story Arcs" | "Users";
  onCampaignSelect: (campaignId: string) => void;
}

export default function CampaignSelection({
  campaigns,
  selectedCampaignId,
  subTab,
  onCampaignSelect
}: CampaignSelectionProps) {
  if (campaigns.length === 0) {
    return <EmptyState message="No campaigns have been created yet." />;
  }

  return (
    <TabList aria-label="Campaigns" variant="planning">
      {campaigns.map((camp) => {
        const isActive = selectedCampaignId === camp.id;
        return (
          <TabButton
            key={camp.id}
            isActive={isActive}
            onClick={() => onCampaignSelect(camp.id)}
            style={!isActive ? { color: "#fefce8" } : undefined}
          >
            {camp.name}
          </TabButton>
        );
      })}
    </TabList>
  );
}
