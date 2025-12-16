"use client";

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

export default function CampaignsTab() {
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

  return (
    <section data-component="CampaignsTab" className="space-y-4">
      <p className="text-sm snapp-muted">
        Campaigns domain – plan story arcs and quests.
      </p>

      <SectionHeader
        action={{
          label: "Create campaign",
          onClick: () => setCampaignModalOpen(true)
        }}
      >
        Campaigns
      </SectionHeader>

      {campaigns.length > 0 && (
        <TabList aria-label="Campaigns">
          {campaigns.map((camp) => {
            const isActive = selectedCampaignId === camp.id;
            return (
              <TabButton
                key={camp.id}
                isActive={isActive}
                onClick={() => {
                  setSelectedCampaignId(camp.id);
                  setCampaignView("sessions");
                  setSessionsLoadedFor(null);
                  setPlayersLoadedFor(null);
                  setStoryArcsLoadedFor(null);
                }}
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

      {/* Nested view tabs for selected campaign */}
      {selectedCampaignId && (
        <TabList aria-label="Campaign views">
          {[
            { key: "sessions", label: "Sessions" },
            { key: "players", label: "Players" },
            { key: "story-arcs", label: "Story arcs" },
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
      )}

      {/* Sessions view */}
      {selectedCampaignId && campaignView === "sessions" && (
        <Section>
          <div className="flex items-center justify-between">
            <Heading level={3}>
              Sessions for{" "}
              {
                campaigns.find((c) => c.id === selectedCampaignId)?.name ??
                "selected campaign"
              }
            </Heading>
            <Button size="xs" onClick={() => setSessionModalOpen(true)}>
              Add session
            </Button>
          </div>

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
        </Section>
      )}

      {/* Players view */}
      {selectedCampaignId && campaignView === "players" && (
        <Section variant="styled">
          <SectionHeader
            level={3}
            headingStyle={{ color: '#3d2817' }}
            action={{
              label: "Add player",
              onClick: () => setPlayerModalOpen(true),
              size: "xs",
              "data-testid": "add-player-button"
            }}
          >
            Players for{" "}
            {
              campaigns.find((c) => c.id === selectedCampaignId)?.name ??
              "selected campaign"
            }
          </SectionHeader>

          <ListContainer
            items={players}
            emptyMessage="No players have been added to this campaign yet."
            emptyVariant="muted"
          >
            {players.map((playerId) => (
              <ListItem key={playerId} variant="styled">
                <div className="font-semibold">{playerId}</div>
              </ListItem>
            ))}
          </ListContainer>
        </Section>
      )}

      {/* Story arcs view */}
      {selectedCampaignId && campaignView === "story-arcs" && (
        <Section variant="styled">
          <SectionHeader
            level={3}
            headingStyle={{ color: '#3d2817' }}
            action={{
              label: "Add story arc",
              onClick: () => setStoryArcModalOpen(true),
              size: "xs"
            }}
          >
            Story Arcs for{" "}
            {
              campaigns.find((c) => c.id === selectedCampaignId)?.name ??
              "selected campaign"
            }
          </SectionHeader>

          <ListContainer
            items={storyArcs}
            emptyMessage="No story arcs have been added to this campaign yet."
            emptyVariant="muted"
          >
            {storyArcs.map((arc) => (
              <ListItem key={arc.id} variant="styled">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold">{arc.name}</div>
                    {arc.summary && (
                      <p className="text-xs" style={{ color: '#5a4232' }}>{arc.summary}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="rounded px-3 py-1 text-xs font-semibold hover:opacity-90"
                    style={{ backgroundColor: '#6b5438', color: '#f4e8d0', fontFamily: "'Cinzel', serif" }}
                    onClick={() => {
                      setSelectedStoryArcId(arc.id);
                      setStoryArcEventsLoadedFor(null);
                    }}
                  >
                    View events
                  </button>
                </div>
              </ListItem>
            ))}
          </ListContainer>
        </Section>
      )}

      {/* Timeline view - this is very large, so I'll include the key parts */}
      {selectedCampaignId && campaignView === "timeline" && timeline && (
        <Section variant="styled">
          <Heading level={3}>
            Timeline for{" "}
            {
              campaigns.find((c) => c.id === selectedCampaignId)?.name ??
              "selected campaign"
            }
          </Heading>

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
                        <li
                          key={arc.id}
                          className="rounded border p-2 text-sm"
                          style={{ borderColor: '#6b5438', backgroundColor: 'rgba(107, 84, 56, 0.2)' }}
                        >
                          <div className="font-semibold text-emerald-200">
                            {arc.name}
                          </div>
                          {arc.summary && (
                            <p className="text-xs text-emerald-300">
                              {arc.summary}
                            </p>
                          )}
                        </li>
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
        </Section>
      )}

      {/* Story arc events view */}
      {selectedStoryArcId && (
        <Section variant="styled">
          <SectionHeader
            level={3}
            headingStyle={{ color: '#3d2817' }}
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
            emptyVariant="muted"
          >
            {storyArcEvents.map((eventId) => {
              const event = allEvents.find((e) => e.id === eventId);
              return (
                <ListItem key={eventId} variant="styled">
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
        </Section>
      )}

      {/* Scenes view */}
      {selectedSessionId && (
        <Section variant="styled">
          <SectionHeader
            level={3}
            headingStyle={{ color: '#3d2817' }}
            action={{
              label: "Add scene",
              onClick: () => setSceneModalOpen(true),
              size: "xs"
            }}
          >
            Scenes for{" "}
            {
              sessions.find((s) => s.id === selectedSessionId)?.name ??
              "selected session"
            }
          </SectionHeader>

          <ListContainer
            items={visibleScenes}
            emptyMessage="No scenes have been added to this session yet."
            emptyVariant="muted"
          >
            {visibleScenes.map((scene) => (
              <ListItem key={scene.id} variant="styled">
                <div className="font-semibold">{scene.name}</div>
                {scene.summary && (
                  <p className="text-xs" style={{ color: '#5a4232' }}>{scene.summary}</p>
                )}
              </ListItem>
            ))}
          </ListContainer>
        </Section>
      )}

      {/* Modals */}
      <Modal
        isOpen={campaignModalOpen}
        onClose={() => setCampaignModalOpen(false)}
        title="Create campaign"
        variant="styled"
      >
        <form onSubmit={handlers.handleCreateCampaign} className="space-y-3">
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
        </form>
      </Modal>

      {sessionModalOpen && selectedCampaignId && (
        <Modal
          isOpen={sessionModalOpen}
          onClose={() => setSessionModalOpen(false)}
          title="Add session"
          variant="styled"
        >
          <form onSubmit={handlers.handleCreateSession} className="space-y-3">
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
          </form>
        </Modal>
      )}

      {sceneModalOpen && selectedSessionId && (
        <Modal
          isOpen={sceneModalOpen}
          onClose={() => setSceneModalOpen(false)}
          title="Add scene"
          variant="styled"
        >
          <form onSubmit={handlers.handleCreateScene} className="space-y-3">
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
          </form>
        </Modal>
      )}

      {playerModalOpen && selectedCampaignId && (
        <Modal
          isOpen={playerModalOpen}
          onClose={() => setPlayerModalOpen(false)}
          title="Add player"
          variant="styled"
        >
          <form onSubmit={handlers.handleAddPlayer} className="space-y-3">
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
          </form>
        </Modal>
      )}

      {storyArcModalOpen && selectedCampaignId && (
        <Modal
          isOpen={storyArcModalOpen}
          onClose={() => setStoryArcModalOpen(false)}
          title="Add story arc"
          variant="styled"
        >
          <form onSubmit={handlers.handleCreateStoryArc} className="space-y-3">
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
          </form>
        </Modal>
      )}

      {storyArcEventModalOpen && selectedStoryArcId && (
        <Modal
          isOpen={storyArcEventModalOpen}
          onClose={() => setStoryArcEventModalOpen(false)}
          title="Add event to story arc"
          variant="styled"
        >
          <form onSubmit={handlers.handleAddEventToStoryArc} className="space-y-3">
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
          </form>
        </Modal>
      )}
    </section>
  );
}

