import { useEffect } from "react";

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
  useEffect(() => {
    if (!selectedCampaignId) return;
    if (sessionsLoadedFor === selectedCampaignId) return;
    (async () => {
      try {
        const loaded = await fetchCampaignSessions(selectedCampaignId);
        setSessions(loaded);
        setSessionsLoadedFor(selectedCampaignId);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedCampaignId, sessionsLoadedFor, fetchCampaignSessions, setSessions, setSessionsLoadedFor, setError]);
}
