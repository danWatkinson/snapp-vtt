"use client";

import { useHomePage } from "../../../lib/contexts/HomePageContext";
import WorldHeader from "./WorldHeader";
import WorldSubTabs from "./WorldSubTabs";
import Section from "../ui/Section";

export default function WorldHeaderWithTabs() {
  const { selectedIds } = useHomePage();
  
  if (!selectedIds.worldId) return null;
  
  return (
    <>
      <WorldHeader />
      <Section>
        <WorldSubTabs />
      </Section>
    </>
  );
}
