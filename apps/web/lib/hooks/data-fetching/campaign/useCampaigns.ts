import { useEffect } from "react";

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
  useEffect(() => {
    if (activeTab !== "Campaigns" || campaignsLoaded) return;
    // Campaigns require a world - only fetch if world is selected
    if (!selectedWorldId) {
      setCampaigns([]);
      setCampaignsLoaded(true);
      return;
    }
    (async () => {
      try {
        // Fetch campaigns for the selected world
        const existing = await fetchCampaignsByWorld(selectedWorldId);
        setCampaigns(existing);
        setCampaignsLoaded(true);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [activeTab, campaignsLoaded, selectedWorldId, fetchCampaignsByWorld, setCampaigns, setCampaignsLoaded, setError]);
}
