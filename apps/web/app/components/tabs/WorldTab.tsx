"use client";

import { useHomePage } from "../../../lib/contexts/HomePageContext";
import { useTabHelpers } from "../../../lib/hooks/useTabHelpers";
import FormField from "../ui/FormField";
import FormActions from "../ui/FormActions";
import Modal from "../ui/Modal";
import Section from "../ui/Section";
import SectionHeader from "../ui/SectionHeader";
import Form from "../ui/Form";
import WorldHeader from "../navigation/WorldHeader";
import Breadcrumb from "../navigation/Breadcrumb";
import CampaignSelection from "./campaigns/CampaignSelection";
import CampaignModals from "./campaigns/CampaignModals";
import { getNameById } from "../../../lib/helpers/entityHelpers";
import { useMemo, useEffect, useCallback } from "react";
import LoadingIndicator from "../ui/LoadingIndicator";
import { useEntityCrossReferences } from "../../../lib/hooks/useEntityCrossReferences";
import WorldSelection from "./WorldSelection";
import EntityTypeFilter from "./EntityTypeFilter";
import EntityList from "./EntityList";
import EntityFormModal from "./EntityFormModal";
import Button from "../ui/Button";

export default function WorldTab() {
  const {
    worlds,
    campaigns,
    selectedIds,
    selectedEntityType,
    entities,
    worldForm,
    entityForm,
    campaignForm,
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
    closeModal
  } = useHomePage();

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
      setEntityLocationId,
      setCampaignName,
      setCampaignSummary
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
      entityLocationId,
      campaignName,
      campaignSummary
    },
    selectionSetters: { setSelectedWorldId },
    modalHandlers: { setWorldModalOpen, setEntityModalOpen, setCampaignModalOpen },
    selectionStates: { selectedWorldId },
    modalStates: { worldModalOpen, entityModalOpen, campaignModalOpen }
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
      },
      campaign: { form: campaignForm, fields: ["name", "summary"], prefix: "campaign" }
    },
    selections: ["worldId"],
    modals: ["world", "entity", "campaign"],
    setSelectionField,
    openModal,
    closeModal,
    selectedIds,
    modalsState: modals
  });

  const selectedWorld = useMemo(
    () => worlds.find((w) => w.id === selectedWorldId) || null,
    [worlds, selectedWorldId]
  );

  // Filter campaigns by selected world
  const worldCampaigns = useMemo(
    () => campaigns.filter((c) => c.worldId === selectedWorldId),
    [campaigns, selectedWorldId]
  );

  // Expose form setters to window for E2E testing
  // TODO: Replace with better test utilities that use data-testid attributes
  // and DOM queries instead of global window properties. This is a temporary
  // workaround to support complex form interactions in tests.
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
            setSelectionField("campaignId", null);
            setSelectedEntityType("all");
            setEntitiesLoadedFor(null);
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
          <WorldHeader />
          <Breadcrumb />
          
          {/* Entities Section (default view) */}
          {!selectedIds.campaignId && (
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
                  Entities
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
          )}

          {/* Campaigns Section */}
          {!selectedIds.campaignId && (
            <Section>
              <div className="flex items-center justify-between mb-2">
                <h3
                  className="text-md font-semibold snapp-heading"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  Campaigns
                </h3>
                <Button
                  size="sm"
                  onClick={() => setCampaignModalOpen(true)}
                >
                  New Campaign
                </Button>
              </div>
              {worldCampaigns.length === 0 ? (
                <p className="text-sm snapp-muted">No campaigns have been created yet for this world.</p>
              ) : (
              <CampaignSelection
                campaigns={worldCampaigns}
                selectedCampaignId={null}
                onCampaignSelect={(campaignId) => {
                  setSelectionField("campaignId", campaignId);
                }}
              />
              )}
            </Section>
          )}
        </section>
      )}

      {/* World creation modal moved to AuthenticatedView so it's always accessible */}

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

      {/* Campaign creation modal */}
      {selectedWorldId && (
        <Modal
          isOpen={campaignModalOpen}
          onClose={() => setCampaignModalOpen(false)}
          title="Create campaign"
        >
          <Form onSubmit={handlers.handleCreateCampaign}>
            <FormField
              label="Campaign name"
              value={campaignName}
              onChange={setCampaignName}
            />
            <FormField
              label="Summary"
              value={campaignSummary}
              onChange={setCampaignSummary}
              type="textarea"
              rows={3}
            />
            <FormActions
              onCancel={() => setCampaignModalOpen(false)}
              submitLabel="Save campaign"
            />
          </Form>
        </Modal>
      )}
    </section>
  );
}
