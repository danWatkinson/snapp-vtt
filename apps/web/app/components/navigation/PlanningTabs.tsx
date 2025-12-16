"use client";

import { useHomePage } from "../../../lib/contexts/HomePageContext";
import TabButton from "../ui/TabButton";
import TabList from "../ui/TabList";

export default function PlanningTabs() {
  const {
    worlds,
    selectedIds,
    planningSubTab,
    setPlanningSubTab,
    setActiveTab
  } = useHomePage();

  const selectedWorldId = selectedIds.worldId;
  const selectedWorldName = worlds.find((w) => w.id === selectedWorldId)?.name ?? null;

  if (!selectedWorldId) return null;

  const onSelectTab = (tab: "World Entities" | "Campaigns" | "Story Arcs" | "Users") => {
    setPlanningSubTab(tab);
    if (tab === "World Entities") setActiveTab("World");
    if (tab === "Campaigns" || tab === "Story Arcs") setActiveTab("Campaigns");
    if (tab === "Users") setActiveTab("Users");
  };

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold snapp-heading">
        Planning views for {selectedWorldName ?? "selected world"}
      </h3>
      <TabList aria-label="World planning views" variant="planning">
        {(["World Entities", "Campaigns", "Story Arcs", "Users"] as const).map(
          (label) => {
            const isActive = planningSubTab === label;
            return (
              <TabButton
                key={label}
                isActive={isActive}
                onClick={() => onSelectTab(label)}
                variant="planning"
              >
                {label}
              </TabButton>
            );
          }
        )}
      </TabList>
    </section>
  );
}
