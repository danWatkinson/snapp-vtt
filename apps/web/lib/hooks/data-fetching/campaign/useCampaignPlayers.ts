import { useEffect } from "react";

/**
 * Hook to fetch campaign players.
 */
export function useCampaignPlayers(
  selectedCampaignId: string | null,
  playersLoadedFor: string | null,
  fetchCampaignPlayers: (campaignId: string) => Promise<string[]>,
  setPlayers: (players: string[]) => void,
  setPlayersLoadedFor: (key: string | null) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (!selectedCampaignId) return;
    if (playersLoadedFor === selectedCampaignId) return;
    (async () => {
      try {
        const loaded = await fetchCampaignPlayers(selectedCampaignId);
        setPlayers(loaded);
        setPlayersLoadedFor(selectedCampaignId);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedCampaignId, playersLoadedFor, fetchCampaignPlayers, setPlayers, setPlayersLoadedFor, setError]);
}
