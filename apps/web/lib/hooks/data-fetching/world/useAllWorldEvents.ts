import { useEffect } from "react";

/**
 * Hook to load all world events when story arc event modal opens.
 */
export function useAllWorldEvents(
  storyArcEventModalOpen: boolean,
  worlds: any[],
  fetchWorldEntities: (worldId: string, type?: "location" | "creature" | "faction" | "concept" | "event") => Promise<any[]>,
  setAllEvents: (events: any[]) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (!storyArcEventModalOpen) return;
    // Load all events from all worlds when opening the modal
    (async () => {
      try {
        const allWorldsEvents: any[] = [];
        for (const world of worlds) {
          const events = await fetchWorldEntities(world.id, "event");
          allWorldsEvents.push(...events);
        }
        setAllEvents(allWorldsEvents);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [storyArcEventModalOpen, worlds, fetchWorldEntities, setAllEvents, setError]);
}
