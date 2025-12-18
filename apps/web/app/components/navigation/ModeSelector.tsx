"use client";

import { useTransition, useState } from "react";
import { useHomePage } from "../../../lib/contexts/HomePageContext";
import Heading from "../ui/Heading";
import TabButton from "../ui/TabButton";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import TabList from "../ui/TabList";
import Section from "../ui/Section";
import { getNameById } from "../../../lib/helpers/entityHelpers";

function WorldSplashThumbnail({ 
  splashAsset 
}: { 
  splashAsset: { storageUrl: string; name?: string; originalFileName?: string };
}) {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded border border-dashed snapp-border text-[10px] leading-none text-slate-500 bg-slate-50/60">
        —
      </span>
    );
  }

  return (
    <img
      src={splashAsset.storageUrl}
      alt={splashAsset.name || splashAsset.originalFileName}
      className="h-6 w-6 rounded border snapp-border object-cover"
      onError={() => setImageError(true)}
    />
  );
}

export default function ModeSelector() {
  const {
    worlds,
    assets,
    selectedIds,
    setSelectionField,
    setSelectedEntityType,
    setEntitiesLoadedFor,
    setActiveMode,
    setActiveTab,
    setPlanningSubTab
  } = useHomePage();

  const selectedWorldId = selectedIds.worldId;
  const [isPending, startTransition] = useTransition();

  const onSelectWorld = (worldId: string) => {
    // Use startTransition to batch all state updates and mark them as non-urgent
    // This prevents the updates from triggering unnecessary recompiles
    startTransition(() => {
      setSelectionField("worldId", worldId);
      setSelectedEntityType("all");
      setEntitiesLoadedFor(null);
      setActiveMode("plan");
      setActiveTab("World");
      setPlanningSubTab("World Entities");
    });
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
              const splashAsset = assets.find(
                (asset) =>
                  asset.mediaType === "image" &&
                  asset.id === world.splashImageAssetId
              );
              return (
                <TabButton
                  key={world.id}
                  isActive={isActive}
                  onClick={() => onSelectWorld(world.id)}
                >
                  <span className="flex items-center gap-2">
                    {splashAsset ? (
                      <WorldSplashThumbnail splashAsset={splashAsset} />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded border border-dashed snapp-border text-[10px] leading-none text-slate-500 bg-slate-50/60">
                        —
                      </span>
                    )}
                    <span>{world.name}</span>
                  </span>
                </TabButton>
              );
            })}
          </TabList>
        </>
      )}
    </Section>
  );
}
