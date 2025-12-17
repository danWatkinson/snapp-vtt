"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { AUTH_EVENT } from "../auth/authEvents";
import { AUTH_USERNAME_KEY } from "../auth/authStorage";
import type { LoginResponse } from "../clients/authClient";

type CurrentUser = LoginResponse | null;

interface AuthContextType {
  currentUser: CurrentUser;
  setCurrentUser: (user: CurrentUser) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);

  useEffect(() => {
    /* c8 ignore next */ // SSR guard; auth events only fire in the browser
    if (typeof window === "undefined") return;

    // Listen for auth events to sync state
    const handleAuthEvent = (event: Event) => {
      const custom = event as CustomEvent<{ username: string | null }>;
      if (!custom.detail.username) {
        setCurrentUser(null);
      }
    };

    window.addEventListener(AUTH_EVENT, handleAuthEvent);
    return () => window.removeEventListener(AUTH_EVENT, handleAuthEvent);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthenticated: currentUser !== null
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
