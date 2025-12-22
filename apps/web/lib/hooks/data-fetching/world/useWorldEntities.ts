import { useEffect } from "react";

/**
 * Hook to fetch world entities.
 */
export function useWorldEntities(
  selectedWorldId: string | null,
  selectedEntityType: "all" | "location" | "creature" | "faction" | "event",
  entitiesLoadedFor: string | null,
  fetchWorldEntities: (worldId: string, type?: string) => Promise<any[]>,
  setEntities: (entities: any[]) => void,
  setEntitiesLoadedFor: (key: string | null) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (!selectedWorldId) return;
    const cacheKey = `${selectedWorldId}-${selectedEntityType}`;
    if (entitiesLoadedFor === cacheKey) return;
    (async () => {
      try {
        // If "all", fetch without type filter; otherwise filter by type
        const loaded = selectedEntityType === "all"
          ? await fetchWorldEntities(selectedWorldId)
          : await fetchWorldEntities(selectedWorldId, selectedEntityType);
        
        // Preserve entities of types that aren't being fetched (e.g., events when fetching locations)
        // This ensures cross-referenced entities aren't lost when switching tabs
        setEntities((prev) => {
          console.log('[useDataFetching] Fetching entities:', {
            entityType: selectedEntityType,
            fetchedCount: loaded.length,
            prevCount: prev.length
          });
          
          // Create a Map of fetched entities by ID
          const entityMap = new Map<string, typeof loaded[0]>();
          loaded.forEach(entity => entityMap.set(entity.id, entity));
          
          // Preserve entities of other types (e.g., events when fetching locations, locations when fetching events)
          prev.forEach(existingEntity => {
            if (existingEntity.type !== selectedEntityType) {
              // Entity is of a different type - preserve it if not in fetched list
              if (!entityMap.has(existingEntity.id)) {
                entityMap.set(existingEntity.id, existingEntity);
              }
            } else if (!entityMap.has(existingEntity.id)) {
              // Entity is of the same type but not in fetched list - keep it (newly created, not yet in backend)
              entityMap.set(existingEntity.id, existingEntity);
            }
          });
          
          const finalEntities = Array.from(entityMap.values());
          console.log('[useDataFetching] Final entities:', {
            totalCount: finalEntities.length
          });
          
          return finalEntities;
        });
        
        setEntitiesLoadedFor(cacheKey);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedWorldId, selectedEntityType, entitiesLoadedFor, fetchWorldEntities, setEntities, setEntitiesLoadedFor, setError]);
}
