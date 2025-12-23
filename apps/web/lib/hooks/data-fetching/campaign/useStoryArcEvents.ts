import { useEffect } from "react";

/**
 * Hook to fetch story arc events.
 */
export function useStoryArcEvents(
  selectedStoryArcId: string | null,
  storyArcEventsLoadedFor: string | null,
  worlds: any[],
  fetchStoryArcEvents: (arcId: string) => Promise<string[]>,
  fetchWorldEntities: (worldId: string, type?: "location" | "creature" | "faction" | "concept" | "event") => Promise<any[]>,
  setStoryArcEvents: (events: string[]) => void,
  setStoryArcEventsLoadedFor: (key: string | null) => void,
  setAllEvents: (events: any[]) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (!selectedStoryArcId) return;
    if (storyArcEventsLoadedFor === selectedStoryArcId) return;
    (async () => {
      try {
        const loaded = await fetchStoryArcEvents(selectedStoryArcId);
        setStoryArcEvents(loaded);
        setStoryArcEventsLoadedFor(selectedStoryArcId);
        // Load event details for display
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
  }, [selectedStoryArcId, storyArcEventsLoadedFor, worlds, fetchStoryArcEvents, fetchWorldEntities, setStoryArcEvents, setStoryArcEventsLoadedFor, setAllEvents, setError]);
}
