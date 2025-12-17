"use client";

import { useHomePage } from "../../../lib/contexts/HomePageContext";
import { useTabHelpers } from "../../../lib/hooks/useTabHelpers";
import FormField from "../ui/FormField";
import FormActions from "../ui/FormActions";
import Modal from "../ui/Modal";
import Heading from "../ui/Heading";
import TabButton from "../ui/TabButton";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import ListItem from "../ui/ListItem";
import TabList from "../ui/TabList";
import Section from "../ui/Section";
import SectionHeader from "../ui/SectionHeader";
import ListContainer from "../ui/ListContainer";
import Form from "../ui/Form";
import WorldPlanningHeader from "../navigation/WorldPlanningHeader";
import { getNameById, getEntityTypeLabel } from "../../../lib/helpers/entityHelpers";
import { useMemo } from "react";

export default function WorldTab() {
  const {
    worlds,
    selectedIds,
    selectedEntityType,
    entities,
    assets,
    worldForm,
    entityForm,
    modals,
    handlers,
    setSelectionField,
    setSelectedEntityType,
    setEntitiesLoadedFor,
    openModal,
    closeModal
  } = useHomePage();

  // Use tab helpers to consolidate setup (now includes modal/selection states)
  const {
    formSetters: {
      setWorldName,
      setWorldDescription,
      setEntityName,
      setEntitySummary,
      setEntityBeginningTimestamp,
      setEntityEndingTimestamp
    },
    formValues: {
      worldName,
      worldDescription,
      entityName,
      entitySummary,
      entityBeginningTimestamp,
      entityEndingTimestamp
    },
    selectionSetters: { setSelectedWorldId },
    modalHandlers: { setWorldModalOpen, setEntityModalOpen },
    selectionStates: { selectedWorldId },
    modalStates: { worldModalOpen, entityModalOpen }
  } = useTabHelpers({
    forms: {
      world: { form: worldForm, fields: ["name", "description"], prefix: "world" },
      entity: { form: entityForm, fields: ["name", "summary", "beginningTimestamp", "endingTimestamp"], prefix: "entity" }
    },
    selections: ["worldId"],
    modals: ["world", "entity"],
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

  return (
    <section data-component="WorldTab" className="space-y-4">
      {/* Only show world selection UI if no world is selected yet (legacy mode) */}
      {!selectedWorldId && (
        <>
          <SectionHeader>Worlds</SectionHeader>

          {worlds.length > 0 && (
            <TabList aria-label="Worlds" variant="planning">
              {worlds.map((world) => {
                const isActive = selectedWorldId === world.id;
                return (
                  <TabButton
                    key={world.id}
                    isActive={isActive}
                    onClick={() => {
                      setSelectedWorldId(world.id);
                      setSelectedEntityType("all");
                      setEntitiesLoadedFor(null);
                    }}
                    style={!isActive ? { color: "#fefce8" } : undefined}
                  >
                    {world.name}
                  </TabButton>
                );
              })}
            </TabList>
          )}

          {worlds.length === 0 && (
            <EmptyState message="No worlds have been created yet." />
          )}
        </>
      )}

      {selectedWorldId && selectedWorld && (
        <>
          <WorldPlanningHeader />
          <Section>
            <TabList aria-label="Entity types" variant="filter">
              {(["all", "location", "creature", "faction", "event"] as const).map(
                (type) => {
                  const isActive = selectedEntityType === type;
                  return (
                    <TabButton
                      key={type}
                      isActive={isActive}
                      onClick={() => {
                        setSelectedEntityType(type);
                        setEntitiesLoadedFor(null);
                      }}
                      className="capitalize"
                    >
                      {type === "all"
                        ? "All"
                        : type === "location"
                        ? "Locations"
                        : type === "creature"
                        ? "Creatures"
                        : type === "faction"
                        ? "Factions"
                        : "Events"}
                    </TabButton>
                  );
                }
              )}
            </TabList>

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
              {selectedEntityType === "all" ? "All Entities" : getEntityTypeLabel(selectedEntityType)}
            </SectionHeader>

            <ListContainer
              items={entities}
              emptyMessage={
                selectedEntityType === "all"
                  ? "No entities have been added to this world yet."
                  : `No ${selectedEntityType}s have been added to this world yet.`
              }
            >
              {entities.map((entity) => (
                <ListItem key={entity.id}>
                  <div className="flex items-start gap-2">
                    {selectedEntityType === "all" && (
                      <span className="rounded px-2 py-0.5 text-xs capitalize snapp-pill">
                        {entity.type}
                      </span>
                    )}
                    <div className="flex-1">
                      <div className="font-semibold">{entity.name}</div>
                      {entity.summary && (
                        <p className="text-xs" style={{ color: "#5a4232" }}>
                          {entity.summary}
                        </p>
                      )}
                    </div>
                  </div>
                </ListItem>
              ))}
            </ListContainer>
          </Section>
        </>
      )}

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


      {entityModalOpen && selectedWorldId && selectedEntityType !== "all" && (
        <Modal
          isOpen={entityModalOpen}
          onClose={() => setEntityModalOpen(false)}
          title={`Add ${selectedEntityType}`}
          variant="styled"
          aria-label={`Add ${selectedEntityType}`}
        >
          <Form onSubmit={handlers.handleCreateEntity}>
              <FormField
                label={`${selectedEntityType} name`}
                value={entityName}
                onChange={setEntityName}
                inputClassName="capitalize"
                style={{
                  borderColor: "#8b6f47",
                  backgroundColor: "#faf8f3",
                  color: "#2c1810",
                }}
              />
              <FormField
                label="Summary"
                value={entitySummary}
                onChange={setEntitySummary}
                type="textarea"
                rows={3}
                inputClassName=""
                style={{
                  borderColor: "#8b6f47",
                  backgroundColor: "#faf8f3",
                  color: "#2c1810",
                }}
              />
              {selectedEntityType === "event" && (
                <>
                  <label className="block text-sm">
                    Beginning timestamp
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      style={{
                        borderColor: "#8b6f47",
                        backgroundColor: "#faf8f3",
                        color: "#2c1810",
                      }}
                      value={entityBeginningTimestamp}
                      onChange={(e) =>
                        setEntityBeginningTimestamp(e.target.value)
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    Ending timestamp
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      style={{
                        borderColor: "#8b6f47",
                        backgroundColor: "#faf8f3",
                        color: "#2c1810",
                      }}
                      value={entityEndingTimestamp}
                      onChange={(e) =>
                        setEntityEndingTimestamp(e.target.value)
                      }
                    />
                  </label>
                </>
              )}
            <FormActions
              onCancel={() => setEntityModalOpen(false)}
              submitLabel={`Save ${selectedEntityType}`}
              variant="styled"
            />
          </Form>
        </Modal>
      )}
    </section>
  );
}
