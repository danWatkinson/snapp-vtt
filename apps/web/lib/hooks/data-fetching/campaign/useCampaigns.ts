import { useEffect } from "react";
import { useDataFetching } from "../useDataFetching";

/**
 * Hook to fetch campaigns when the Campaigns tab is active.
 * Fetches campaigns for the selected world using server-side filtering.
 */
export function useCampaigns(
  activeTab: string | null,
  campaignsLoaded: boolean,
  selectedWorldId: string | null,
  fetchCampaignsByWorld: (worldId: string) => Promise<any[]>,
  setCampaigns: (campaigns: any[]) => void,
  setCampaignsLoaded: (loaded: boolean) => void,
  setError: (error: string | null) => void
) {
  // Handle the case where no world is selected (set empty array and mark as loaded)
  useEffect(() => {
    if (activeTab === "Campaigns" && !campaignsLoaded && !selectedWorldId) {
      setCampaigns([]);
      setCampaignsLoaded(true);
    }
  }, [activeTab, campaignsLoaded, selectedWorldId, setCampaigns, setCampaignsLoaded]);

  useDataFetching({
    enabled: activeTab === "Campaigns" && !!selectedWorldId,
    loaded: campaignsLoaded,
    fetchFn: () => fetchCampaignsByWorld(selectedWorldId!),
    onSuccess: (campaigns) => {
      setCampaigns(campaigns);
      setCampaignsLoaded(true);
    },
    onError: setError,
    dependencies: [activeTab, campaignsLoaded, selectedWorldId, fetchCampaignsByWorld, setCampaigns, setCampaignsLoaded, setError]
  });
}
