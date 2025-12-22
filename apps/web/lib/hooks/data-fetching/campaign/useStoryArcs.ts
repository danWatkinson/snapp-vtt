import { useEffect } from "react";

/**
 * Hook to fetch story arcs for a campaign.
 */
export function useStoryArcs(
  selectedCampaignId: string | null,
  storyArcsLoadedFor: string | null,
  fetchStoryArcs: (campaignId: string) => Promise<any[]>,
  setStoryArcs: (arcs: any[]) => void,
  setStoryArcsLoadedFor: (key: string | null) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (!selectedCampaignId) return;
    if (storyArcsLoadedFor === selectedCampaignId) return;
    (async () => {
      try {
        const loaded = await fetchStoryArcs(selectedCampaignId);
        setStoryArcs(loaded);
        setStoryArcsLoadedFor(selectedCampaignId);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedCampaignId, storyArcsLoadedFor, fetchStoryArcs, setStoryArcs, setStoryArcsLoadedFor, setError]);
}
