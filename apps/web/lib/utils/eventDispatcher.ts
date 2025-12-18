/**
 * Utility for dispatching transition events with consistent structure.
 * All transition events include a timestamp for debugging and ordering.
 */
export function dispatchTransitionEvent(
  eventName: string,
  detail: Record<string, any>
): void {
  if (typeof window === "undefined") return;
  
  window.dispatchEvent(
    new CustomEvent(eventName, {
      detail: {
        ...detail,
        timestamp: Date.now()
      }
    })
  );
}
