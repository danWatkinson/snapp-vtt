import { useState, useCallback } from "react";

/**
 * Hook to manage multiple selection states in one place.
 * Provides type-safe selection management for different entity types.
 * 
 * @example
 * const selection = useSelection({
 *   world: null as string | null,
 *   campaign: null as string | null,
 *   storyArc: null as string | null,
 *   session: null as string | null,
 *   event: "" as string
 * });
 * 
 * // Use: selection.world, selection.setWorld("id")
 */
export function useSelection<T extends Record<string, any>>(initialState: T) {
  const [selection, setSelection] = useState<T>(initialState);

  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setSelection((prev) => ({ ...prev, [field]: value }));
  }, []);

  const clearField = useCallback(<K extends keyof T>(field: K) => {
    setSelection((prev) => {
      const cleared = { ...prev };
      // Reset to initial value type (null for IDs, "" for strings)
      if (typeof prev[field] === "string") {
        (cleared[field] as any) = "";
      } else {
        (cleared[field] as any) = null;
      }
      return cleared;
    });
  }, []);

  const reset = useCallback(() => {
    setSelection(initialState);
  }, [initialState]);

  return {
    selection,
    setSelection,
    setField,
    clearField,
    reset
  };
}
