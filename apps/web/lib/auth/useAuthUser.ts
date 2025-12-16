"use client";

import { useEffect, useState } from "react";
import { AUTH_EVENT } from "./authEvents";
import { AUTH_USERNAME_KEY } from "./authStorage";

export function useAuthUser() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(AUTH_USERNAME_KEY);
    if (stored) {
      setUsername(stored);
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_USERNAME_KEY) {
        setUsername(event.newValue);
      }
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

