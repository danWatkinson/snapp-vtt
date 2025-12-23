"use client";

import { useHomePage } from "../../../lib/contexts/HomePageContext";
import { getNameById } from "../../../lib/helpers/entityHelpers";

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export default function Breadcrumb() {
  const {
    worlds,
    campaigns,
    selectedIds,
    setSelectionField
  } = useHomePage();

  const { worldId, campaignId, sessionId } = selectedIds;

  if (!worldId) return null;

  const worldName = getNameById(worlds, worldId, "");
  const campaignName = campaignId ? getNameById(campaigns, campaignId, "") : null;

  const items: BreadcrumbItem[] = [
    {
      label: worldName || "World",
      onClick: () => {
        setSelectionField("worldId", worldId);
        setSelectionField("campaignId", null);
        setSelectionField("sessionId", null);
      }
    }
  ];

  if (campaignId && campaignName) {
    items.push({
      label: campaignName,
      onClick: () => {
        setSelectionField("campaignId", campaignId);
        setSelectionField("sessionId", null);
      }
    });
  }

  // TODO: Add Session and Scene to breadcrumb when those views are implemented
  // if (sessionId) {
  //   items.push({ label: sessionName });
  // }
  // if (sceneId) {
  //   items.push({ label: sceneName });
  // }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <span className="text-slate-400">/</span>}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="text-sm font-normal text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-slate-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
