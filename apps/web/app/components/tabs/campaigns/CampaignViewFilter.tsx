"use client";

import TabList from "../../ui/TabList";
import TabButton from "../../ui/TabButton";

interface CampaignViewFilterProps {
  campaignView: "sessions" | "players" | "story-arcs" | "timeline" | null;
  onViewChange: (view: "sessions" | "players" | "story-arcs" | "timeline" | null) => void;
}

export default function CampaignViewFilter({
  campaignView,
  onViewChange
}: CampaignViewFilterProps) {
  const views = [
    { key: "story-arcs", label: "Story arcs" },
    { key: "sessions", label: "Sessions" },
    { key: "players", label: "Players" },
    { key: "timeline", label: "Timeline" }
  ];

  return (
    <TabList aria-label="Campaign views" variant="filter">
      {views.map((view) => {
        const isActive = campaignView === view.key;
        return (
          <TabButton
            key={view.key}
            isActive={isActive}
            onClick={() => onViewChange(view.key as "sessions" | "players" | "story-arcs" | "timeline" | null)}
          >
            {view.label}
          </TabButton>
        );
      })}
    </TabList>
  );
}
