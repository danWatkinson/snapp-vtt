import { useDataFetching } from "../useDataFetching";

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
  useDataFetching({
    enabled: !!selectedCampaignId,
    loaded: storyArcsLoadedFor === selectedCampaignId,
    fetchFn: () => fetchStoryArcs(selectedCampaignId!),
    onSuccess: (arcs) => {
      setStoryArcs(arcs);
      setStoryArcsLoadedFor(selectedCampaignId!);
    },
    onError: setError,
    dependencies: [selectedCampaignId, storyArcsLoadedFor, fetchStoryArcs, setStoryArcs, setStoryArcsLoadedFor, setError]
  });
}
