"use client";

import WorldTab from "./tabs/WorldTab";
import CampaignsTab from "./tabs/CampaignsTab";
import SessionsTab from "./tabs/SessionsTab";
import UsersTab from "./tabs/UsersTab";
import ModeSelector from "./navigation/ModeSelector";
import PlanningTabs from "./navigation/PlanningTabs";
import ToastNotifications from "./ui/ToastNotifications";
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

      {activeTab === "Users" && currentUser && <UsersTab />}

      <ToastNotifications
        status={status}
        error={error}
        isLoading={isLoading}
        onDismissError={() => setError(null)}
      />
    </section>
  );
}
