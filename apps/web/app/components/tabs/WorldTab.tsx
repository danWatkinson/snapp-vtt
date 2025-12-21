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
import { useMemo, useEffect, useRef, useState } from "react";
import { fetchWorldEntities } from "../../../lib/clients/worldClient";
import LoadingIndicator from "../ui/LoadingIndicator";

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
    entitiesLoadedFor,
    crossRefEntitiesLoadedFor,
    setCrossRefEntitiesLoadedFor,
    setEntities,
    openModal,
    closeModal,
    currentUser
  } = useHomePage();

  // Use tab helpers to consolidate setup (now includes modal/selection states)
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
      entity: { form: entityForm, fields: ["name", "summary", "beginningTimestamp", "endingTimestamp", "relationshipTargetId", "relationshipType", "locationId"], prefix: "entity" }
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

  // Expose form setters to window for E2E testing
  // This allows tests to directly set form values when React's event handlers don't fire
  useEffect(() => {
    if (typeof window !== 'undefined') {
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
      if (typeof window !== 'undefined') {
        delete (window as any).__testFormSetters;
        delete (window as any).__testFormValues;
      }
    };
  }, [setEntityRelationshipTargetId, setEntityRelationshipType, setEntityLocationId, setEntityName, setEntitySummary, entityRelationshipTargetId, entityRelationshipType, entityLocationId, entityName, entitySummary, entityForm]);

  // Track what we've fetched to avoid duplicate fetches
  const crossRefFetchedRef = useRef<string | null>(null);
  
  // Track loading state for cross-referenced entities
  const [isLoadingCrossRef, setIsLoadingCrossRef] = useState(false);

  // Compute whether we have locations and events to avoid including entities.length in deps
  const hasLocations = useMemo(
    () => entities.some((e) => e.type === "location"),
    [entities]
  );
  const hasEvents = useMemo(
    () => entities.some((e) => e.type === "event"),
    [entities]
  );

  // Ensure cross-referenced entities are available when needed
  // When viewing events, we need locations for "At:" display
  // When viewing locations, we need events for "Events:" display
  // Wait for primary entities to be loaded first (check entitiesLoadedFor)
  useEffect(() => {
    const currentWorldId = selectedIds.worldId;
    if (!currentWorldId) return;
    
    // Only proceed if primary entities have been loaded
    const expectedCacheKey = `${currentWorldId}-${selectedEntityType}`;
    if (entitiesLoadedFor !== expectedCacheKey) {
      // Primary entities not loaded yet, wait
      return;
    }
    
    const needsLocations = selectedEntityType === "event";
    const needsEvents = selectedEntityType === "location";
    const needsCreaturesForFactions = selectedEntityType === "faction";
    const needsFactionsForCreatures = selectedEntityType === "creature";
    
    if (needsLocations || needsEvents || needsCreaturesForFactions || needsFactionsForCreatures) {
      const cacheKey = `${currentWorldId}-crossref-${selectedEntityType}`;
      
      // Always fetch cross-referenced entities when needed, even if some already exist
      // This ensures we have the latest data and all related entities are available
      // Check both the ref and the state to avoid duplicate fetches after reloads
      if (crossRefFetchedRef.current !== cacheKey && crossRefEntitiesLoadedFor !== cacheKey) {
        const promises: Promise<any>[] = [];
        
        if (needsLocations) {
          // Always fetch locations when viewing events (even if some already exist)
          // This ensures we have all locations for the "At:" display
          // Use a Map to deduplicate locations by ID
          promises.push(
            fetchWorldEntities(currentWorldId, "location")
              .then((locations) => {
                setEntities((prev) => {
                  // Create a Map of existing entities by ID for deduplication
                  const entityMap = new Map<string, typeof prev[0]>();
                  prev.forEach((e) => entityMap.set(e.id, e));
                  
                  // Add fetched locations (relationships are included from backend)
                  locations.forEach((location) => {
                    entityMap.set(location.id, location);
                  });
                  
                  return Array.from(entityMap.values());
                });
              })
          );
        }
        
        if (needsEvents) {
          // Always fetch events when viewing locations (even if some already exist)
          // This ensures we have all events for the "Events:" display
          // Use a Map to deduplicate events by ID to prevent duplicates
          promises.push(
            fetchWorldEntities(currentWorldId, "event")
              .then((events) => {
                setEntities((prev) => {
                  // Create a Map of existing entities by ID for deduplication
                  const entityMap = new Map<string, typeof prev[0]>();
                  prev.forEach((e) => entityMap.set(e.id, e));
                  
                  // Add fetched events, replacing any existing events with the same ID
                  // This ensures we have the latest event data and prevents duplicates
                  events.forEach((event) => {
                    entityMap.set(event.id, event);
                  });
                  
                  return Array.from(entityMap.values());
                });
              })
          );
        }
        
        if (needsCreaturesForFactions) {
          // Always fetch creatures when viewing factions (even if some already exist)
          // This ensures we have all creatures for the "Members:" display
          // Use a Map to deduplicate creatures by ID to prevent duplicates
          promises.push(
            fetchWorldEntities(currentWorldId, "creature")
              .then((creatures) => {
                setEntities((prev) => {
                  // Create a Map of existing entities by ID for deduplication
                  const entityMap = new Map<string, typeof prev[0]>();
                  prev.forEach((e) => entityMap.set(e.id, e));
                  
                  // Add fetched creatures, replacing any existing creatures with the same ID
                  // This ensures we have the latest creature data and prevents duplicates
                  creatures.forEach((creature) => {
                    entityMap.set(creature.id, creature);
                  });
                  
                  return Array.from(entityMap.values());
                });
              })
          );
        }
        
        if (needsFactionsForCreatures) {
          // Always fetch factions when viewing creatures (even if some already exist)
          // This ensures we have all factions for the "Member of:" display
          // Use a Map to deduplicate factions by ID to prevent duplicates
          promises.push(
            fetchWorldEntities(currentWorldId, "faction")
              .then((factions) => {
                setEntities((prev) => {
                  // Create a Map of existing entities by ID for deduplication
                  const entityMap = new Map<string, typeof prev[0]>();
                  prev.forEach((e) => entityMap.set(e.id, e));
                  
                  // Add fetched factions, replacing any existing factions with the same ID
                  // This ensures we have the latest faction data and prevents duplicates
                  factions.forEach((faction) => {
                    entityMap.set(faction.id, faction);
                  });
                  
                  return Array.from(entityMap.values());
                });
              })
          );
        }
        
        if (promises.length > 0) {
          setIsLoadingCrossRef(true);
          crossRefFetchedRef.current = cacheKey;
          Promise.all(promises)
            .then(() => {
              // All cross-referenced entities loaded
              setIsLoadingCrossRef(false);
              setCrossRefEntitiesLoadedFor(cacheKey);
            })
            .catch((err) => {
              console.error("Failed to fetch cross-referenced entities:", err);
              crossRefFetchedRef.current = null;
              setIsLoadingCrossRef(false);
            });
        } else {
          // No promises to wait for, but we still need to mark as loaded
          crossRefFetchedRef.current = cacheKey;
          setIsLoadingCrossRef(false);
          setCrossRefEntitiesLoadedFor(cacheKey);
        }
      } else {
        // Already fetched for this combination - mark as loaded
        // But check if we still have the entities (they might have been cleared/reloaded)
        // If crossRefEntitiesLoadedFor is already set to this cacheKey, entities should be loaded
        setIsLoadingCrossRef(false);
        // Only set crossRefEntitiesLoadedFor if it's not already set to avoid triggering re-renders
        // The handler might have already set this when reloading after relationship creation
        // Use a functional update to avoid needing crossRefEntitiesLoadedFor in dependencies
        setCrossRefEntitiesLoadedFor((current) => {
          if (current !== cacheKey) {
            return cacheKey;
          }
          return current;
        });
      }
    } else {
      crossRefFetchedRef.current = null;
      setIsLoadingCrossRef(false);
      setCrossRefEntitiesLoadedFor(null);
    }
  }, [selectedEntityType, selectedIds.worldId, setEntities, currentUser, entitiesLoadedFor, hasLocations, hasEvents, crossRefEntitiesLoadedFor]);

  // Determine loading message based on what we're waiting for
  const loadingMessage = useMemo(() => {
    if (selectedEntityType === "event") {
      return "Loading locations...";
    } else if (selectedEntityType === "location") {
      return "Loading events...";
    }
    return "Loading...";
  }, [selectedEntityType]);

  return (
    <section data-component="WorldTab" className="space-y-4">
      <LoadingIndicator isLoading={isLoadingCrossRef} message={loadingMessage} />
      {/* Only show world selection UI if no world is selected yet (legacy mode) */}
      {!selectedIds.worldId && (
        <>
          <SectionHeader>Worlds</SectionHeader>

          {worlds.length > 0 && (
            <TabList aria-label="Worlds" variant="planning">
              {worlds.map((world) => {
                const isActive = selectedIds.worldId === world.id;
                return (
                  <TabButton
                    key={world.id}
                    isActive={isActive}
                    onClick={() => {
                      // Use setSelectionField directly to ensure it works
                      console.log("World clicked:", world.id, "Current selectedId:", selectedIds.worldId, "setSelectionField:", typeof setSelectionField);
                      try {
                        setSelectionField("worldId", world.id);
                        console.log("setSelectionField called with worldId:", world.id);
                      setSelectedEntityType("all");
                      setEntitiesLoadedFor(null);
                        console.log("State updates called");
                      } catch (error) {
                        console.error("Error in world click handler:", error);
                      }
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

      {selectedIds.worldId && selectedWorld && (
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
              items={
                selectedEntityType === "all"
                  ? entities
                  : entities.filter((e) => e.type === selectedEntityType)
              }
              emptyMessage={
                selectedEntityType === "all"
                  ? "No entities have been added to this world yet."
                  : `No ${selectedEntityType}s have been added to this world yet.`
              }
            >
              {(() => {
                // Filter entities by selected type (unless "all")
                const filteredEntities = selectedEntityType === "all" 
                  ? entities 
                  : entities.filter(e => e.type === selectedEntityType);
                
                // For locations, organize hierarchically
                if (selectedEntityType === "location" || (selectedEntityType === "all" && entities.some(e => e.type === "location"))) {
                  const locationEntities = entities.filter(e => e.type === "location");
                  const allEvents = entities.filter(e => e.type === "event");
                  // Top-level locations are those without "is contained by" relationships
                  const topLevelLocations = locationEntities.filter(e => 
                    !e.relationships || !e.relationships.some(rel => rel.relationshipType === "is contained by")
                  );
                  // Get children by finding locations that have "is contained by" relationship pointing to this parent
                  const getChildren = (parentId: string) => 
                    locationEntities.filter(e => 
                      e.relationships?.some(rel => 
                        rel.targetLocationId === parentId && rel.relationshipType === "is contained by"
                      )
                    );
                  
                  const renderLocation = (location: typeof entities[0], depth: number = 0) => {
                    const children = getChildren(location.id);
                    return (
                      <div key={location.id}>
                        <ListItem>
                          <div className="flex items-start gap-2">
                            {selectedEntityType === "all" && (
                              <span className="rounded px-2 py-0.5 text-xs capitalize snapp-pill">
                                {location.type}
                              </span>
                            )}
                            <div className="flex-1" style={{ marginLeft: `${depth * 1.5}rem` }}>
                              <div className="font-semibold">
                                {depth > 0 && "└ "}
                                {location.name}
                              </div>
                              {location.summary && (
                                <p className="text-xs" style={{ color: "#5a4232" }}>
                                  {location.summary}
                                </p>
                              )}
                              {location.relationships && location.relationships.length > 0 && (
                                <div className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                                  {(() => {
                                    const filteredRels = location.relationships.filter(rel => rel.relationshipType !== "is contained by");
                                    return filteredRels.map((rel, idx) => {
                                      const targetLocation = locationEntities.find(e => e.id === rel.targetLocationId);
                                      if (!targetLocation) return null;
                                      return (
                                        <span key={idx} className="mr-2">
                                          {rel.relationshipType} {targetLocation.name}
                                          {idx < filteredRels.length - 1 && ", "}
                                        </span>
                                      );
                                    });
                                  })()}
                                </div>
                              )}
                              {/* Show events for this location */}
                              {(() => {
                                // Deduplicate events by ID first to prevent duplicates
                                const eventMap = new Map<string, typeof allEvents[0]>();
                                allEvents.forEach(event => {
                                  eventMap.set(event.id, event);
                                });
                                const uniqueEvents = Array.from(eventMap.values());
                                
                                // Filter events for this location
                                const locationEvents = uniqueEvents.filter(e => 
                                  e.locationId === location.id
                                );
                                // Also check for events from parent locations
                                // Build parent chain by traversing up the hierarchy using relationships
                                const parentLocationIds = new Set<string>();
                                const visited = new Set<string>();
                                const locationsToProcess: typeof locationEntities[0][] = [location];
                                
                                while (locationsToProcess.length > 0) {
                                  const currentLoc = locationsToProcess.pop()!;
                                  if (visited.has(currentLoc.id)) continue;
                                  visited.add(currentLoc.id);
                                  
                                  // Find parent locations via "is contained by" relationships
                                  if (currentLoc.relationships) {
                                    currentLoc.relationships.forEach((rel) => {
                                      if (rel.relationshipType === "is contained by") {
                                        const parentId = rel.targetLocationId;
                                        parentLocationIds.add(parentId);
                                        const parent = locationEntities.find(e => e.id === parentId);
                                        if (parent && !visited.has(parent.id)) {
                                          locationsToProcess.push(parent);
                                        }
                                      }
                                    });
                                  }
                                }
                                // Filter events that belong to any parent location in the chain
                                const parentEvents = uniqueEvents.filter(e =>
                                  e.locationId && parentLocationIds.has(e.locationId)
                                );
                                
                                // Always show Events section if there are any events (location or parent)
                                // This ensures the section is visible even if events are still loading
                                if (locationEvents.length > 0 || parentEvents.length > 0) {
                                  return (
                                    <div className="mt-2 text-xs" style={{ color: "#6b7280" }}>
                                      <div className="font-medium mb-1">Events:</div>
                                      {locationEvents.map((event) => (
                                        <div key={event.id} className="ml-2">
                                          • {event.name}
                                        </div>
                                      ))}
                                      {parentEvents.length > 0 && (
                                        <>
                                          <div className="ml-2 mt-1 italic" style={{ color: "#9ca3af" }}>
                                            From parent locations:
                                          </div>
                                          {parentEvents.map((event) => {
                                            const eventLocation = locationEntities.find(e => e.id === event.locationId);
                                            return (
                                              <div key={event.id} className="ml-4">
                                                • {event.name} ({eventLocation?.name || "Unknown"})
                                              </div>
                                            );
                                          })}
                                        </>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        </ListItem>
                        {children.map(child => renderLocation(child, depth + 1))}
                      </div>
                    );
                  };
                  
                  // Render locations hierarchically, then other entities (only if showing "all")
                  const otherEntities = selectedEntityType === "all" 
                    ? entities.filter(e => e.type !== "location")
                    : [];
                  return (
                    <>
                      {topLevelLocations.map(loc => renderLocation(loc))}
                      {otherEntities.map((entity) => (
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
                              {entity.type === "event" && entity.locationId && (() => {
                                const eventLocation = locationEntities.find(e => e.id === entity.locationId);
                                if (eventLocation) {
                                  return (
                                    <div className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                                      At: {eventLocation.name}
                                    </div>
                                  );
                                }
                                // Location not loaded yet - show loading state
                                return (
                                  <div className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                                    At: <span className="italic">Loading location...</span>
                                  </div>
                                );
                              })()}
                              {entity.type === "event" && entity.relationships && (() => {
                                // Show sub-events (events that are contained by this event)
                                const subEvents = entity.relationships
                                  .filter(rel => rel.relationshipType === "contains")
                                  .map(rel => {
                                    const subEvent = entities.find(e => e.type === "event" && e.id === rel.targetLocationId);
                                    return subEvent;
                                  })
                                  .filter((e): e is typeof entities[0] => e !== undefined);
                                
                                if (subEvents.length > 0) {
                                  return (
                                    <div className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                                      Sub-events: {subEvents.map(e => e.name).join(", ")}
                                    </div>
                                  );
                                }
                                
                                // Show parent event (if this event is part of a composite event)
                                const parentEventRel = entity.relationships.find(rel => rel.relationshipType === "is contained by");
                                if (parentEventRel) {
                                  const parentEvent = entities.find(e => e.type === "event" && e.id === parentEventRel.targetLocationId);
                                  if (parentEvent) {
                                    return (
                                      <div className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                                        Part of: {parentEvent.name}
                                      </div>
                                    );
                                  }
                                }
                                
                                return null;
                              })()}
                              {entity.type === "creature" && entity.relationships && (() => {
                                // Show factions this creature is a member of
                                const allFactionsInContext = entities.filter(e => e.type === "faction");
                                const factions = entity.relationships
                                  .filter(rel => rel.relationshipType === "is member of")
                                  .map(rel => {
                                    const faction = allFactionsInContext.find(e => e.id === rel.targetLocationId);
                                    return faction;
                                  })
                                  .filter((e): e is typeof entities[0] => e !== undefined);
                                
                                if (factions.length > 0) {
                                  return (
                                    <div className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                                      Member of: {factions.map(e => e.name).join(", ")}
                                    </div>
                                  );
                                }
                                
                                return null;
                              })()}
                              {entity.type === "faction" && entity.relationships && (() => {
                                // Show sub-factions (factions that are contained by this faction)
                                const subFactions = entity.relationships
                                  .filter(rel => rel.relationshipType === "contains")
                                  .map(rel => {
                                    const subFaction = entities.find(e => e.type === "faction" && e.id === rel.targetLocationId);
                                    return subFaction;
                                  })
                                  .filter((e): e is typeof entities[0] => e !== undefined);
                                
                                // Show members (creatures that are members of this faction)
                                const members = entity.relationships
                                  .filter(rel => rel.relationshipType === "has member")
                                  .map(rel => {
                                    const member = entities.find(e => e.type === "creature" && e.id === rel.targetLocationId);
                                    return member;
                                  })
                                  .filter((e): e is typeof entities[0] => e !== undefined);
                                
                                // Show parent faction (if this faction is part of a nested faction)
                                const parentFactionRel = entity.relationships.find(rel => rel.relationshipType === "is contained by");
                                const parentFaction = parentFactionRel ? entities.find(e => e.type === "faction" && e.id === parentFactionRel.targetLocationId) : null;
                                
                                // Build display elements
                                const displayElements: JSX.Element[] = [];
                                
                                if (subFactions.length > 0) {
                                  displayElements.push(
                                    <div key="sub-factions" className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                                      Sub-factions: {subFactions.map(e => e.name).join(", ")}
                                    </div>
                                  );
                                }
                                
                                if (members.length > 0) {
                                  displayElements.push(
                                    <div key="members" className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                                      Members: {members.map(e => e.name).join(", ")}
                                    </div>
                                  );
                                }
                                
                                if (parentFaction) {
                                  displayElements.push(
                                    <div key="parent" className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                                      Part of: {parentFaction.name}
                                    </div>
                                  );
                                }
                                
                                return displayElements.length > 0 ? <>{displayElements}</> : null;
                              })()}
                    </div>
                  </div>
                </ListItem>
              ))}
                    </>
                  );
                }
                
                // For non-location types or when showing all, render flat list
                // When viewing events, we need locations for "At:" display
                // When viewing locations, we need events for "Events:" display
                // When viewing factions, we need all factions for nested faction display and creatures for members display
                // The useEffect should have loaded cross-referenced entities, but ensure we check all entities
                const allLocations = entities.filter(e => e.type === "location");
                const allEvents = entities.filter(e => e.type === "event");
                const allFactions = entities.filter(e => e.type === "faction");
                const allCreatures = entities.filter(e => e.type === "creature");
                
                return filteredEntities.map((entity) => (
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
                        {entity.type === "location" && entity.relationships && entity.relationships.length > 0 && (
                          <div className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                            {entity.relationships.map((rel, idx) => {
                              const targetLocation = allLocations.find(e => e.id === rel.targetLocationId);
                              if (!targetLocation) return null;
                              return (
                                <span key={idx} className="mr-2">
                                  {rel.relationshipType} {targetLocation.name}
                                  {idx < entity.relationships!.length - 1 && ", "}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {entity.type === "event" && entity.locationId && (() => {
                          const eventLocation = allLocations.find(e => e.id === entity.locationId);
                          if (eventLocation) {
                            return (
                              <div className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                                At: {eventLocation.name}
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {entity.type === "event" && entity.relationships && (() => {
                          // Show sub-events (events that are contained by this event)
                          const subEvents = entity.relationships
                            .filter(rel => rel.relationshipType === "contains")
                            .map(rel => {
                              const subEvent = allEvents.find(e => e.id === rel.targetLocationId);
                              return subEvent;
                            })
                            .filter((e): e is typeof allEvents[0] => e !== undefined);
                          
                          if (subEvents.length > 0) {
                            return (
                              <div className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                                Sub-events: {subEvents.map(e => e.name).join(", ")}
                              </div>
                            );
                          }
                          
                          // Show parent event (if this event is part of a composite event)
                          const parentEventRel = entity.relationships.find(rel => rel.relationshipType === "is contained by");
                          if (parentEventRel) {
                            const parentEvent = allEvents.find(e => e.id === parentEventRel.targetLocationId);
                            if (parentEvent) {
                              return (
                                <div className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                                  Part of: {parentEvent.name}
                                </div>
                              );
                            }
                          }
                          
                          return null;
                        })()}
                        {entity.type === "creature" && entity.relationships && (() => {
                          // Show factions this creature is a member of
                          const factions = entity.relationships
                            .filter(rel => rel.relationshipType === "is member of")
                            .map(rel => {
                              const faction = allFactions.find(e => e.id === rel.targetLocationId);
                              return faction;
                            })
                            .filter((e): e is typeof allFactions[0] => e !== undefined);
                          
                          if (factions.length > 0) {
                            return (
                              <div className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                                Member of: {factions.map(e => e.name).join(", ")}
                              </div>
                            );
                          }
                          
                          return null;
                        })()}
                        {entity.type === "faction" && entity.relationships && (() => {
                          // Show sub-factions (factions that are contained by this faction)
                          const subFactions = entity.relationships
                            .filter(rel => rel.relationshipType === "contains")
                            .map(rel => {
                              const subFaction = allFactions.find(e => e.id === rel.targetLocationId);
                              return subFaction;
                            })
                            .filter((e): e is typeof allFactions[0] => e !== undefined);
                          
                          // Show members (creatures that are members of this faction)
                          const members = entity.relationships
                            .filter(rel => rel.relationshipType === "has member")
                            .map(rel => {
                              const member = allCreatures.find(e => e.id === rel.targetLocationId);
                              return member;
                            })
                            .filter((e): e is typeof allCreatures[0] => e !== undefined);
                          
                          // Show parent faction (if this faction is part of a nested faction)
                          const parentFactionRel = entity.relationships.find(rel => rel.relationshipType === "is contained by");
                          const parentFaction = parentFactionRel ? allFactions.find(e => e.id === parentFactionRel.targetLocationId) : null;
                          
                          // Build display elements
                          const displayElements: JSX.Element[] = [];
                          
                          if (subFactions.length > 0) {
                            displayElements.push(
                              <div key="sub-factions" className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                                Sub-factions: {subFactions.map(e => e.name).join(", ")}
                              </div>
                            );
                          }
                          
                          if (members.length > 0) {
                            displayElements.push(
                              <div key="members" className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                                Members: {members.map(e => e.name).join(", ")}
                              </div>
                            );
                          }
                          
                          if (parentFaction) {
                            displayElements.push(
                              <div key="parent" className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                                Part of: {parentFaction.name}
                              </div>
                            );
                          }
                          
                          return displayElements.length > 0 ? <>{displayElements}</> : null;
                        })()}
                        {entity.type === "location" && (() => {
                          // Show events for this location
                          const locationEvents = allEvents.filter(e => e.locationId === entity.id);
                          // Also check for events from parent locations
                          // Build parent chain by traversing up the hierarchy using relationships
                          const parentLocationIds = new Set<string>();
                          const visited = new Set<string>();
                          const locationsToProcess: typeof allLocations[0][] = [entity];
                          
                          while (locationsToProcess.length > 0) {
                            const currentLoc = locationsToProcess.pop()!;
                            if (visited.has(currentLoc.id)) continue;
                            visited.add(currentLoc.id);
                            
                            // Find parent locations via "is contained by" relationships
                            if (currentLoc.relationships) {
                              currentLoc.relationships.forEach((rel) => {
                                if (rel.relationshipType === "is contained by") {
                                  const parentId = rel.targetLocationId;
                                  parentLocationIds.add(parentId);
                                  const parent = allLocations.find(e => e.id === parentId);
                                  if (parent && !visited.has(parent.id)) {
                                    locationsToProcess.push(parent);
                                  }
                                }
                              });
                            }
                          }
                          // Filter events that belong to any parent location in the chain
                          const parentEvents = allEvents.filter(e =>
                            e.locationId && parentLocationIds.has(e.locationId)
                          );
                          
                          if (locationEvents.length > 0 || parentEvents.length > 0) {
                            return (
                              <div className="mt-2 text-xs" style={{ color: "#6b7280" }}>
                                <div className="font-medium mb-1">Events:</div>
                                {locationEvents.map((event) => (
                                  <div key={event.id} className="ml-2">
                                    • {event.name}
                                  </div>
                                ))}
                                {parentEvents.length > 0 && (
                                  <>
                                    <div className="ml-2 mt-1 italic" style={{ color: "#9ca3af" }}>
                                      From parent locations:
                                    </div>
                                    {parentEvents.map((event) => {
                                      const eventLocation = allLocations.find(e => e.id === event.locationId);
                                      return (
                                        <div key={event.id} className="ml-4">
                                          • {event.name} ({eventLocation?.name || "Unknown"})
                                        </div>
                                      );
                                    })}
                                  </>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {entity.type === "event" && entity.locationId && (() => {
                          const eventLocation = allLocations.find(e => e.id === entity.locationId);
                          // Always render "At:" if locationId is set, even if location not loaded yet
                          // This ensures the UI shows something while locations are loading
                          if (eventLocation) {
                            return (
                              <div className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                                At: {eventLocation.name}
                              </div>
                            );
                          }
                          // Location not loaded yet - show loading state
                          // The useEffect should load locations, and component will re-render when they're added
                          return (
                            <div className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
                              At: <span className="italic">Loading location...</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </ListItem>
                ));
              })()}
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
              {selectedEntityType === "location" && (
                <>
                  <label className="block text-sm">
                    Link to Location (optional)
                    <select
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      style={{
                        borderColor: "#8b6f47",
                        backgroundColor: "#faf8f3",
                        color: "#2c1810",
                      }}
                      value={entityRelationshipTargetId || ""}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        console.log('[WorldTab] Setting relationship target:', {
                          value: newValue,
                          eventType: e.type,
                          currentValue: entityRelationshipTargetId,
                          formValue: entityForm.form.relationshipTargetId,
                          hasTarget: !!e.target,
                          targetValue: e.target?.value
                        });
                        setEntityRelationshipTargetId(newValue);
                        // Clear relationship type when target is cleared
                        if (!newValue) {
                          setEntityRelationshipType("");
                        }
                        // Verify it was set
                        setTimeout(() => {
                          console.log('[WorldTab] Relationship target after set:', {
                            formValue: entityForm.form.relationshipTargetId,
                            entityRelationshipTargetId
                          });
                        }, 0);
                      }}
                      onInput={(e) => {
                        // Also log input events in case React is using those
                        console.log('[WorldTab] Input event on relationship target:', {
                          value: (e.target as HTMLSelectElement).value,
                          eventType: e.type
                        });
                      }}
                    >
                      <option value="">None</option>
                      {(() => {
                        const locations = entities.filter((e) => e.type === "location");
                        console.log('[WorldTab] Relationship target select - available locations:', {
                          totalEntities: entities.length,
                          locations: locations.map(l => ({ id: l.id, name: l.name })),
                          willRenderOptions: locations.length > 0
                        });
                        return locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ));
                      })()}
                    </select>
                  </label>
                  {(() => {
                    console.log('[WorldTab] Checking if relationship type dropdown should render:', {
                      entityRelationshipTargetId,
                      formRelationshipTargetId: entityForm.form.relationshipTargetId,
                      willRender: !!entityRelationshipTargetId
                    });
                    return null;
                  })()}
                  {entityRelationshipTargetId && (
                    <label className="block text-sm">
                      Relationship Type
                      <select
                        className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        style={{
                          borderColor: "#8b6f47",
                          backgroundColor: "#faf8f3",
                          color: "#2c1810",
                        }}
                        value={entityRelationshipType || ""}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        console.log('[WorldTab] Setting relationship type:', {
                          value: newValue,
                          eventType: e.type,
                          currentValue: entityRelationshipType,
                          formValue: entityForm.form.relationshipType,
                          hasTarget: !!e.target,
                          targetValue: e.target?.value
                        });
                        setEntityRelationshipType(newValue as any);
                        // Verify it was set
                        setTimeout(() => {
                          console.log('[WorldTab] Relationship type after set:', {
                            formValue: entityForm.form.relationshipType,
                            entityRelationshipType
                          });
                        }, 0);
                      }}
                      onInput={(e) => {
                        // Also log input events in case React is using those
                        console.log('[WorldTab] Input event on relationship type:', {
                          value: (e.target as HTMLSelectElement).value,
                          eventType: e.type
                        });
                      }}
                      >
                        <option value="">Select relationship type</option>
                        <option value="contains">Contains</option>
                        <option value="is contained by">Is Contained By</option>
                        <option value="borders against">Borders Against</option>
                        <option value="is near">Is Near</option>
                        <option value="is connected to">Is Connected To</option>
                      </select>
                    </label>
                  )}
                </>
              )}
              {selectedEntityType === "event" && (
                <>
                  <label className="block text-sm">
                    Location (optional)
                    <select
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      style={{
                        borderColor: "#8b6f47",
                        backgroundColor: "#faf8f3",
                        color: "#2c1810",
                      }}
                      value={entityLocationId || ""}
                      onChange={(e) => setEntityLocationId(e.target.value)}
                    >
                      <option value="">None</option>
                      {entities
                        .filter((e) => e.type === "location")
                        .map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    Link to Event (optional)
                    <select
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      style={{
                        borderColor: "#8b6f47",
                        backgroundColor: "#faf8f3",
                        color: "#2c1810",
                      }}
                      value={entityRelationshipTargetId || ""}
                      onChange={(e) => setEntityRelationshipTargetId(e.target.value)}
                    >
                      <option value="">None</option>
                      {(() => {
                        const allEvents = entities.filter(e => e.type === "event");
                        return allEvents.map((event) => (
                          <option key={event.id} value={event.id}>
                            {event.name}
                          </option>
                        ));
                      })()}
                    </select>
                  </label>
                  {entityRelationshipTargetId && (
                    <label className="block text-sm">
                      Relationship Type
                      <select
                        className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        style={{
                          borderColor: "#8b6f47",
                          backgroundColor: "#faf8f3",
                          color: "#2c1810",
                        }}
                        value={entityRelationshipType || ""}
                        onChange={(e) => setEntityRelationshipType(e.target.value as any)}
                      >
                        <option value="">Select relationship type</option>
                        <option value="is contained by">Is Part Of (sub-event)</option>
                      </select>
                    </label>
                  )}
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
              {selectedEntityType === "faction" && (
                <>
                  <label className="block text-sm">
                    Link to Faction (optional)
                    <select
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      style={{
                        borderColor: "#8b6f47",
                        backgroundColor: "#faf8f3",
                        color: "#2c1810",
                      }}
                      value={entityRelationshipTargetId || ""}
                      onChange={(e) => setEntityRelationshipTargetId(e.target.value)}
                    >
                      <option value="">None</option>
                      {(() => {
                        const allFactions = entities.filter(e => e.type === "faction");
                        return allFactions.map((faction) => (
                          <option key={faction.id} value={faction.id}>
                            {faction.name}
                          </option>
                        ));
                      })()}
                    </select>
                  </label>
                  {entityRelationshipTargetId && (
                    <label className="block text-sm">
                      Relationship Type
                      <select
                        className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        style={{
                          borderColor: "#8b6f47",
                          backgroundColor: "#faf8f3",
                          color: "#2c1810",
                        }}
                        value={entityRelationshipType || ""}
                        onChange={(e) => setEntityRelationshipType(e.target.value as any)}
                      >
                        <option value="">Select relationship type</option>
                        <option value="is contained by">Is Part Of (sub-faction)</option>
                      </select>
                    </label>
                  )}
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
