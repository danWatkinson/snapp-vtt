import { useEffect } from "react";

/**
 * Hook to fetch session scenes.
 */
export function useSessionScenes(
  selectedSessionId: string | null,
  scenesLoadedFor: string | null,
  fetchSessionScenes: (sessionId: string) => Promise<any[]>,
  setScenes: (scenes: any[]) => void,
  setScenesLoadedFor: (key: string | null) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (!selectedSessionId) return;
    if (scenesLoadedFor === selectedSessionId) return;
    (async () => {
      try {
        const loaded = await fetchSessionScenes(selectedSessionId);
        setScenes(loaded);
        setScenesLoadedFor(selectedSessionId);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedSessionId, scenesLoadedFor, fetchSessionScenes, setScenes, setScenesLoadedFor, setError]);
}
