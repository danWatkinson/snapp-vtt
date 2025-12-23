"use client";

import WorldTab from "./tabs/WorldTab";
import CampaignView from "./tabs/CampaignView";
import UsersTab from "./tabs/UsersTab";
import AssetsTab from "./tabs/AssetsTab";
import ModeSelector from "./navigation/ModeSelector";
import { useHomePage } from "../../lib/contexts/HomePageContext";
import Modal from "./ui/Modal";
import Form from "./ui/Form";
import FormField from "./ui/FormField";
import FormActions from "./ui/FormActions";
import { useTabHelpers } from "../../lib/hooks/useTabHelpers";
import { useCallback } from "react";

export default function AuthenticatedView() {
  const {
    selectedIds,
    currentUser,
    activeTab,
    worldForm,
    modals,
    handlers,
    openModal,
    closeModal,
    setSelectionField
  } = useHomePage();

  // Get world form state and modal handlers
  const {
    formSetters: { setWorldName, setWorldDescription },
    formValues: { worldName, worldDescription },
    modalHandlers: { setWorldModalOpen },
    modalStates: { worldModalOpen }
  } = useTabHelpers({
    forms: {
      world: { form: worldForm, fields: ["name", "description"], prefix: "world" }
    },
    modals: ["world"],
    setSelectionField,
    openModal,
    closeModal,
    selectedIds,
    modalsState: modals
  });

  // Show Users or Assets when accessed via menu
  if (activeTab === "Users") {
    return <UsersTab />;
  }
  
  if (activeTab === "Assets") {
    return <AssetsTab />;
  }

  // Main navigation based on selectedIds
  return (
    <>
      <section className="space-y-6">
        {!selectedIds.worldId && <ModeSelector />}

        {selectedIds.worldId && !selectedIds.campaignId && <WorldTab />}

        {selectedIds.worldId && selectedIds.campaignId && <CampaignView />}
      </section>

      {/* World creation modal - always available, even when no world is selected */}
      <Modal
        isOpen={worldModalOpen}
        onClose={() => setWorldModalOpen(false)}
        title="Create world"
      >
        <Form onSubmit={handlers.handleCreateWorld}>
          <FormField
            label="World name"
            value={worldName}
            onChange={setWorldName}
          />
          <FormField
            label="Description"
            value={worldDescription}
            onChange={setWorldDescription}
            type="textarea"
            rows={3}
          />
          <FormActions
            onCancel={() => setWorldModalOpen(false)}
            submitLabel="Save world"
          />
        </Form>
      </Modal>
    </>
  );
}
