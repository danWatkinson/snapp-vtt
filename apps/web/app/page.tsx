"use client";

import AuthenticatedView from "./components/AuthenticatedView";
import { useHomePage } from "../lib/contexts/HomePageContext";

export default function HomePage() {
  const { currentUser } = useHomePage();

  // This page assumes user is authenticated (layout handles guest view)
  if (!currentUser) {
    return null; // Layout will show GuestView
  }

  return <AuthenticatedView />;
}
