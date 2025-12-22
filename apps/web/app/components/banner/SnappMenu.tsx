"use client";

import { useState, useEffect, useRef } from "react";
import { useHomePage } from "../../../lib/contexts/HomePageContext";
import {
  OPEN_USER_MANAGEMENT_EVENT,
  OPEN_CREATE_WORLD_EVENT,
  OPEN_CREATE_CAMPAIGN_EVENT,
  OPEN_MANAGE_ASSETS_EVENT
} from "../../../lib/auth/authEvents";

function dispatchOpenUserManagement() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_USER_MANAGEMENT_EVENT));
  }
}

function dispatchOpenCreateWorld() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_CREATE_WORLD_EVENT));
  }
}

function dispatchOpenCreateCampaign() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_CREATE_CAMPAIGN_EVENT));
  }
}

function dispatchOpenManageAssets() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_MANAGE_ASSETS_EVENT));
  }
}

export default function SnappMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { selectedIds, setSelectionField, setActiveMode, setActiveTab, setSubTab, currentUser } = useHomePage();
  const lastUserIdRef = useRef<string | null>(null);
  
  // Close menu when user changes to ensure menu items reflect new user's roles
  useEffect(() => {
    const currentUserId = currentUser?.user.username || null;
    if (lastUserIdRef.current !== null && lastUserIdRef.current !== currentUserId) {
      setMenuOpen(false);
    }
    lastUserIdRef.current = currentUserId;
  }, [currentUser]);

  const handleLeaveWorld = () => {
    setSelectionField("worldId", null);
    setActiveMode(null);
    setActiveTab(null);
    setSubTab("World Entities");
    setMenuOpen(false);
  };

  const handleLeaveCampaign = () => {
    setSelectionField("campaignId", null);
    setMenuOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="flex items-center gap-1 rounded px-2 py-1 text-sm font-semibold hover:opacity-90 snapp-heading"
        style={{ fontFamily: "'Cinzel', serif" }}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-expanded={menuOpen}
        aria-haspopup="true"
      >
        <span>Snapp</span>
        <span className="text-xs">▼</span>
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            className="absolute left-0 top-full mt-1 z-20 min-w-[180px] rounded-lg border shadow-lg snapp-panel"
            style={{
              borderColor: "#6b5438",
              backgroundColor: "#faf8f3"
            }}
          >
            {currentUser?.user.roles.includes("admin") && (
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm hover:opacity-80 transition-colors"
                style={{ color: "#3d2817" }}
                onClick={() => {
                  dispatchOpenUserManagement();
                  setMenuOpen(false);
                }}
              >
                User Management
              </button>
            )}
            {/* Show Manage Assets to users with admin or gm role (World Builders) */}
            {currentUser && (currentUser.user.roles.includes("admin") || currentUser.user.roles.includes("gm")) && (
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm hover:opacity-80 transition-colors"
                style={{ color: "#3d2817" }}
                onClick={() => {
                  dispatchOpenManageAssets();
                  setMenuOpen(false);
                }}
              >
                Manage Assets
              </button>
            )}
            {/* Show Create world to users with admin or gm role (World Builders) */}
            {currentUser && (currentUser.user.roles.includes("admin") || currentUser.user.roles.includes("gm")) && (
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm hover:opacity-80 transition-colors"
                style={{ color: "#3d2817" }}
                onClick={() => {
                  dispatchOpenCreateWorld();
                  setMenuOpen(false);
                }}
              >
                Create world
              </button>
            )}
            {/* World-specific menu items - only show when a world is selected */}
            {selectedIds.worldId && currentUser && (
              <>
                {/* Show New Campaign to users with admin or gm role, and only when a world is selected */}
                {(currentUser.user.roles.includes("admin") || currentUser.user.roles.includes("gm")) && (
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 text-sm hover:opacity-80 transition-colors border-t"
                    style={{ 
                      color: "#3d2817",
                      borderColor: "#6b5438"
                    }}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent overlay from closing menu before event fires
                      dispatchOpenCreateCampaign();
                      setMenuOpen(false);
                    }}
                  >
                    New Campaign
                  </button>
                )}
                {/* Show Leave Campaign only when a campaign is selected */}
                {selectedIds.campaignId && (
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 text-sm hover:opacity-80 transition-colors border-t"
                    style={{ 
                      color: "#3d2817",
                      borderColor: "#6b5438"
                    }}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent overlay from closing menu before event fires
                      handleLeaveCampaign();
                    }}
                  >
                    Leave Campaign
                  </button>
                )}
                {/* Show Leave World when a world is selected (available to all authenticated users) */}
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm hover:opacity-80 transition-colors border-t"
                  style={{ 
                    color: "#3d2817",
                    borderColor: "#6b5438"
                  }}
                  onClick={handleLeaveWorld}
                >
                  Leave World
                </button>
              </>
            )}
          </nav>
        </>
      )}
    </div>
  );
}

