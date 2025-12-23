"use client";

/**
 * @deprecated This component is being phased out as part of the UI refactoring.
 * Use CampaignView instead, which is accessed through World → Campaign navigation.
 */
import { useEffect, useState, useCallback } from "react";
import { useHomePage } from "../../../lib/contexts/HomePageContext";
import { useTabHelpers } from "../../../lib/hooks/useTabHelpers";
import Section from "../ui/Section";
import SectionHeader from "../ui/SectionHeader";
import { getNameById } from "../../../lib/helpers/entityHelpers";
import WorldHeaderWithTabs from "../navigation/WorldHeaderWithTabs";
import CampaignSelection from "./campaigns/CampaignSelection";
import CampaignViewFilter from "./campaigns/CampaignViewFilter";
import SessionsView from "./campaigns/SessionsView";
import PlayersView from "./campaigns/PlayersView";
import StoryArcsView from "./campaigns/StoryArcsView";
import TimelineView from "./campaigns/TimelineView";
import ScenesView from "./campaigns/ScenesView";
import StoryArcEventsView from "./campaigns/StoryArcEventsView";
import CampaignModals from "./campaigns/CampaignModals";

export default function CampaignsTab() {
  const {
    campaigns,
    worlds,
    selectedIds,
    campaignView,
    subTab,
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

  // Wrapper functions for modal handlers to match useTabHelpers signature
  const openModalWrapper = useCallback((key: string) => {
    openModal(key as any);
  }, [openModal]);
  const closeModalWrapper = useCallback((key: string) => {
    closeModal(key as any);
  }, [closeModal]);

  // Use tab helpers to consolidate setup (now includes modal/selection states)
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
    openModal: openModalWrapper,
    closeModal: closeModalWrapper,
    selectedIds,
    modalsState: modals
  });
  const activeWorldId = selectedIds.worldId;
  const visibleScenes =
    activeWorldId && scenes.length > 0
      ? scenes.filter((scene) => scene.worldId === activeWorldId)
      : scenes;

  // Auto-select first campaign if available and none is selected
  // Only auto-select when user navigates to Campaigns/Story Arcs tab (not on initial load)
  // Default to story-arcs view if coming from Story Arcs tab, otherwise sessions
  // Use a delay to avoid interfering with user actions (like creating a campaign via Snapp menu)
  const [hasNavigatedToCampaigns, setHasNavigatedToCampaigns] = useState(false);
  
  useEffect(() => {
    // Track when user navigates to Campaigns or Story Arcs tab
    if (subTab === "Campaigns" || subTab === "Story Arcs") {
      setHasNavigatedToCampaigns(true);
    }
  }, [subTab]);

  useEffect(() => {
    if (
      hasNavigatedToCampaigns &&
      !selectedCampaignId &&
      campaigns.length > 0 &&
      !campaignModalOpen // Don't auto-select if user is creating a campaign
    ) {
      // Use setTimeout to defer auto-selection, allowing user actions to complete first
      const timeoutId = setTimeout(() => {
        // Double-check conditions haven't changed (user might have started creating a campaign)
        if (!selectedCampaignId && campaigns.length > 0 && !campaignModalOpen) {
          const defaultView = subTab === "Story Arcs" ? "story-arcs" : "sessions";
          setSelectedCampaignId(campaigns[0].id);
          setCampaignView(defaultView);
          setSessionsLoadedFor(null);
          setPlayersLoadedFor(null);
          setStoryArcsLoadedFor(null);
        }
      }, 300); // Delay to let user interactions complete

      return () => clearTimeout(timeoutId);
    }
  }, [hasNavigatedToCampaigns, campaigns, selectedCampaignId, subTab, campaignModalOpen, setSelectedCampaignId, setCampaignView, setSessionsLoadedFor, setPlayersLoadedFor, setStoryArcsLoadedFor]);

  // Switch to story-arcs view when Story Arcs tab is selected
  useEffect(() => {
    if (subTab === "Story Arcs" && selectedCampaignId && campaignView !== "story-arcs") {
      setCampaignView("story-arcs");
    }
  }, [subTab, selectedCampaignId, campaignView, setCampaignView]);

  // Auto-select first story arc if available and none is selected (only when viewing story arcs)
  useEffect(() => {
    if (
      selectedCampaignId &&
      campaignView === "story-arcs" &&
      !selectedStoryArcId &&
      storyArcs.length > 0
    ) {
      setSelectedStoryArcId(storyArcs[0].id);
      setStoryArcEventsLoadedFor(null);
    }
  }, [selectedCampaignId, campaignView, storyArcs, selectedStoryArcId, setSelectedStoryArcId, setStoryArcEventsLoadedFor]);

  const handleCampaignSelect = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    // Default to story-arcs if coming from Story Arcs tab, otherwise sessions
    const defaultView = subTab === "Story Arcs" ? "story-arcs" : "sessions";
    setCampaignView(defaultView);
    setSessionsLoadedFor(null);
    setPlayersLoadedFor(null);
    setStoryArcsLoadedFor(null);
  };

  const handleViewChange = (view: "sessions" | "players" | "story-arcs" | "timeline" | null) => {
    setCampaignView(view);
    setSelectedSessionId(null);
    setSessionsLoadedFor(null);
    setPlayersLoadedFor(null);
    setStoryArcsLoadedFor(null);
  };

  return (
    <section data-component="CampaignsTab" className="space-y-4">
      <WorldHeaderWithTabs />
      
      {selectedIds.worldId && (
        <Section>
          <SectionHeader>
            Campaigns
          </SectionHeader>

          <CampaignSelection
            campaigns={campaigns}
            selectedCampaignId={selectedCampaignId}
            onCampaignSelect={handleCampaignSelect}
          />

          {selectedCampaignId && (
            <>
              <CampaignViewFilter
                campaignView={campaignView}
                onViewChange={handleViewChange}
              />

              <h3
                className="text-md font-semibold snapp-heading"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {getNameById(campaigns, selectedCampaignId, "selected campaign")}
              </h3>

              {campaignView === "sessions" && (
                <SessionsView
                  sessions={sessions}
                  onAddSession={() => setSessionModalOpen(true)}
                  onViewScenes={(sessionId) => {
                    setSelectedSessionId(sessionId);
                    setScenesLoadedFor(null);
                  }}
                />
              )}

              {campaignView === "players" && (
                <PlayersView
                  players={players}
                  onAddPlayer={() => setPlayerModalOpen(true)}
                />
              )}

              {campaignView === "story-arcs" && (
                <StoryArcsView
                  storyArcs={storyArcs}
                  onAddStoryArc={() => setStoryArcModalOpen(true)}
                  onViewEvents={(storyArcId) => {
                    setSelectedStoryArcId(storyArcId);
                    setStoryArcEventsLoadedFor(null);
                  }}
                />
              )}

              {campaignView === "timeline" && timeline && (
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
                  scenes={visibleScenes}
                  sessions={sessions}
                  selectedSessionId={selectedSessionId}
                  onAddScene={() => setSceneModalOpen(true)}
                />
              )}
            </>
          )}
        </Section>
      )}

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
    </section>
  );
}

