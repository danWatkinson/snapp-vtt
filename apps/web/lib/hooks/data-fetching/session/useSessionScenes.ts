import { useDataFetching } from "../useDataFetching";

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
  useDataFetching({
    enabled: !!selectedSessionId,
    loaded: scenesLoadedFor === selectedSessionId,
    fetchFn: () => fetchSessionScenes(selectedSessionId!),
    onSuccess: (scenes) => {
      setScenes(scenes);
      setScenesLoadedFor(selectedSessionId!);
    },
    onError: setError,
    dependencies: [selectedSessionId, scenesLoadedFor, fetchSessionScenes, setScenes, setScenesLoadedFor, setError]
  });
}
