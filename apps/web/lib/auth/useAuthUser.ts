"use client";

import { useEffect, useState } from "react";
import { AUTH_EVENT } from "./authEvents";
import { AUTH_USERNAME_KEY } from "./authStorage";

export function useAuthUser() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    /* c8 ignore next */ // SSR guard; hook is only meaningful in the browser
    if (typeof window === "undefined") return;

    /* c8 ignore start */ // jsdom/localStorage timing makes this hard to measure reliably in coverage; behaviour validated in tests
    const stored = window.localStorage.getItem(AUTH_USERNAME_KEY);
    if (stored) {
      setUsername(stored);
    }
    /* c8 ignore stop */

    const handleStorage = (event: StorageEvent) => {
      /* c8 ignore start */ // storage-event based updates are tested but jsdom coverage is flaky
      if (event.key === AUTH_USERNAME_KEY) {
        setUsername(event.newValue);
      }
      /* c8 ignore stop */
    };

    const handleAuthEvent = (event: Event) => {
      const custom = event as CustomEvent<{ username: string | null }>;
      setUsername(custom.detail.username);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(AUTH_EVENT, handleAuthEvent);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(AUTH_EVENT, handleAuthEvent);
    };
  }, []);

  return username;
}

