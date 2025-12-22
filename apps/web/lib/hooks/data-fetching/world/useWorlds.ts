import { useDataFetching } from "../useDataFetching";

/**
 * Hook to fetch worlds.
 */
export function useWorlds(
  currentUser: any,
  worldsLoaded: boolean,
  fetchWorlds: () => Promise<any[]>,
  setWorlds: (worlds: any[]) => void,
  setWorldsLoaded: (loaded: boolean) => void,
  setError: (error: string | null) => void
) {
  useDataFetching({
    enabled: !!currentUser,
    loaded: worldsLoaded,
    fetchFn: fetchWorlds,
    onSuccess: (worlds) => {
      setWorlds(worlds);
      setWorldsLoaded(true);
    },
    onError: setError,
    dependencies: [currentUser, worldsLoaded, fetchWorlds, setWorlds, setWorldsLoaded, setError]
  });
}
