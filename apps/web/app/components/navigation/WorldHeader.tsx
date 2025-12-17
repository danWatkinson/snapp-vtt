"use client";

import { useHomePage } from "../../../lib/contexts/HomePageContext";
import Button from "../ui/Button";
import Section from "../ui/Section";
import { useMemo, useState } from "react";
import Modal from "../ui/Modal";

export default function WorldHeader() {
  const {
    worlds,
    selectedIds,
    assets,
    activeMode,
    setActiveMode,
    setActiveTab,
    handlers
  } = useHomePage();

  const [worldSettingsOpen, setWorldSettingsOpen] = useState(false);

  const selectedWorldId = selectedIds.worldId;
  const selectedWorld = useMemo(
    () => worlds.find((w) => w.id === selectedWorldId) || null,
    [worlds, selectedWorldId]
  );

  const imageAssets = useMemo(
    () => assets.filter((asset) => asset.mediaType === "image"),
    [assets]
  );

  if (!selectedWorldId || !selectedWorld) return null;

  const splashAsset = assets.find(
    (asset) =>
      asset.mediaType === "image" &&
      asset.id === selectedWorld.splashImageAssetId
  );

  return (
    <>
      <Section>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-20 w-32 overflow-hidden rounded border border-dashed snapp-border bg-slate-50/60 flex items-center justify-center">
              {selectedWorld.splashImageAssetId ? (
                splashAsset ? (
                  <img
                    src={splashAsset.storageUrl}
                    alt={splashAsset.name || splashAsset.originalFileName}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      // Hide broken images gracefully
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      // Show a fallback message
                      const container = target.parentElement;
                      if (container) {
                        container.innerHTML =
                          '<span class="text-xs text-slate-500">Image not found</span>';
                      }
                    }}
                  />
                ) : (
                  <span className="text-xs text-slate-500">
                    Splash image not found
                  </span>
                )
              ) : (
                <span className="px-2 text-xs text-slate-500 text-center">
                  No splash image configured
                </span>
              )}
            </div>
            <div>
              <h3
                className="text-md font-semibold snapp-heading"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {selectedWorld.name}
              </h3>
              {selectedWorld.description && (
                <p className="mt-1 text-sm snapp-muted">
                  {selectedWorld.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeMode === "plan" && (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs snapp-muted">
                Planning mode
              </span>
            )}
            <Button
              size="sm"
              onClick={() => {
                setActiveMode("play");
                setActiveTab("Campaigns");
              }}
            >
              {activeMode === "plan"
                ? "Switch to live play"
                : "Live play mode"}
            </Button>
            <Button
              size="sm"
              onClick={() => setWorldSettingsOpen(true)}
            >
              World settings
            </Button>
          </div>
        </div>
      </Section>

      {worldSettingsOpen && selectedWorld && (
        <Modal
          isOpen={worldSettingsOpen}
          onClose={() => setWorldSettingsOpen(false)}
          title="World Settings"
        >
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold snapp-heading mb-2">
                World Details
              </h4>
              <p className="text-sm snapp-muted">
                <strong>Name:</strong> {selectedWorld.name}
              </p>
              {selectedWorld.description && (
                <p className="text-sm snapp-muted mt-1">
                  <strong>Description:</strong> {selectedWorld.description}
                </p>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold snapp-heading mb-2">
                Splash image
              </h4>
              {selectedWorld.splashImageAssetId ? (
                <div className="space-y-2">
                  {splashAsset && (
                    <div className="flex items-center gap-2">
                      <img
                        src={splashAsset.storageUrl}
                        alt={splashAsset.name || splashAsset.originalFileName}
                        className="h-16 w-16 rounded border snapp-border object-cover"
                      />
                      <span className="text-sm snapp-muted">
                        {splashAsset.name || splashAsset.originalFileName}
                      </span>
                    </div>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      handlers.handleSetWorldSplash(selectedWorld.id, null);
                      setWorldSettingsOpen(false);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              ) : (
                <p className="text-sm snapp-muted">No splash image set</p>
              )}

              {imageAssets.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm snapp-muted mb-2">
                    Select a splash image:
                  </p>
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {imageAssets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => {
                          handlers.handleSetWorldSplash(
                            selectedWorld.id,
                            asset.id
                          );
                          setWorldSettingsOpen(false);
                        }}
                        className="p-2 rounded border snapp-border hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={asset.storageUrl}
                          alt={asset.name || asset.originalFileName}
                          className="w-full h-20 object-cover rounded"
                        />
                        <p className="text-xs snapp-muted mt-1 truncate">
                          {asset.name || asset.originalFileName}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
