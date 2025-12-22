import { useDataFetching } from "../useDataFetching";

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
  useDataFetching({
    enabled: !!selectedCampaignId,
    loaded: playersLoadedFor === selectedCampaignId,
    fetchFn: () => fetchCampaignPlayers(selectedCampaignId!),
    onSuccess: (players) => {
      setPlayers(players);
      setPlayersLoadedFor(selectedCampaignId!);
    },
    onError: setError,
    dependencies: [selectedCampaignId, playersLoadedFor, fetchCampaignPlayers, setPlayers, setPlayersLoadedFor, setError]
  });
}
