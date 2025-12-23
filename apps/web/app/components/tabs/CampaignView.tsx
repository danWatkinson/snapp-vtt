"use client";

import { useHomePage } from "../../../lib/contexts/HomePageContext";
import { useTabHelpers } from "../../../lib/hooks/useTabHelpers";
import Section from "../ui/Section";
import SectionHeader from "../ui/SectionHeader";
import { getNameById } from "../../../lib/helpers/entityHelpers";
import WorldHeader from "../navigation/WorldHeader";
import Breadcrumb from "../navigation/Breadcrumb";
import CampaignSelection from "./campaigns/CampaignSelection";
import CampaignViewFilter from "./campaigns/CampaignViewFilter";
import SessionsView from "./campaigns/SessionsView";
import PlayersView from "./campaigns/PlayersView";
import StoryArcsView from "./campaigns/StoryArcsView";
import TimelineView from "./campaigns/TimelineView";
import StoryArcEventsView from "./campaigns/StoryArcEventsView";
import ScenesView from "./campaigns/ScenesView";
import CampaignModals from "./campaigns/CampaignModals";
import { useMemo, useCallback } from "react";

export default function CampaignView() {
  const {
    campaigns,
    worlds,
    selectedIds,
    campaignView,
    sessions,
    players,
    storyArcs,
    storyArcEvents,
    allEvents,
    timeline,
    scenes,
    campaignForm,
    sessionForm,
    playerForm,
    storyArcForm,
    sceneForm,
    modals,
    handlers,
    setSelectionField,
    setCampaignView,
    setSessionsLoadedFor,
    setPlayersLoadedFor,
    setStoryArcsLoadedFor,
    setStoryArcEventsLoadedFor,
    setScenesLoadedFor,
    openModal,
    closeModal
  } = useHomePage();

  // Use tab helpers to consolidate setup
  const {
    formSetters: {
      setCampaignName,
      setCampaignSummary,
      setSessionName,
      setPlayerUsername,
      setStoryArcName,
      setStoryArcSummary,
      setSceneName,
      setSceneSummary,
      setSceneWorldId
    },
    formValues: {
      campaignName,
      campaignSummary,
      sessionName,
      playerUsername,
      storyArcName,
      storyArcSummary,
      sceneName,
      sceneSummary,
      sceneWorldId
    },
    selectionSetters: {
      setSelectedCampaignId,
      setSelectedStoryArcId,
      setSelectedSessionId,
      setSelectedEventId
    },
    modalHandlers: {
      setCampaignModalOpen,
      setSessionModalOpen,
      setPlayerModalOpen,
      setStoryArcModalOpen,
      setStoryArcEventModalOpen,
      setSceneModalOpen
    },
    selectionStates: {
      selectedCampaignId,
      selectedStoryArcId,
      selectedSessionId,
      selectedEventId
    },
    modalStates: {
      campaignModalOpen,
      sessionModalOpen,
      playerModalOpen,
      storyArcModalOpen,
      storyArcEventModalOpen,
      sceneModalOpen
    }
  } = useTabHelpers({
    forms: {
      campaign: { form: campaignForm, fields: ["name", "summary"], prefix: "campaign" },
      session: { form: sessionForm, fields: ["name"], prefix: "session" },
      player: { form: playerForm, fields: ["username"], prefix: "player" },
      storyArc: { form: storyArcForm, fields: ["name", "summary"], prefix: "storyArc" },
      scene: { form: sceneForm, fields: ["name", "summary", "worldId"], prefix: "scene" }
    },
    selections: ["campaignId", "storyArcId", "sessionId", "eventId"],
    modals: ["campaign", "session", "player", "storyArc", "storyArcEvent", "scene"],
    setSelectionField,
    openModal,
    closeModal,
    selectedIds,
    modalsState: modals
  });

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId]
  );

  // Filter campaigns by selected world
  const worldCampaigns = useMemo(
    () => campaigns.filter((c) => c.worldId === selectedIds.worldId),
    [campaigns, selectedIds.worldId]
  );

  // Default to overview if no view is set
  const currentView = campaignView || "sessions";

  if (!selectedIds.worldId || !selectedCampaignId) {
    return null;
  }

  return (
    <section data-component="CampaignView" className="space-y-4">
      <WorldHeader />
      <Breadcrumb />
      
      <Section>
        <SectionHeader>
          Campaigns
        </SectionHeader>

        <CampaignSelection
          campaigns={worldCampaigns}
          selectedCampaignId={selectedCampaignId}
          onCampaignSelect={(campaignId) => {
            setSelectionField("campaignId", campaignId);
            setCampaignView("sessions");
          }}
        />
      </Section>

      {selectedCampaignId && (
        <>
          <Section>
            <h3
              className="text-md font-semibold snapp-heading mb-4"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              {getNameById(campaigns, selectedCampaignId, "selected campaign")}
            </h3>

            <CampaignViewFilter
              campaignView={currentView}
              onViewChange={setCampaignView}
            />

            {currentView === "sessions" && (
              <SessionsView
                sessions={sessions}
                onAddSession={() => setSessionModalOpen(true)}
                onViewScenes={(sessionId) => {
                  setSelectionField("sessionId", sessionId);
                  setScenesLoadedFor(null);
                }}
              />
            )}

            {currentView === "players" && (
              <PlayersView
                players={players}
                onAddPlayer={() => setPlayerModalOpen(true)}
              />
            )}

            {currentView === "story-arcs" && (
              <StoryArcsView
                storyArcs={storyArcs}
                onAddStoryArc={() => setStoryArcModalOpen(true)}
                onViewEvents={(storyArcId) => {
                  setSelectionField("storyArcId", storyArcId);
                  setStoryArcEventsLoadedFor(null);
                }}
              />
            )}

            {currentView === "timeline" && timeline && (
              <TimelineView
                timeline={timeline}
                storyArcs={storyArcs}
                allEvents={allEvents}
                onAdvanceTimeline={handlers.handleAdvanceTimeline}
              />
            )}

            {selectedStoryArcId && (
              <StoryArcEventsView
                storyArcEvents={storyArcEvents}
                storyArcs={storyArcs}
                allEvents={allEvents}
                selectedStoryArcId={selectedStoryArcId}
                onAddEvent={() => setStoryArcEventModalOpen(true)}
              />
            )}

            {selectedSessionId && (
              <ScenesView
                scenes={scenes.filter((s) => s.sessionId === selectedSessionId)}
                sessions={sessions}
                selectedSessionId={selectedSessionId}
                onAddScene={() => setSceneModalOpen(true)}
              />
            )}
          </Section>

          <CampaignModals
            campaignModalOpen={campaignModalOpen}
            sessionModalOpen={sessionModalOpen}
            playerModalOpen={playerModalOpen}
            storyArcModalOpen={storyArcModalOpen}
            storyArcEventModalOpen={storyArcEventModalOpen}
            sceneModalOpen={sceneModalOpen}
            selectedCampaignId={selectedCampaignId}
            selectedStoryArcId={selectedStoryArcId}
            selectedSessionId={selectedSessionId}
            campaignName={campaignName}
            campaignSummary={campaignSummary}
            sessionName={sessionName}
            playerUsername={playerUsername}
            storyArcName={storyArcName}
            storyArcSummary={storyArcSummary}
            sceneName={sceneName}
            sceneSummary={sceneSummary}
            sceneWorldId={sceneWorldId}
            selectedEventId={selectedEventId}
            setCampaignName={setCampaignName}
            setCampaignSummary={setCampaignSummary}
            setSessionName={setSessionName}
            setPlayerUsername={setPlayerUsername}
            setStoryArcName={setStoryArcName}
            setStoryArcSummary={setStoryArcSummary}
            setSceneName={setSceneName}
            setSceneSummary={setSceneSummary}
            setSceneWorldId={setSceneWorldId}
            setSelectedEventId={setSelectedEventId}
            onCloseCampaignModal={() => setCampaignModalOpen(false)}
            onCloseSessionModal={() => setSessionModalOpen(false)}
            onClosePlayerModal={() => setPlayerModalOpen(false)}
            onCloseStoryArcModal={() => setStoryArcModalOpen(false)}
            onCloseStoryArcEventModal={() => setStoryArcEventModalOpen(false)}
            onCloseSceneModal={() => setSceneModalOpen(false)}
            onCreateCampaign={handlers.handleCreateCampaign}
            onCreateSession={handlers.handleCreateSession}
            onAddPlayer={handlers.handleAddPlayer}
            onCreateStoryArc={handlers.handleCreateStoryArc}
            onAddEventToStoryArc={handlers.handleAddEventToStoryArc}
            onCreateScene={handlers.handleCreateScene}
            worlds={worlds}
            allEvents={allEvents}
          />
        </>
      )}
    </section>
  );
}
