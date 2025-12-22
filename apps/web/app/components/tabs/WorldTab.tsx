"use client";

import { useHomePage } from "../../../lib/contexts/HomePageContext";
import { useTabHelpers } from "../../../lib/hooks/useTabHelpers";
import FormField from "../ui/FormField";
import FormActions from "../ui/FormActions";
import Modal from "../ui/Modal";
import Section from "../ui/Section";
import SectionHeader from "../ui/SectionHeader";
import Form from "../ui/Form";
import WorldHeaderWithTabs from "../navigation/WorldHeaderWithTabs";
import { getNameById } from "../../../lib/helpers/entityHelpers";
import { useMemo, useEffect, useCallback } from "react";
import LoadingIndicator from "../ui/LoadingIndicator";
import { useEntityCrossReferences } from "../../../lib/hooks/useEntityCrossReferences";
import WorldSelection from "./WorldSelection";
import EntityTypeFilter from "./EntityTypeFilter";
import EntityList from "./EntityList";
import EntityFormModal from "./EntityFormModal";

export default function WorldTab() {
  const {
    worlds,
    selectedIds,
    selectedEntityType,
    entities,
    worldForm,
    entityForm,
    modals,
    handlers,
    setSelectionField,
    setSelectedEntityType,
    setEntitiesLoadedFor,
    entitiesLoadedFor,
    crossRefEntitiesLoadedFor,
    setCrossRefEntitiesLoadedFor,
    setEntities,
    openModal,
    closeModal,
    setActiveMode,
    setActiveTab,
    setSubTab
  } = useHomePage();

  // Wrapper functions for modal handlers to match useTabHelpers signature
  const openModalWrapper = useCallback((key: string) => openModal(key as any), [openModal]);
  const closeModalWrapper = useCallback((key: string) => closeModal(key as any), [closeModal]);

  // Use tab helpers to consolidate setup
  const {
    formSetters: {
      setWorldName,
      setWorldDescription,
      setEntityName,
      setEntitySummary,
      setEntityBeginningTimestamp,
      setEntityEndingTimestamp,
      setEntityParentLocationId,
      setEntityRelationshipTargetId,
      setEntityRelationshipType,
      setEntityLocationId
    },
    formValues: {
      worldName,
      worldDescription,
      entityName,
      entitySummary,
      entityBeginningTimestamp,
      entityEndingTimestamp,
      entityRelationshipTargetId,
      entityRelationshipType,
      entityLocationId
    },
    selectionSetters: { setSelectedWorldId },
    modalHandlers: { setWorldModalOpen, setEntityModalOpen },
    selectionStates: { selectedWorldId },
    modalStates: { worldModalOpen, entityModalOpen }
  } = useTabHelpers({
    forms: {
      world: { form: worldForm, fields: ["name", "description"], prefix: "world" },
      entity: {
        form: entityForm,
        fields: [
          "name",
          "summary",
          "beginningTimestamp",
          "endingTimestamp",
          "relationshipTargetId",
          "relationshipType",
          "locationId"
        ],
        prefix: "entity"
      }
    },
    selections: ["worldId"],
    modals: ["world", "entity"],
    setSelectionField,
    openModal: openModalWrapper,
    closeModal: closeModalWrapper,
    selectedIds,
    modalsState: modals
  });

  const selectedWorld = useMemo(
    () => worlds.find((w) => w.id === selectedWorldId) || null,
    [worlds, selectedWorldId]
  );

  // Expose form setters to window for E2E testing
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__testFormSetters = {
        setEntityRelationshipTargetId,
        setEntityRelationshipType,
        setEntityLocationId,
        setEntityName,
        setEntitySummary
      };
      (window as any).__testFormValues = {
        entityRelationshipTargetId,
        entityRelationshipType,
        entityLocationId,
        entityName,
        entitySummary,
        entityForm: entityForm.form
      };
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__testFormSetters;
        delete (window as any).__testFormValues;
      }
    };
  }, [
    setEntityRelationshipTargetId,
    setEntityRelationshipType,
    setEntityLocationId,
    setEntityName,
    setEntitySummary,
    entityRelationshipTargetId,
    entityRelationshipType,
    entityLocationId,
    entityName,
    entitySummary,
    entityForm
  ]);

  // Use cross-reference loading hook
  const { isLoadingCrossRef, loadingMessage } = useEntityCrossReferences({
    selectedWorldId: selectedIds.worldId,
    selectedEntityType,
    entities,
    setEntities,
    entitiesLoadedFor,
    crossRefEntitiesLoadedFor,
    setCrossRefEntitiesLoadedFor
  });

  return (
    <section data-component="WorldTab" className="space-y-4">
      <LoadingIndicator isLoading={isLoadingCrossRef} message={loadingMessage} />
      
      {/* World selection UI (only shown if no world is selected) */}
      {!selectedIds.worldId && (
        <WorldSelection
          worlds={worlds}
          selectedWorldId={selectedIds.worldId}
          onWorldSelect={(worldId) => {
            setSelectionField("worldId", worldId);
            setSelectedEntityType("all");
            setEntitiesLoadedFor(null);
            setActiveMode("plan");
            setActiveTab("World");
            setSubTab("World Entities");
          }}
          onEntityTypeReset={() => {
            setSelectedEntityType("all");
            setEntitiesLoadedFor(null);
          }}
        />
      )}

      {/* Main content when world is selected */}
      {selectedIds.worldId && selectedWorld && (
        <section aria-label={getNameById(worlds, selectedWorldId, "") ?? undefined}>
          <WorldHeaderWithTabs />
          <Section>
            <EntityTypeFilter
              selectedType={selectedEntityType}
              onTypeChange={(type) => {
                setSelectedEntityType(type);
                setEntitiesLoadedFor(null);
              }}
            />

            <div className="flex items-center justify-between">
              <h3
                className="text-md font-semibold snapp-heading"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                Entities for {getNameById(worlds, selectedWorldId, "selected world")}
              </h3>
            </div>

            <SectionHeader
              level={4}
              className="text-sm font-medium"
              action={
                selectedEntityType !== "all"
                  ? {
                      label: `Add ${selectedEntityType}`,
                      onClick: () => setEntityModalOpen(true),
                      size: "xs"
                    }
                  : undefined
              }
            >
              {selectedEntityType === "all" ? "All Entities" : 
               selectedEntityType === "location" ? "Locations" :
               selectedEntityType === "creature" ? "Creatures" :
               selectedEntityType === "faction" ? "Factions" : "Events"}
            </SectionHeader>

            <EntityList
              entities={entities}
              selectedEntityType={selectedEntityType}
              showTypeLabel={selectedEntityType === "all"}
            />
          </Section>
        </section>
      )}

      {/* World creation modal */}
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

      {/* Entity creation modal */}
      {selectedWorldId && selectedEntityType !== "all" && (
        <EntityFormModal
          isOpen={entityModalOpen}
          onClose={() => setEntityModalOpen(false)}
          entityType={selectedEntityType}
          entities={entities}
          name={entityName}
          summary={entitySummary}
          relationshipTargetId={entityRelationshipTargetId}
          relationshipType={entityRelationshipType}
          locationId={entityLocationId}
          beginningTimestamp={entityBeginningTimestamp}
          endingTimestamp={entityEndingTimestamp}
          onNameChange={setEntityName}
          onSummaryChange={setEntitySummary}
          onRelationshipTargetChange={setEntityRelationshipTargetId}
          onRelationshipTypeChange={setEntityRelationshipType}
          onLocationIdChange={setEntityLocationId}
          onBeginningTimestampChange={setEntityBeginningTimestamp}
          onEndingTimestampChange={setEntityEndingTimestamp}
          onSubmit={handlers.handleCreateEntity}
        />
      )}
    </section>
  );
}
