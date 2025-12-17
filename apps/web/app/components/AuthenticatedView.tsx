"use client";

import WorldTab from "./tabs/WorldTab";
import CampaignsTab from "./tabs/CampaignsTab";
import SessionsTab from "./tabs/SessionsTab";
import UsersTab from "./tabs/UsersTab";
import AssetsTab from "./tabs/AssetsTab";
import ModeSelector from "./navigation/ModeSelector";
import PlanningTabs from "./navigation/PlanningTabs";
import { useHomePage } from "../../lib/contexts/HomePageContext";

export default function AuthenticatedView() {
  const {
    activeTab,
    activeMode,
    selectedIds,
    currentUser,
    status,
    error,
    isLoading,
    setError
  } = useHomePage();

  return (
    <section className="space-y-6">
      <ModeSelector />

      {activeMode === "plan" && selectedIds.worldId && (
        <PlanningTabs />
      )}

      {activeTab === "World" && <WorldTab />}

      {activeTab === "Campaigns" && <CampaignsTab />}

      {activeTab === "Sessions" && <SessionsTab />}

      {activeTab === "Assets" && <AssetsTab />}

      {activeTab === "Users" && currentUser && <UsersTab />}
    </section>
  );
}
