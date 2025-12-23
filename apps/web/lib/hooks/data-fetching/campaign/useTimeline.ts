import { useEffect } from "react";

/**
 * Hook to fetch timeline data (complex - loads timeline, story arcs, and events).
 */
export function useTimeline(
  selectedCampaignId: string | null,
  timelineLoadedFor: string | null,
  campaignView: string | null,
  worlds: any[],
  fetchTimeline: (campaignId: string) => Promise<any>,
  fetchStoryArcs: (campaignId: string) => Promise<any[]>,
  fetchStoryArcEvents: (arcId: string) => Promise<string[]>,
  fetchWorldEntities: (worldId: string, type?: "location" | "creature" | "faction" | "concept" | "event") => Promise<any[]>,
  setTimeline: (timeline: any) => void,
  setTimelineLoadedFor: (key: string | null) => void,
  setStoryArcs: (arcs: any[]) => void,
  setAllEvents: (events: any[]) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (!selectedCampaignId) return;
    if (timelineLoadedFor === selectedCampaignId) return;
    if (campaignView !== "timeline") return;
    (async () => {
      try {
        const loaded = await fetchTimeline(selectedCampaignId);
        setTimeline(loaded);
        setTimelineLoadedFor(selectedCampaignId);
        // Also load story arcs and their events for timeline display
        const arcs = await fetchStoryArcs(selectedCampaignId);
        setStoryArcs(arcs);
        // Load all events from all story arcs
        const allEventIds = new Set<string>();
        for (const arc of arcs) {
          const eventIds = await fetchStoryArcEvents(arc.id);
          eventIds.forEach((id) => allEventIds.add(id));
        }
        // Load event details from all worlds
        const allWorldsEvents: any[] = [];
        for (const world of worlds) {
          const events = await fetchWorldEntities(world.id, "event");
          allWorldsEvents.push(...events);
        }
        // Filter to only events in story arcs
        const timelineEvents = allWorldsEvents.filter((e: any) =>
          allEventIds.has(e.id)
        );
        setAllEvents(timelineEvents);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedCampaignId, timelineLoadedFor, campaignView, worlds, fetchTimeline, fetchStoryArcs, fetchStoryArcEvents, fetchWorldEntities, setTimeline, setTimelineLoadedFor, setStoryArcs, setAllEvents, setError]);
}
