import { useEffect, useRef } from "react";
import { dispatchTransitionEvent } from "../../utils/eventDispatcher";
import {
  ERROR_OCCURRED_EVENT,
  ERROR_CLEARED_EVENT
} from "../../auth/authEvents";

interface UseErrorEventsProps {
  error: string | null;
}

/**
 * Hook to dispatch error-related transition events when error state changes.
 * Handles error occurred and error cleared events.
 */
export function useErrorEvents({ error }: UseErrorEventsProps) {
  const prevErrorRef = useRef(error);

  useEffect(() => {
    const prevError = prevErrorRef.current;
    
    if (error && !prevError) {
      // Error occurred
      dispatchTransitionEvent(ERROR_OCCURRED_EVENT, {
        message: error,
        timestamp: Date.now()
      });
    } else if (!error && prevError) {
      // Error cleared
      dispatchTransitionEvent(ERROR_CLEARED_EVENT, {
        previousMessage: prevError,
        timestamp: Date.now()
      });
    }
    
    prevErrorRef.current = error;
  }, [error]);
}
