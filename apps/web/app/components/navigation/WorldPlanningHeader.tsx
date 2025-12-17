"use client";

import { useHomePage } from "../../../lib/contexts/HomePageContext";
import WorldHeader from "./WorldHeader";
import PlanningTabs from "./PlanningTabs";
import Section from "../ui/Section";

export default function WorldPlanningHeader() {
  const { selectedIds } = useHomePage();
  
  if (!selectedIds.worldId) return null;
  
  return (
    <>
      <WorldHeader />
      <Section>
        <PlanningTabs />
      </Section>
    </>
  );
}
