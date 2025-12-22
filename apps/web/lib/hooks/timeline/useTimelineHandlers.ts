import { advanceTimeline } from "../../clients/campaignClient";
import { withAsyncAction } from "../useAsyncAction";

interface UseTimelineHandlersProps {
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTimeline: (timeline: any) => void;
  currentUser: { token: string } | null;
  selectedIds: { campaignId?: string };
  handleLogout: () => void;
}

/**
 * Handlers for timeline operations (advance timeline).
 */
export function useTimelineHandlers({
  setIsLoading,
  setError,
  setTimeline,
  currentUser,
  selectedIds,
  handleLogout
}: UseTimelineHandlersProps) {
  async function handleAdvanceTimeline(
    amount: number,
    unit: "second" | "minute" | "hour" | "day" | "week" | "month" | "year"
  ) {
    if (!selectedIds.campaignId) return;
    try {
      await withAsyncAction(
        () =>
          advanceTimeline(
            selectedIds.campaignId!,
            amount,
            unit,
            currentUser?.token
          ),
        {
          setIsLoading,
          setError,
          onAuthError: handleLogout,
          onSuccess: (updated) => {
            setTimeline(updated);
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      /* c8 ignore stop */
    }
  }

  return {
    handleAdvanceTimeline
  };
}
