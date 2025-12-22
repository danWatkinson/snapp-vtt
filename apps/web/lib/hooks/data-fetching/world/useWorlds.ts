import { useEffect } from "react";

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
  useEffect(() => {
    if (!currentUser || worldsLoaded) return;
    (async () => {
      try {
        const existing = await fetchWorlds();
        setWorlds(existing);
        setWorldsLoaded(true);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [currentUser, worldsLoaded, fetchWorlds, setWorlds, setWorldsLoaded, setError]);
}
