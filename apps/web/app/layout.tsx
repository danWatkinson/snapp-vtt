"use client";

import type { ReactNode } from "react";
import "./globals.css";
import Banner from "./components/banner/Banner";
import GuestView from "./components/auth/GuestView";
import { AuthProvider } from "../lib/contexts/AuthContext";
import { HomePageProvider, useHomePage } from "../lib/contexts/HomePageContext";
import { useCustomEvent } from "../lib/useCustomEvent";
import { OPEN_LOGIN_EVENT } from "../lib/authEvents";

function AppContent({ children }: { children: ReactNode }) {
  const { currentUser, openModal } = useHomePage();

  useCustomEvent(OPEN_LOGIN_EVENT, () => openModal("login"));

  if (!currentUser) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <GuestView />
      </main>
    );
  }

  return <main className="mx-auto max-w-3xl p-6">{children}</main>;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AuthProvider>
          <HomePageProvider>
            <Banner />
            <AppContent>{children}</AppContent>
          </HomePageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}


