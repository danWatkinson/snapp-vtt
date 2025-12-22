import { useEffect, useRef, useState, useMemo } from "react";
import { fetchWorldEntities } from "../clients/worldClient";
import type { WorldEntity } from "../clients/worldClient";

interface UseEntityCrossReferencesProps {
  selectedWorldId: string | null;
  selectedEntityType: "all" | "location" | "creature" | "faction" | "event";
  entities: WorldEntity[];
  setEntities: React.Dispatch<React.SetStateAction<WorldEntity[]>>;
  entitiesLoadedFor: string | null;
  crossRefEntitiesLoadedFor: string | null;
  setCrossRefEntitiesLoadedFor: (key: string | null) => void;
}

/**
 * Hook to manage loading cross-referenced entities.
 * 
 * When viewing events, loads locations for "At:" display.
 * When viewing locations, loads events for "Events:" display.
 * When viewing factions, loads creatures for "Members:" display.
 * When viewing creatures, loads factions for "Member of:" display.
 */
export function useEntityCrossReferences({
  selectedWorldId,
  selectedEntityType,
  entities,
  setEntities,
  entitiesLoadedFor,
  crossRefEntitiesLoadedFor,
  setCrossRefEntitiesLoadedFor
}: UseEntityCrossReferencesProps) {
  const crossRefFetchedRef = useRef<string | null>(null);
  const [isLoadingCrossRef, setIsLoadingCrossRef] = useState(false);

  const hasLocations = useMemo(
    () => entities.some((e) => e.type === "location"),
    [entities]
  );
  const hasEvents = useMemo(
    () => entities.some((e) => e.type === "event"),
    [entities]
  );

  useEffect(() => {
    const currentWorldId = selectedWorldId;
    if (!currentWorldId) {
      crossRefFetchedRef.current = null;
      setIsLoadingCrossRef(false);
      setCrossRefEntitiesLoadedFor(null);
      return;
    }
    
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
          promises.push(
            fetchWorldEntities(currentWorldId, "location")
              .then((locations) => {
                setEntities((prev) => {
                  const entityMap = new Map<string, typeof prev[0]>();
                  prev.forEach((e) => entityMap.set(e.id, e));
                  locations.forEach((location) => {
                    entityMap.set(location.id, location);
                  });
                  return Array.from(entityMap.values());
                });
              })
          );
        }
        
        if (needsEvents) {
          promises.push(
            fetchWorldEntities(currentWorldId, "event")
              .then((events) => {
                setEntities((prev) => {
                  const entityMap = new Map<string, typeof prev[0]>();
                  prev.forEach((e) => entityMap.set(e.id, e));
                  events.forEach((event) => {
                    entityMap.set(event.id, event);
                  });
                  return Array.from(entityMap.values());
                });
              })
          );
        }
        
        if (needsCreaturesForFactions) {
          promises.push(
            fetchWorldEntities(currentWorldId, "creature")
              .then((creatures) => {
                setEntities((prev) => {
                  const entityMap = new Map<string, typeof prev[0]>();
                  prev.forEach((e) => entityMap.set(e.id, e));
                  creatures.forEach((creature) => {
                    entityMap.set(creature.id, creature);
                  });
                  return Array.from(entityMap.values());
                });
              })
          );
        }
        
        if (needsFactionsForCreatures) {
          promises.push(
            fetchWorldEntities(currentWorldId, "faction")
              .then((factions) => {
                setEntities((prev) => {
                  const entityMap = new Map<string, typeof prev[0]>();
                  prev.forEach((e) => entityMap.set(e.id, e));
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
              setIsLoadingCrossRef(false);
              setCrossRefEntitiesLoadedFor(cacheKey);
            })
            .catch((err) => {
              console.error("Failed to fetch cross-referenced entities:", err);
              crossRefFetchedRef.current = null;
              setIsLoadingCrossRef(false);
            });
        } else {
          crossRefFetchedRef.current = cacheKey;
          setIsLoadingCrossRef(false);
          setCrossRefEntitiesLoadedFor(cacheKey);
        }
      } else {
        setIsLoadingCrossRef(false);
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
  }, [
    selectedEntityType,
    selectedWorldId,
    setEntities,
    entitiesLoadedFor,
    hasLocations,
    hasEvents,
    crossRefEntitiesLoadedFor,
    setCrossRefEntitiesLoadedFor
  ]);

  const loadingMessage = useMemo(() => {
    if (selectedEntityType === "event") {
      return "Loading locations...";
    } else if (selectedEntityType === "location") {
      return "Loading events...";
    }
    return "Loading...";
  }, [selectedEntityType]);

  return { isLoadingCrossRef, loadingMessage };
}
