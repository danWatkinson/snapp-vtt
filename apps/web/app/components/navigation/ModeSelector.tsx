"use client";

import { useHomePage } from "../../../lib/contexts/HomePageContext";
import Heading from "../ui/Heading";
import TabButton from "../ui/TabButton";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import TabList from "../ui/TabList";
import Section from "../ui/Section";
import { getNameById } from "../../../lib/helpers/entityHelpers";

export default function ModeSelector() {
  const {
    worlds,
    selectedIds,
    activeMode,
    setSelectionField,
    setSelectedEntityType,
    setEntitiesLoadedFor,
    setActiveMode,
    setActiveTab,
    setPlanningSubTab
  } = useHomePage();

  const selectedWorldId = selectedIds.worldId;

  const onSelectWorld = (worldId: string) => {
    setSelectionField("worldId", worldId);
    setSelectedEntityType("all");
    setEntitiesLoadedFor(null);
    setActiveMode("plan");
    setActiveTab("World");
    setPlanningSubTab("World Entities");
  };

  const onSwitchToLivePlay = () => {
    setActiveMode("play");
    setActiveTab("Campaigns");
  };
  return (
    <Section
      data-component="ModeSelector"
    >
      <Heading>World context and mode</Heading>

      {worlds.length === 0 ? (
        <div className="space-y-2">
          <EmptyState message="No worlds have been created yet. Use the Snapp menu to create a world and start planning or running a session." />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm snapp-muted">
              Choose a world to work in. All planning and live play will use
              this world as context.
            </p>
          </div>
          <TabList aria-label="World context" flexWrap>
            {worlds.map((world) => {
              const isActive = selectedWorldId === world.id;
              return (
                <TabButton
                  key={world.id}
                  isActive={isActive}
                  onClick={() => onSelectWorld(world.id)}
                >
                  {world.name}
                </TabButton>
              );
            })}
          </TabList>
        </>
      )}

      {selectedWorldId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm snapp-muted">
              Working in{" "}
              <span className="font-semibold">
                {getNameById(worlds, selectedWorldId, "selected world")}
              </span>
              {activeMode === "plan" && " (planning mode)."}
            </p>
            <div className="flex items-center gap-2">
              {activeMode === "plan" && (
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs snapp-muted">
                  Planning mode
                </span>
              )}
              <Button onClick={onSwitchToLivePlay}>
                {activeMode === "plan"
                  ? "Switch to live play"
                  : "Live play mode"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}
