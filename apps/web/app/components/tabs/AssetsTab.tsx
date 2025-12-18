"use client";

import { useState } from "react";
import Heading from "../ui/Heading";
import Section from "../ui/Section";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import Modal from "../ui/Modal";
import { useHomePage } from "../../../lib/contexts/HomePageContext";
import { createAsset, type DigitalAsset } from "../../../lib/clients/assetsClient";
import { dispatchTransitionEvent } from "../../../lib/utils/eventDispatcher";
import { ASSET_UPLOADED_EVENT } from "../../../lib/auth/authEvents";

function ImageViewer({ asset }: { asset: DigitalAsset }) {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <p className="text-snapp-muted">Failed to load image</p>
    );
  }

  return (
    <img
      src={asset.storageUrl}
      alt={asset.name || asset.originalFileName}
      className="max-w-full max-h-[80vh] object-contain rounded"
      onError={() => setImageError(true)}
    />
  );
}

export default function AssetsTab() {
  const { assets, currentUser, setAssets, setError } = useHomePage();
  const [viewingAsset, setViewingAsset] = useState<DigitalAsset | null>(null);

  if (!currentUser) {
    return null;
  }

  const hasAssets = assets && assets.length > 0;

  return (
    <Section data-component="AssetsTab">
      <div className="flex items-center justify-between gap-2 mb-4">
        <Heading>Assets</Heading>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm snapp-muted">
            <span>Upload asset</span>
            <input
              type="file"
              aria-label="Upload asset"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file || !currentUser) return;

                try {
                  // Upload the file to our API route which saves it and creates the asset record
                  const formData = new FormData();
                  formData.append("file", file);
                  
                  const res = await fetch("/api/upload-asset", {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${currentUser.token}`
                    },
                    body: formData
                  });

                  if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(errorText || "Failed to upload asset");
                  }

                  const asset = await res.json();
                  setAssets([...assets, asset]);
                  // Dispatch asset uploaded event
                  Promise.resolve().then(() => {
                    dispatchTransitionEvent(ASSET_UPLOADED_EVENT, {
                      assetId: asset.id,
                      assetName: asset.name || asset.originalFileName,
                      mediaType: asset.mediaType
                    });
                  });
                } catch (err) {
                  const message =
                    err instanceof Error ? err.message : "Failed to upload asset";
                  setError(message);
                } finally {
                  event.target.value = "";
                }
              }}
            />
          </label>
        </div>
      </div>

      {!hasAssets ? (
        <EmptyState message="No assets have been uploaded yet. Use the Upload asset button to add images or audio files for your worlds and scenes." />
      ) : (
        <div className="overflow-x-auto rounded border snapp-border bg-white snapp-surface">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold snapp-heading">
                  Preview
                </th>
                <th className="px-4 py-2 text-left font-semibold snapp-heading">
                  Name
                </th>
                <th className="px-4 py-2 text-left font-semibold snapp-heading">
                  File
                </th>
                <th className="px-4 py-2 text-left font-semibold snapp-heading">
                  Type
                </th>
                <th className="px-4 py-2 text-left font-semibold snapp-heading">
                  Size
                </th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id} className="border-t snapp-border">
                  <td className="px-4 py-2">
                    {asset.mediaType === "image" ? (
                      <button
                        type="button"
                        onClick={() => setViewingAsset(asset)}
                        className="block"
                        aria-label={`View ${asset.name || asset.originalFileName}`}
                      >
                        <img
                          src={asset.storageUrl}
                          alt={asset.name || asset.originalFileName}
                          className="h-12 w-12 object-cover rounded border snapp-border cursor-pointer hover:opacity-80 transition-opacity"
                          onError={(e) => {
                            // Fallback if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            if (target.parentElement) {
                              target.parentElement.textContent = "—";
                            }
                          }}
                        />
                      </button>
                    ) : (
                      <span className="text-snapp-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{asset.name}</td>
                  <td className="px-4 py-2">{asset.originalFileName}</td>
                  <td className="px-4 py-2 capitalize">{asset.mediaType}</td>
                  <td className="px-4 py-2">
                    {asset.sizeBytes
                      ? `${(asset.sizeBytes / 1024).toFixed(1)} KB`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewingAsset && viewingAsset.mediaType === "image" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setViewingAsset(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={viewingAsset.name || viewingAsset.originalFileName}
            className="w-full max-w-4xl rounded-lg border p-4 shadow-lg snapp-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-medium snapp-heading" style={{ fontFamily: "'Cinzel', serif" }}>
                {viewingAsset.name || viewingAsset.originalFileName}
              </h2>
              <button
                type="button"
                onClick={() => setViewingAsset(null)}
                className="text-snapp-muted hover:text-snapp-heading"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex justify-center">
              <ImageViewer asset={viewingAsset} />
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}

