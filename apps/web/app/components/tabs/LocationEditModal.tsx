"use client";

import { useMemo, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import type { WorldEntity } from "../../../lib/clients/worldClient";
import type { DigitalAsset } from "../../../lib/clients/assetsClient";

interface LocationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: WorldEntity | null;
  assets: DigitalAsset[];
  onSetImage: (locationId: string, assetId: string | null) => Promise<void>;
  worldId: string;
}

export default function LocationEditModal({
  isOpen,
  onClose,
  location,
  assets,
  onSetImage,
  worldId
}: LocationEditModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  
  // Hooks must be called unconditionally, before any early returns
  const imageAssets = useMemo(
    () => assets.filter((asset) => asset.mediaType === "image"),
    [assets]
  );

  const currentImageAsset = useMemo(
    () => location && assets.find(
      (asset) =>
        asset.mediaType === "image" &&
        asset.id === location.imageAssetId
    ),
    [assets, location]
  );

  if (!isOpen || !location) return null;

  const handleImageSelect = async (assetId: string | null) => {
    setIsSaving(true);
    try {
      await onSetImage(location.id, assetId);
      onClose();
    } catch (error) {
      // Error handling is done in the handler
      console.error("Failed to set location image:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit location"
      aria-label="Edit location"
    >
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold snapp-heading mb-2">
            Location Details
          </h4>
          <p className="text-sm snapp-muted">
            <strong>Name:</strong> {location.name}
          </p>
          {location.summary && (
            <p className="text-sm snapp-muted mt-1">
              <strong>Summary:</strong> {location.summary}
            </p>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold snapp-heading mb-2">
            Image
          </h4>
          {location.imageAssetId ? (
            <div className="space-y-2">
              {currentImageAsset && (
                <div className="flex items-center gap-2">
                  <img
                    src={currentImageAsset.storageUrl}
                    alt={currentImageAsset.name || currentImageAsset.originalFileName}
                    className="h-16 w-16 rounded border snapp-border object-cover"
                  />
                  <span className="text-sm snapp-muted">
                    {currentImageAsset.name || currentImageAsset.originalFileName}
                  </span>
                </div>
              )}
              <Button
                size="sm"
                onClick={() => handleImageSelect(null)}
                disabled={isSaving}
              >
                Clear
              </Button>
            </div>
          ) : (
            <p className="text-sm snapp-muted">No image set</p>
          )}

          {imageAssets.length > 0 && (
            <div className="mt-3">
              <p className="text-sm snapp-muted mb-2">
                Select an image:
              </p>
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {imageAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => handleImageSelect(asset.id)}
                    disabled={isSaving}
                    className="p-2 rounded border snapp-border hover:opacity-80 transition-opacity disabled:opacity-50"
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
  );
}
