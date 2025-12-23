"use client";

import { useHomePage } from "../../../lib/contexts/HomePageContext";
import WorldHeader from "./WorldHeader";

/**
 * @deprecated This component is being phased out as part of the UI refactoring.
 * Use WorldHeader directly instead.
 */
export default function WorldHeaderWithTabs() {
  const { selectedIds } = useHomePage();
  
  if (!selectedIds.worldId) return null;
  
  return <WorldHeader />;
}
