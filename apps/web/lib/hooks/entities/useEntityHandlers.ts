import type { FormEvent } from "react";
import {
  CREATURE_CREATED_EVENT,
  FACTION_CREATED_EVENT,
  LOCATION_CREATED_EVENT,
  EVENT_CREATED_EVENT,
  ENTITIES_LOADED_EVENT
} from "../../auth/authEvents";
import { dispatchTransitionEvent } from "../../utils/eventDispatcher";
import {
  createWorldEntity,
  addLocationRelationship,
  addEventRelationship,
  addFactionRelationship,
  fetchWorldEntities
} from "../../clients/worldClient";
import { withAsyncAction } from "../useAsyncAction";

interface UseEntityHandlersProps {
  entityForm: {
    form: {
      name: string;
      summary: string;
      beginningTimestamp: string;
      endingTimestamp: string;
      relationshipTargetId: string;
      relationshipType: string;
      locationId: string;
    };
    resetForm: () => void;
  };
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setEntities: React.Dispatch<React.SetStateAction<any[]>>;
  setEntitiesLoadedFor: (key: string | null) => void;
  setCrossRefEntitiesLoadedFor: (key: string | null) => void;
  closeModal: (name: string) => void;
  currentUser: { token: string } | null;
  selectedIds: { worldId?: string };
  selectedEntityType: "location" | "creature" | "faction" | "event";
  handleLogout: () => void;
}

/**
 * Handlers for entity operations (create entity with relationships).
 * This is the most complex handler due to relationship management.
 */
export function useEntityHandlers({
  entityForm,
  setIsLoading,
  setError,
  setEntities,
  setEntitiesLoadedFor,
  setCrossRefEntitiesLoadedFor,
  closeModal,
  currentUser,
  selectedIds,
  selectedEntityType,
  handleLogout
}: UseEntityHandlersProps) {
  async function handleCreateEntity(e: FormEvent) {
    e.preventDefault();
    if (!selectedIds.worldId || selectedEntityType === "all") {
      return;
    }

    try {
      const beginningTimestamp =
        selectedEntityType === "event" && entityForm.form.beginningTimestamp
          ? new Date(entityForm.form.beginningTimestamp).getTime()
          : undefined;
      const endingTimestamp =
        selectedEntityType === "event" && entityForm.form.endingTimestamp
          ? new Date(entityForm.form.endingTimestamp).getTime()
          : undefined;
      const locationId =
        selectedEntityType === "event" && entityForm.form.locationId
          ? entityForm.form.locationId
          : undefined;

      let relationshipTargetId =
        (selectedEntityType === "location" ||
          selectedEntityType === "event" ||
          selectedEntityType === "faction") &&
        entityForm.form.relationshipTargetId
          ? entityForm.form.relationshipTargetId
          : undefined;
      let relationshipType =
        (selectedEntityType === "location" ||
          selectedEntityType === "event" ||
          selectedEntityType === "faction") &&
        entityForm.form.relationshipType &&
        entityForm.form.relationshipType.trim() !== ""
          ? (entityForm.form.relationshipType as
              | "contains"
              | "is contained by"
              | "borders against"
              | "is near"
              | "is connected to")
          : undefined;

      await withAsyncAction(
        async () => {
          // Re-read relationship info inside async action to get latest form values
          relationshipTargetId =
            (selectedEntityType === "location" ||
              selectedEntityType === "event" ||
              selectedEntityType === "faction") &&
            entityForm.form.relationshipTargetId
              ? entityForm.form.relationshipTargetId
              : undefined;
          relationshipType =
            (selectedEntityType === "location" ||
              selectedEntityType === "event" ||
              selectedEntityType === "faction") &&
            entityForm.form.relationshipType &&
            entityForm.form.relationshipType.trim() !== ""
              ? (entityForm.form.relationshipType as
                  | "contains"
                  | "is contained by"
                  | "borders against"
                  | "is near"
                  | "is connected to")
              : undefined;

          // If we have a relationship target but no type, wait and re-read
          if (relationshipTargetId && !relationshipType) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            relationshipType =
              (selectedEntityType === "location" ||
                selectedEntityType === "event" ||
                selectedEntityType === "faction") &&
              entityForm.form.relationshipType &&
              entityForm.form.relationshipType.trim() !== ""
                ? (entityForm.form.relationshipType as
                    | "contains"
                    | "is contained by"
                    | "borders against"
                    | "is near"
                    | "is connected to")
                : undefined;
          }

          const entity = await createWorldEntity(
            selectedIds.worldId!,
            selectedEntityType,
            entityForm.form.name,
            entityForm.form.summary,
            beginningTimestamp,
            endingTimestamp,
            locationId,
            currentUser?.token
          );

          // Handle relationship creation based on entity type
          if (
            selectedEntityType === "location" &&
            relationshipTargetId &&
            relationshipType
          ) {
            await addLocationRelationship(
              selectedIds.worldId!,
              entity.id,
              relationshipTargetId,
              relationshipType,
              currentUser?.token
            );

            setEntities((prev) => {
              const exists = prev.some((e) => e.id === entity.id);
              if (exists) {
                return prev.map((e) => (e.id === entity.id ? entity : e));
              }
              return [...prev, entity];
            });

            // Reload entities to get updated relationships
            setTimeout(async () => {
              try {
                await new Promise((resolve) => setTimeout(resolve, 500));
                const allLocations = await fetchWorldEntities(
                  selectedIds.worldId!,
                  "location"
                );
                const allEvents = await fetchWorldEntities(
                  selectedIds.worldId!,
                  "event"
                );
                const entityMap = new Map<
                  string,
                  typeof allLocations[0] | typeof allEvents[0]
                >();
                [...allLocations, ...allEvents].forEach((e) =>
                  entityMap.set(e.id, e)
                );
                setEntities((prev) => {
                  prev.forEach((existingEntity) => {
                    if (!entityMap.has(existingEntity.id)) {
                      entityMap.set(existingEntity.id, existingEntity);
                    }
                  });
                  return Array.from(entityMap.values());
                });
                const cacheKey = `${selectedIds.worldId}-location`;
                setEntitiesLoadedFor(cacheKey);
                setCrossRefEntitiesLoadedFor(
                  `${selectedIds.worldId}-crossref-location`
                );
                setEntities((currentEntities) => {
                  setTimeout(() => {
                    dispatchTransitionEvent(ENTITIES_LOADED_EVENT, {
                      worldId: selectedIds.worldId,
                      entityType: selectedEntityType,
                      count: currentEntities.length,
                      cacheKey: cacheKey,
                      crossRefLoaded: true,
                      reloaded: true
                    });
                  }, 100);
                  return currentEntities;
                });
              } catch (reloadErr) {
                console.error(
                  "Failed to reload entities after relationship creation:",
                  reloadErr
                );
              }
            }, 100);
          } else if (
            selectedEntityType === "event" &&
            relationshipTargetId &&
            relationshipType
          ) {
            const actualRelationshipType =
              relationshipType === "is contained by" ? "contains" : relationshipType;
            await addEventRelationship(
              selectedIds.worldId!,
              relationshipTargetId,
              entity.id,
              actualRelationshipType,
              currentUser?.token
            );

            setEntities((prev) => {
              const exists = prev.some((e) => e.id === entity.id);
              if (exists) {
                return prev.map((e) => (e.id === entity.id ? entity : e));
              }
              return [...prev, entity];
            });

            setTimeout(async () => {
              try {
                await new Promise((resolve) => setTimeout(resolve, 500));
                const allEvents = await fetchWorldEntities(
                  selectedIds.worldId!,
                  "event"
                );
                const allLocations = await fetchWorldEntities(
                  selectedIds.worldId!,
                  "location"
                );
                const entityMap = new Map<
                  string,
                  typeof allEvents[0] | typeof allLocations[0]
                >();
                [...allEvents, ...allLocations].forEach((e) =>
                  entityMap.set(e.id, e)
                );
                setEntities((prev) => {
                  prev.forEach((existingEntity) => {
                    if (!entityMap.has(existingEntity.id)) {
                      entityMap.set(existingEntity.id, existingEntity);
                    }
                  });
                  return Array.from(entityMap.values());
                });
                const cacheKey = `${selectedIds.worldId}-event`;
                setEntitiesLoadedFor(cacheKey);
                setCrossRefEntitiesLoadedFor(
                  `${selectedIds.worldId}-crossref-event`
                );
                setEntities((currentEntities) => {
                  setTimeout(() => {
                    dispatchTransitionEvent(ENTITIES_LOADED_EVENT, {
                      worldId: selectedIds.worldId,
                      entityType: selectedEntityType,
                      count: currentEntities.length,
                      cacheKey: cacheKey,
                      crossRefLoaded: true,
                      reloaded: true
                    });
                  }, 100);
                  return currentEntities;
                });
              } catch (reloadErr) {
                console.error(
                  "Failed to reload entities after relationship creation:",
                  reloadErr
                );
              }
            }, 100);
          } else if (
            selectedEntityType === "faction" &&
            relationshipTargetId &&
            relationshipType
          ) {
            const actualRelationshipType =
              relationshipType === "is contained by" ? "contains" : relationshipType;
            await addFactionRelationship(
              selectedIds.worldId!,
              relationshipTargetId,
              entity.id,
              actualRelationshipType,
              currentUser?.token
            );

            setEntities((prev) => {
              const exists = prev.some((e) => e.id === entity.id);
              if (exists) {
                return prev.map((e) => (e.id === entity.id ? entity : e));
              }
              return [...prev, entity];
            });

            setTimeout(async () => {
              try {
                await new Promise((resolve) => setTimeout(resolve, 500));
                const allFactions = await fetchWorldEntities(
                  selectedIds.worldId!,
                  "faction"
                );
                const entityMap = new Map<string, typeof allFactions[0]>();
                allFactions.forEach((e) => entityMap.set(e.id, e));
                setEntities((prev) => {
                  prev.forEach((existingEntity) => {
                    if (!entityMap.has(existingEntity.id)) {
                      entityMap.set(existingEntity.id, existingEntity);
                    }
                  });
                  return Array.from(entityMap.values());
                });
                const cacheKey = `${selectedIds.worldId}-faction`;
                setEntitiesLoadedFor(cacheKey);
                setEntities((currentEntities) => {
                  setTimeout(() => {
                    dispatchTransitionEvent(ENTITIES_LOADED_EVENT, {
                      worldId: selectedIds.worldId,
                      entityType: selectedEntityType,
                      count: currentEntities.length,
                      cacheKey: cacheKey,
                      reloaded: true
                    });
                  }, 100);
                  return currentEntities;
                });
              } catch (reloadErr) {
                console.error(
                  "Failed to reload entities after relationship creation:",
                  reloadErr
                );
              }
            }, 100);
          }

          return entity;
        },
        {
          setIsLoading,
          setError,
          onAuthError: handleLogout,
          onSuccess: async (entity) => {
            if (
              !(
                (selectedEntityType === "location" ||
                  selectedEntityType === "event" ||
                  selectedEntityType === "faction") &&
                relationshipTargetId &&
                relationshipType
              )
            ) {
              setEntities((prev) => [...prev, entity]);
            }
            entityForm.resetForm();
            closeModal("entity");
            const eventMap: Record<string, string> = {
              creature: CREATURE_CREATED_EVENT,
              faction: FACTION_CREATED_EVENT,
              location: LOCATION_CREATED_EVENT,
              event: EVENT_CREATED_EVENT
            };
            const eventName = eventMap[selectedEntityType];
            if (eventName) {
              Promise.resolve().then(() => {
                dispatchTransitionEvent(eventName, {
                  entityId: entity.id,
                  entityName: entity.name,
                  entityType: selectedEntityType,
                  worldId: selectedIds.worldId
                });
              });
            }
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      /* c8 ignore stop */
    }
  }

  return {
    handleCreateEntity
  };
}
