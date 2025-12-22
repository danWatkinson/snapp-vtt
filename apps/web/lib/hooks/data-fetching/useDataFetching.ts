import { useEffect } from "react";

/**
 * Options for the generic useDataFetching hook
 */
export interface UseDataFetchingOptions<T> {
  /** Whether the fetch should be enabled */
  enabled: boolean;
  /** Whether the data has already been loaded (prevents refetching) */
  loaded: boolean;
  /** Async function to fetch the data */
  fetchFn: () => Promise<T>;
  /** Callback when data is successfully fetched */
  onSuccess: (data: T) => void;
  /** Callback when an error occurs */
  onError: (error: string) => void;
  /** Optional dependencies array for the effect (defaults to [enabled, loaded, fetchFn, onSuccess, onError]) */
  dependencies?: unknown[];
}

/**
 * Generic hook for data fetching with common patterns:
 * - Enabled/disabled control
 * - Loaded state to prevent refetching
 * - Error handling
 * - Success callback
 * 
 * This hook consolidates the common pattern used across many data-fetching hooks.
 * 
 * @example
 * ```typescript
 * useDataFetching({
 *   enabled: !!currentUser,
 *   loaded: worldsLoaded,
 *   fetchFn: () => fetchWorlds(),
 *   onSuccess: (worlds) => {
 *     setWorlds(worlds);
 *     setWorldsLoaded(true);
 *   },
 *   onError: setError
 * });
 * ```
 */
export function useDataFetching<T>({
  enabled,
  loaded,
  fetchFn,
  onSuccess,
  onError,
  dependencies
}: UseDataFetchingOptions<T>): void {
  useEffect(() => {
    if (!enabled || loaded) return;

    (async () => {
      try {
        const data = await fetchFn();
        onSuccess(data);
      } catch (err) {
        onError((err as Error).message);
      }
    })();
  }, dependencies ?? [enabled, loaded, fetchFn, onSuccess, onError]);
}
