import { useDataFetching } from "../useDataFetching";

/**
 * Hook to fetch campaign sessions.
 */
export function useCampaignSessions(
  selectedCampaignId: string | null,
  sessionsLoadedFor: string | null,
  fetchCampaignSessions: (campaignId: string) => Promise<any[]>,
  setSessions: (sessions: any[]) => void,
  setSessionsLoadedFor: (key: string | null) => void,
  setError: (error: string | null) => void
) {
  useDataFetching({
    enabled: !!selectedCampaignId,
    loaded: sessionsLoadedFor === selectedCampaignId,
    fetchFn: () => fetchCampaignSessions(selectedCampaignId!),
    onSuccess: (sessions) => {
      setSessions(sessions);
      setSessionsLoadedFor(selectedCampaignId!);
    },
    onError: setError,
    dependencies: [selectedCampaignId, sessionsLoadedFor, fetchCampaignSessions, setSessions, setSessionsLoadedFor, setError]
  });
}
