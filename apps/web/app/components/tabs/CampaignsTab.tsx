"use client";

import { useEffect, useState } from "react";
import { useHomePage } from "../../../lib/contexts/HomePageContext";
import { useTabHelpers } from "../../../lib/hooks/useTabHelpers";
import FormField from "../ui/FormField";
import FormActions from "../ui/FormActions";
import Modal from "../ui/Modal";
import Heading from "../ui/Heading";
import TabButton from "../ui/TabButton";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import ListItem from "../ui/ListItem";
import TabList from "../ui/TabList";
import Section from "../ui/Section";
import SectionHeader from "../ui/SectionHeader";
import ListContainer from "../ui/ListContainer";
import Form from "../ui/Form";
import { getNameById, getEntityTypeLabel } from "../../../lib/helpers/entityHelpers";
import WorldHeader from "../navigation/WorldHeader";
import PlanningTabs from "../navigation/PlanningTabs";

export default function CampaignsTab() {
  const {
    campaigns,
    worlds,
    selectedIds,
    campaignView,
    planningSubTab,
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
    openModal,
    closeModal,
    selectedIds,
    modalsState: modals
  });
  const activeWorldId = selectedIds.worldId;
  const visibleScenes =
    activeWorldId && scenes.length > 0
      ? scenes.filter((scene) => scene.worldId === activeWorldId)
      : scenes;

  // Auto-select first campaign if available and none is selected
  // Only auto-select when user navigates to Campaigns/Story Arcs planning tab (not on initial load)
  // Default to story-arcs view if coming from Story Arcs planning tab, otherwise sessions
  // Use a delay to avoid interfering with user actions (like clicking "Create campaign")
  const [hasNavigatedToCampaigns, setHasNavigatedToCampaigns] = useState(false);
  
  useEffect(() => {
    // Track when user navigates to Campaigns or Story Arcs planning tab
    if (planningSubTab === "Campaigns" || planningSubTab === "Story Arcs") {
      setHasNavigatedToCampaigns(true);
    }
  }, [planningSubTab]);

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
          const defaultView = planningSubTab === "Story Arcs" ? "story-arcs" : "sessions";
          setSelectedCampaignId(campaigns[0].id);
          setCampaignView(defaultView);
          setSessionsLoadedFor(null);
          setPlayersLoadedFor(null);
          setStoryArcsLoadedFor(null);
        }
      }, 300); // Delay to let user interactions complete

      return () => clearTimeout(timeoutId);
    }
  }, [hasNavigatedToCampaigns, campaigns, selectedCampaignId, planningSubTab, campaignModalOpen, setSelectedCampaignId, setCampaignView, setSessionsLoadedFor, setPlayersLoadedFor, setStoryArcsLoadedFor]);

  // Switch to story-arcs view when Story Arcs planning tab is selected
  useEffect(() => {
    if (planningSubTab === "Story Arcs" && selectedCampaignId && campaignView !== "story-arcs") {
      setCampaignView("story-arcs");
    }
  }, [planningSubTab, selectedCampaignId, campaignView, setCampaignView]);

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

  return (
    <section data-component="CampaignsTab" className="space-y-4">
      {selectedIds.worldId && (
        <>
          <WorldHeader />
          <Section>
            <PlanningTabs />

            {/* Only show campaign selection UI if no campaign is selected yet */}
            {!selectedCampaignId && (
              <>
                <SectionHeader
                  action={{
                    label: "Create campaign",
                    onClick: () => setCampaignModalOpen(true)
                  }}
                >
                  Campaigns
                </SectionHeader>

                {campaigns.length > 0 && (
                  <TabList aria-label="Campaigns" variant="planning">
                    {campaigns.map((camp) => {
                      const isActive = selectedCampaignId === camp.id;
                      return (
                        <TabButton
                          key={camp.id}
                          isActive={isActive}
                          onClick={() => {
                            setSelectedCampaignId(camp.id);
                            // Default to story-arcs if coming from Story Arcs planning tab, otherwise sessions
                            const defaultView = planningSubTab === "Story Arcs" ? "story-arcs" : "sessions";
                            setCampaignView(defaultView);
                            setSessionsLoadedFor(null);
                            setPlayersLoadedFor(null);
                            setStoryArcsLoadedFor(null);
                          }}
                          style={!isActive ? { color: "#fefce8" } : undefined}
                        >
                          {camp.name}
                        </TabButton>
                      );
                    })}
                  </TabList>
                )}

                {campaigns.length === 0 && (
                  <EmptyState message="No campaigns have been created yet." />
                )}
              </>
            )}

            {selectedCampaignId && (
              <>
                <TabList aria-label="Campaign views" variant="filter">
            {[
              { key: "story-arcs", label: "Story arcs" },
              { key: "sessions", label: "Sessions" },
              { key: "players", label: "Players" },
              { key: "timeline", label: "Timeline" }
            ].map((view) => {
              const isActive = campaignView === view.key;
              return (
                <TabButton
                  key={view.key}
                  isActive={isActive}
                  onClick={() => {
                    setCampaignView(view.key as "sessions" | "players" | "story-arcs" | "timeline" | null);
                    setSelectedSessionId(null);
                    setSessionsLoadedFor(null);
                    setPlayersLoadedFor(null);
                    setStoryArcsLoadedFor(null);
                  }}
                >
                  {view.label}
                </TabButton>
              );
            })}
                </TabList>

                <div className="flex items-center justify-between">
                  <h3
                    className="text-md font-semibold snapp-heading"
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    {getNameById(campaigns, selectedCampaignId, "selected campaign")}
                  </h3>
                </div>

                {/* Sessions view */}
                {campaignView === "sessions" && (
                  <>
                    <SectionHeader
                level={4}
                className="text-sm font-medium"
                action={{
                  label: "Add session",
                  onClick: () => setSessionModalOpen(true),
                  size: "xs"
                }}
                    >
                      Sessions
                    </SectionHeader>

                    <ListContainer
                      items={sessions}
                      emptyMessage="No sessions have been added to this campaign yet."
                    >
                      {sessions.map((session) => (
                        <ListItem key={session.id}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="font-semibold">{session.name}</div>
                            <Button
                              size="xs"
                              onClick={() => {
                                setSelectedSessionId(session.id);
                                setScenesLoadedFor(null);
                              }}
                            >
                              View scenes
                            </Button>
                          </div>
                        </ListItem>
                      ))}
                    </ListContainer>
                  </>
                )}

                {/* Players view */}
                {campaignView === "players" && (
                  <>
                    <SectionHeader
                level={4}
                className="text-sm font-medium"
                action={{
                  label: "Add player",
                  onClick: () => setPlayerModalOpen(true),
                  size: "xs",
                  "data-testid": "add-player-button"
                }}
              >
                Players
              </SectionHeader>

              <ListContainer
                items={players}
                emptyMessage="No players have been added to this campaign yet."
              >
                {players.map((playerId) => (
                  <ListItem key={playerId}>
                    <div className="font-semibold">{playerId}</div>
                  </ListItem>
                ))}
              </ListContainer>
            </>
          )}

          {/* Story arcs view */}
          {campaignView === "story-arcs" && (
            <>
              <SectionHeader
                level={4}
                className="text-sm font-medium"
                action={{
                  label: "Add story arc",
                  onClick: () => setStoryArcModalOpen(true),
                  size: "xs"
                }}
                    >
                      Story Arcs
                    </SectionHeader>

                    <ListContainer
                      items={storyArcs}
                      emptyMessage="No story arcs have been added to this campaign yet."
                    >
                      {storyArcs.map((arc) => (
                        <ListItem key={arc.id}>
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="font-semibold">{arc.name}</div>
                              {arc.summary && (
                                <p className="text-xs" style={{ color: '#5a4232' }}>{arc.summary}</p>
                              )}
                            </div>
                            <Button
                              size="xs"
                              onClick={() => {
                                setSelectedStoryArcId(arc.id);
                                setStoryArcEventsLoadedFor(null);
                              }}
                            >
                              View events
                            </Button>
                          </div>
                        </ListItem>
                      ))}
                    </ListContainer>
                  </>
                )}

                {/* Timeline view */}
                {campaignView === "timeline" && timeline && (
                  <>
                    <SectionHeader level={4} className="text-sm font-medium">
                      Timeline
                    </SectionHeader>

                    <div className="space-y-4">
                      <div className="rounded border p-3"
                        style={{ borderColor: '#8b6f47', backgroundColor: 'rgba(244, 232, 208, 0.5)' }}>
                        <div className="text-sm font-medium" style={{ color: '#5a4232' }}>
                          Current Moment
                        </div>
                        <div className="text-lg font-semibold" style={{ color: '#3d2817', fontFamily: "'Cinzel', serif" }}>
                          {new Date(timeline.currentMoment).toLocaleString()}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium" style={{ color: '#5a4232' }}>
                          Advance Timeline
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {["second", "minute", "hour", "day", "week", "month", "year"].map((unit) => (
                            <button
                              key={unit}
                              type="button"
                              className="rounded px-2 py-1 text-xs font-semibold hover:opacity-90"
                              style={{ backgroundColor: '#6b5438', color: '#f4e8d0', fontFamily: "'Cinzel', serif" }}
                              onClick={() => handlers.handleAdvanceTimeline(1, unit as any)}
                            >
                              +1 {unit}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {["second", "minute", "hour", "day", "week", "month", "year"].map((unit) => (
                            <button
                              key={unit}
                              type="button"
                              className="rounded px-2 py-1 text-xs font-semibold hover:opacity-90"
                              style={{ backgroundColor: '#8b6f47', color: '#f4e8d0', fontFamily: "'Cinzel', serif" }}
                              onClick={() => handlers.handleAdvanceTimeline(-1, unit as any)}
                            >
                              -1 {unit}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Active Story Arcs */}
                      {(() => {
                        const activeStoryArcs = storyArcs.filter((arc) => {
                          return allEvents.some((event) => {
                            if (!arc.eventIds.includes(event.id)) return false;
                            const hasBeginning = event.beginningTimestamp !== undefined;
                            const hasEnding = event.endingTimestamp !== undefined;
                            const current = timeline.currentMoment;

                            if (hasBeginning && hasEnding) {
                              return (
                                event.beginningTimestamp! <= current &&
                                event.endingTimestamp! >= current
                              );
                            } else if (hasBeginning) {
                              return event.beginningTimestamp! <= current;
                            } else if (hasEnding) {
                              return event.endingTimestamp! >= current;
                            }
                            return false;
                          });
                        });

                        return (
                          <div className="space-y-2">
                            <Heading level={3} className="text-sm font-semibold" style={{ color: '#5a4232' }}>
                              Active Story Arcs
                            </Heading>
                            {activeStoryArcs.length === 0 ? (
                              <EmptyState message="No story arcs are currently active." variant="muted" />
                            ) : (
                              <ul className="space-y-2">
                                {activeStoryArcs.map((arc) => (
                                  <ListItem key={arc.id} variant="timeline">
                                    <div className="font-semibold text-emerald-200">
                                      {arc.name}
                                    </div>
                                    {arc.summary && (
                                      <p className="text-xs text-emerald-300">
                                        {arc.summary}
                                      </p>
                                    )}
                                  </ListItem>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })()}

                      {/* Events on Timeline - simplified version */}
                      {allEvents.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium" style={{ color: '#5a4232' }}>
                            Events on Timeline
                          </div>
                          <div className="space-y-2">
                            {allEvents
                              .filter((e) => e.endingTimestamp && e.endingTimestamp < timeline.currentMoment)
                              .map((event) => (
                                <div
                                  key={event.id}
                                  className="rounded border p-2 text-sm"
                                  style={{ borderColor: '#8b6f47', backgroundColor: 'rgba(244, 232, 208, 0.5)' }}
                                >
                                  <div className="font-semibold" style={{ color: '#3d2817' }}>
                                    {event.name}
                                  </div>
                                  {event.summary && (
                                    <p className="text-xs" style={{ color: '#5a4232' }}>
                                      {event.summary}
                                    </p>
                                  )}
                                </div>
                              ))}
                            {allEvents
                              .filter((event) => {
                                const hasBeginning = event.beginningTimestamp !== undefined;
                                const hasEnding = event.endingTimestamp !== undefined;
                                const current = timeline.currentMoment;
                                if (hasBeginning && hasEnding) {
                                  return event.beginningTimestamp! <= current && event.endingTimestamp! >= current;
                                } else if (hasBeginning) {
                                  return event.beginningTimestamp! <= current;
                                } else if (hasEnding) {
                                  return event.endingTimestamp! >= current;
                                }
                                return false;
                              })
                              .map((event) => (
                                <div
                                  key={event.id}
                                  className="rounded border-2 p-2 text-sm"
                                  style={{ borderColor: '#6b5438', backgroundColor: 'rgba(107, 84, 56, 0.2)' }}
                                >
                                  <div className="font-semibold text-emerald-200">
                                    {event.name} (Current)
                                  </div>
                                  {event.summary && (
                                    <p className="text-xs text-emerald-300">
                                      {event.summary}
                                    </p>
                                  )}
                                </div>
                              ))}
                            {allEvents
                              .filter((e) => e.beginningTimestamp && e.beginningTimestamp > timeline.currentMoment)
                              .map((event) => (
                                <div
                                  key={event.id}
                                  className="rounded border p-2 text-sm opacity-60"
                                  style={{ borderColor: '#8b6f47', backgroundColor: 'rgba(244, 232, 208, 0.5)' }}
                                >
                                  <div className="font-semibold" style={{ color: '#5a4232' }}>
                                    {event.name} (Future)
                                  </div>
                                  {event.summary && (
                                    <p className="text-xs" style={{ color: '#5a4232' }}>
                                      {event.summary}
                                    </p>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Story arc events view */}
                {selectedStoryArcId && (
                  <>
                    <SectionHeader
                level={4}
                className="text-sm font-medium"
                action={{
                  label: "Add event",
                  onClick: () => setStoryArcEventModalOpen(true),
                  size: "xs"
                }}
                    >
                      Events for{" "}
                      {
                        storyArcs.find((arc) => arc.id === selectedStoryArcId)?.name ??
                        "selected story arc"
                      }
                    </SectionHeader>

                    <ListContainer
                      items={storyArcEvents}
                      emptyMessage="No events have been added to this story arc yet."
                    >
                      {storyArcEvents.map((eventId) => {
                        const event = allEvents.find((e) => e.id === eventId);
                        return (
                          <ListItem key={eventId}>
                            <div className="font-semibold">
                              {event?.name ?? eventId}
                            </div>
                            {event?.summary && (
                              <p className="text-xs" style={{ color: '#5a4232' }}>{event.summary}</p>
                            )}
                          </ListItem>
                        );
                      })}
                    </ListContainer>
                  </>
                )}

                {/* Scenes view */}
                {selectedSessionId && (
                  <>
                    <SectionHeader
                level={4}
                className="text-sm font-medium"
                action={{
                  label: "Add scene",
                  onClick: () => setSceneModalOpen(true),
                  size: "xs"
                }}
                    >
                      Scenes for {getNameById(sessions, selectedSessionId, "selected session")}
                    </SectionHeader>

                    <ListContainer
                      items={visibleScenes}
                      emptyMessage="No scenes have been added to this session yet."
                    >
                      {visibleScenes.map((scene) => (
                        <ListItem key={scene.id}>
                          <div className="font-semibold">{scene.name}</div>
                          {scene.summary && (
                            <p className="text-xs" style={{ color: '#5a4232' }}>{scene.summary}</p>
                          )}
                        </ListItem>
                      ))}
                    </ListContainer>
                  </>
                )}
              </>
            )}
          </Section>
        </>
      )}

      {/* Modals */}
      <Modal
        isOpen={campaignModalOpen}
        onClose={() => setCampaignModalOpen(false)}
        title="Create campaign"
        variant="styled"
      >
        <Form onSubmit={handlers.handleCreateCampaign}>
          <FormField
            label="Campaign name"
            value={campaignName}
            onChange={setCampaignName}
            style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
          />
          <FormField
            label="Summary"
            value={campaignSummary}
            onChange={setCampaignSummary}
            type="textarea"
            rows={3}
            style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
          />
          <FormActions
            onCancel={() => setCampaignModalOpen(false)}
            submitLabel="Save campaign"
            variant="styled"
          />
        </Form>
      </Modal>

      {sessionModalOpen && selectedCampaignId && (
        <Modal
          isOpen={sessionModalOpen}
          onClose={() => setSessionModalOpen(false)}
          title="Add session"
          variant="styled"
        >
          <Form onSubmit={handlers.handleCreateSession}>
            <FormField
              label="Session name"
              value={sessionName}
              onChange={setSessionName}
              style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
            />
            <FormActions
              onCancel={() => setSessionModalOpen(false)}
              submitLabel="Save session"
              variant="styled"
            />
          </Form>
        </Modal>
      )}

      {sceneModalOpen && selectedSessionId && (
        <Modal
          isOpen={sceneModalOpen}
          onClose={() => setSceneModalOpen(false)}
          title="Add scene"
          variant="styled"
        >
          <Form onSubmit={handlers.handleCreateScene}>
              <FormField
                label="Scene name"
                value={sceneName}
                onChange={setSceneName}
                style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
              />
              <FormField
                label="Summary"
                value={sceneSummary}
                onChange={setSceneSummary}
                type="textarea"
                rows={3}
                style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
              />
              <FormField
                label="World"
                type="select"
                value={sceneWorldId}
                onChange={setSceneWorldId}
                options={worlds.map((world) => ({ value: world.id, label: world.name }))}
                placeholder="Select a world"
                style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
              />
            <FormActions
              onCancel={() => setSceneModalOpen(false)}
              submitLabel="Save scene"
              variant="styled"
            />
          </Form>
        </Modal>
      )}

      {playerModalOpen && selectedCampaignId && (
        <Modal
          isOpen={playerModalOpen}
          onClose={() => setPlayerModalOpen(false)}
          title="Add player"
          variant="styled"
        >
          <Form onSubmit={handlers.handleAddPlayer}>
            <FormField
              label="Player username"
              value={playerUsername}
              onChange={setPlayerUsername}
              style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
            />
            <FormActions
              onCancel={() => setPlayerModalOpen(false)}
              submitLabel="Save player"
              variant="styled"
            />
          </Form>
        </Modal>
      )}

      {storyArcModalOpen && selectedCampaignId && (
        <Modal
          isOpen={storyArcModalOpen}
          onClose={() => setStoryArcModalOpen(false)}
          title="Add story arc"
          variant="styled"
        >
          <Form onSubmit={handlers.handleCreateStoryArc}>
            <FormField
              label="Story arc name"
              value={storyArcName}
              onChange={setStoryArcName}
              style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
            />
            <FormField
              label="Summary"
              value={storyArcSummary}
              onChange={setStoryArcSummary}
              type="textarea"
              rows={3}
              style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
            />
            <FormActions
              onCancel={() => setStoryArcModalOpen(false)}
              submitLabel="Save story arc"
              variant="styled"
            />
          </Form>
        </Modal>
      )}

      {storyArcEventModalOpen && selectedStoryArcId && (
        <Modal
          isOpen={storyArcEventModalOpen}
          onClose={() => setStoryArcEventModalOpen(false)}
          title="Add event to story arc"
          variant="styled"
        >
          <Form onSubmit={handlers.handleAddEventToStoryArc}>
              <FormField
                label="Event"
                type="select"
                value={selectedEventId || ""}
                onChange={setSelectedEventId}
                options={allEvents.map((event) => ({ value: event.id, label: event.name }))}
                placeholder="Select an event"
                style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
              />
            <FormActions
              onCancel={() => setStoryArcEventModalOpen(false)}
              submitLabel="Save"
              variant="styled"
            />
          </Form>
        </Modal>
      )}
    </section>
  );
}

