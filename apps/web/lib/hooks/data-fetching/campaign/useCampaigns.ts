import { useEffect } from "react";
import { useDataFetching } from "../useDataFetching";

/**
 * Hook to fetch campaigns for the selected world.
 * Fetches campaigns whenever a world is selected.
 */
export function useCampaigns(
  campaignsLoaded: boolean,
  selectedWorldId: string | null,
  fetchCampaignsByWorld: (worldId: string) => Promise<any[]>,
  setCampaigns: (campaigns: any[]) => void,
  setCampaignsLoaded: (loaded: boolean) => void,
  setError: (error: string | null) => void
) {
  // Handle the case where no world is selected (set empty array and mark as loaded)
  useEffect(() => {
    if (!selectedWorldId && !campaignsLoaded) {
      setCampaigns([]);
      setCampaignsLoaded(true);
    }
  }, [selectedWorldId, campaignsLoaded, setCampaigns, setCampaignsLoaded]);

  useDataFetching({
    enabled: !!selectedWorldId,
    loaded: campaignsLoaded,
    fetchFn: () => fetchCampaignsByWorld(selectedWorldId!),
    onSuccess: (campaigns) => {
      setCampaigns(campaigns);
      setCampaignsLoaded(true);
    },
    onError: setError,
    dependencies: [campaignsLoaded, selectedWorldId, fetchCampaignsByWorld, setCampaigns, setCampaignsLoaded, setError]
  });
}
