import { useEffect } from "react";

/**
 * Hook to listen for custom window events.
 * Automatically cleans up the event listener on unmount.
 * 
 * @example
 * useCustomEvent(OPEN_LOGIN_EVENT, () => openModal("login"));
 */
export function useCustomEvent(
  eventName: string,
  handler: (event: CustomEvent) => void
) {
  useEffect(() => {
    /* c8 ignore next */ // SSR guard; window is undefined only outside browser/JS DOM
    if (typeof window === "undefined") return;
    
    const eventHandler = (e: Event) => {
      handler(e as CustomEvent);
    };
    
    window.addEventListener(eventName, eventHandler);
    return () => window.removeEventListener(eventName, eventHandler);
  }, [eventName, handler]);
}
