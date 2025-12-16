"use client";

import {
  type Campaign,
  type Session,
  type Scene,
  type StoryArc,
  type Timeline,
} from "../../lib/campaignClient";
import { type World } from "../../lib/worldClient";
import { type WorldEntity } from "../../lib/worldClient";

interface CampaignsTabProps {
  campaigns: Campaign[];
  worlds: World[];
  selectedCampaignId: string | null;
  campaignView: "sessions" | "players" | "story-arcs" | "timeline" | null;
  sessions: Session[];
  players: string[];
  storyArcs: StoryArc[];
  selectedStoryArcId: string | null;
  storyArcEvents: string[];
  allEvents: WorldEntity[];
  timeline: Timeline | null;
  selectedSessionId: string | null;
  scenes: Scene[];
  campaignModalOpen: boolean;
  sessionModalOpen: boolean;
  playerModalOpen: boolean;
  storyArcModalOpen: boolean;
  storyArcEventModalOpen: boolean;
  sceneModalOpen: boolean;
  campaignName: string;
  campaignSummary: string;
  sessionName: string;
  playerUsername: string;
  storyArcName: string;
  storyArcSummary: string;
  selectedEventId: string;
  sceneName: string;
  sceneSummary: string;
  sceneWorldId: string;
  onCreateCampaign: (e: React.FormEvent) => void;
  onCreateSession: (e: React.FormEvent) => void;
  onAddPlayer: (e: React.FormEvent) => void;
  onCreateStoryArc: (e: React.FormEvent) => void;
  onAddEventToStoryArc: (e: React.FormEvent) => void;
  onAdvanceTimeline: (
    amount: number,
    unit: "second" | "minute" | "hour" | "day" | "week" | "month" | "year"
  ) => void;
  onCreateScene: (e: React.FormEvent) => void;
  setSelectedCampaignId: (id: string | null) => void;
  setCampaignView: (
    view: "sessions" | "players" | "story-arcs" | "timeline" | null
  ) => void;
  setSelectedStoryArcId: (id: string | null) => void;
  setSelectedSessionId: (id: string | null) => void;
  setCampaignModalOpen: (open: boolean) => void;
  setSessionModalOpen: (open: boolean) => void;
  setPlayerModalOpen: (open: boolean) => void;
  setStoryArcModalOpen: (open: boolean) => void;
  setStoryArcEventModalOpen: (open: boolean) => void;
  setSceneModalOpen: (open: boolean) => void;
  setSessionsLoadedFor: (key: string | null) => void;
  setPlayersLoadedFor: (key: string | null) => void;
  setStoryArcsLoadedFor: (key: string | null) => void;
  setStoryArcEventsLoadedFor: (key: string | null) => void;
  setScenesLoadedFor: (key: string | null) => void;
  setCampaignName: (name: string) => void;
  setCampaignSummary: (summary: string) => void;
  setSessionName: (name: string) => void;
  setPlayerUsername: (username: string) => void;
  setStoryArcName: (name: string) => void;
  setStoryArcSummary: (summary: string) => void;
  setSelectedEventId: (id: string) => void;
  setSceneName: (name: string) => void;
  setSceneSummary: (summary: string) => void;
  setSceneWorldId: (worldId: string) => void;
}

export default function CampaignsTab({
  campaigns,
  worlds,
  selectedCampaignId,
  campaignView,
  sessions,
  players,
  storyArcs,
  selectedStoryArcId,
  storyArcEvents,
  allEvents,
  timeline,
  selectedSessionId,
  scenes,
  campaignModalOpen,
  sessionModalOpen,
  playerModalOpen,
  storyArcModalOpen,
  storyArcEventModalOpen,
  sceneModalOpen,
  campaignName,
  campaignSummary,
  sessionName,
  playerUsername,
  storyArcName,
  storyArcSummary,
  selectedEventId,
  sceneName,
  sceneSummary,
  sceneWorldId,
  onCreateCampaign,
  onCreateSession,
  onAddPlayer,
  onCreateStoryArc,
  onAddEventToStoryArc,
  onAdvanceTimeline,
  onCreateScene,
  setSelectedCampaignId,
  setCampaignView,
  setSelectedStoryArcId,
  setSelectedSessionId,
  setCampaignModalOpen,
  setSessionModalOpen,
  setPlayerModalOpen,
  setStoryArcModalOpen,
  setStoryArcEventModalOpen,
  setSceneModalOpen,
  setSessionsLoadedFor,
  setPlayersLoadedFor,
  setStoryArcsLoadedFor,
  setStoryArcEventsLoadedFor,
  setScenesLoadedFor,
  setCampaignName,
  setCampaignSummary,
  setSessionName,
  setPlayerUsername,
  setStoryArcName,
  setStoryArcSummary,
  setSelectedEventId,
  setSceneName,
  setSceneSummary,
  setSceneWorldId,
}: CampaignsTabProps) {
  return (
    <section data-component="CampaignsTab" className="space-y-4">
      <p className="text-sm snapp-muted">
        Campaigns domain – plan story arcs and quests.
      </p>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium snapp-heading" style={{ fontFamily: "'Cinzel', serif" }}>
          Campaigns
        </h2>
        <button
          type="button"
          className="rounded px-3 py-1 text-sm font-semibold hover:opacity-90 snapp-primary-btn"
          onClick={() => setCampaignModalOpen(true)}
        >
          Create campaign
        </button>
      </div>

      {campaigns.length > 0 && (
        <nav
          role="tablist"
          aria-label="Campaigns"
          className="inline-flex gap-2 rounded-full p-1 text-xs snapp-tabs"
        >
          {campaigns.map((camp) => {
            const isActive = selectedCampaignId === camp.id;
            return (
              <button
                key={camp.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                className={
                  "rounded-full px-3 py-1 transition-colors " +
                  (isActive ? "text-white" : "bg-transparent hover:opacity-80")
                }
                style={
                  isActive
                    ? { backgroundColor: "#6b5438", color: "#f4e8d0", fontFamily: "'Cinzel', serif" }
                    : { color: "#3d2817" }
                }
                onClick={() => {
                  setSelectedCampaignId(camp.id);
                  setCampaignView("sessions");
                  setSessionsLoadedFor(null);
                  setPlayersLoadedFor(null);
                  setStoryArcsLoadedFor(null);
                }}
              >
                {camp.name}
              </button>
            );
          })}
        </nav>
      )}

      {campaigns.length === 0 && (
        <p className="text-sm snapp-muted">
          No campaigns have been created yet.
        </p>
      )}

      {/* Nested view tabs for selected campaign */}
      {selectedCampaignId && (
        <nav
          role="tablist"
          aria-label="Campaign views"
          className="inline-flex gap-2 rounded-full p-1 text-xs snapp-tabs"
        >
          {[
            { key: "sessions", label: "Sessions" },
            { key: "players", label: "Players" },
            { key: "story-arcs", label: "Story arcs" },
            { key: "timeline", label: "Timeline" }
          ].map((view) => {
            const isActive = campaignView === view.key;
            return (
              <button
                key={view.key}
                role="tab"
                type="button"
                aria-selected={isActive}
                className={
                  "rounded-full px-3 py-1 transition-colors " +
                  (isActive ? "text-white" : "bg-transparent hover:opacity-80")
                }
                style={
                  isActive
                    ? { backgroundColor: "#6b5438", color: "#f4e8d0", fontFamily: "'Cinzel', serif" }
                    : { color: "#3d2817" }
                }
                onClick={() => {
                  setCampaignView(view.key as CampaignsTabProps["campaignView"]);
                  setSelectedSessionId(null);
                  setSessionsLoadedFor(null);
                  setPlayersLoadedFor(null);
                  setStoryArcsLoadedFor(null);
                }}
              >
                {view.label}
              </button>
            );
          })}
        </nav>
      )}

      {/* Sessions view */}
      {selectedCampaignId && campaignView === "sessions" && (
        <section className="space-y-3 rounded-lg border p-4 snapp-panel">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-semibold snapp-heading" style={{ fontFamily: "'Cinzel', serif" }}>
              Sessions for{" "}
              {
                campaigns.find((c) => c.id === selectedCampaignId)?.name ??
                "selected campaign"
              }
            </h3>
            <button
              type="button"
              className="rounded px-3 py-1 text-xs font-semibold hover:opacity-90 snapp-primary-btn"
              onClick={() => setSessionModalOpen(true)}
            >
              Add session
            </button>
          </div>

          {sessions.length === 0 ? (
            <p className="text-sm snapp-muted">
              No sessions have been added to this campaign yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  role="listitem"
                  className="rounded border p-3 text-sm snapp-panel"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-semibold">{session.name}</div>
                    <button
                      type="button"
                      className="rounded px-3 py-1 text-xs font-semibold hover:opacity-90 snapp-primary-btn"
                      onClick={() => {
                        setSelectedSessionId(session.id);
                        setScenesLoadedFor(null);
                      }}
                    >
                      View scenes
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Players view */}
      {selectedCampaignId && campaignView === "players" && (
        <section className="space-y-3 rounded-lg border p-4"
          style={{ borderColor: '#8b6f47', backgroundColor: 'rgba(244, 232, 208, 0.6)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-md font-semibold" style={{ fontFamily: "'Cinzel', serif", color: '#3d2817' }}>
              Players for{" "}
              {
                campaigns.find((c) => c.id === selectedCampaignId)?.name ??
                "selected campaign"
              }
            </h3>
            <button
              type="button"
              className="rounded px-3 py-1 text-xs font-semibold hover:opacity-90"
              style={{ backgroundColor: '#6b5438', color: '#f4e8d0', fontFamily: "'Cinzel', serif" }}
              onClick={() => setPlayerModalOpen(true)}
              data-testid="add-player-button"
            >
              Add player
            </button>
          </div>

          {players.length === 0 ? (
            <p className="text-sm" style={{ color: '#5a4232' }}>
              No players have been added to this campaign yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {players.map((playerId) => (
                <li
                  key={playerId}
                  role="listitem"
                  className="rounded border p-3 text-sm"
                  style={{ borderColor: '#8b6f47', backgroundColor: 'rgba(244, 232, 208, 0.6)' }}
                >
                  <div className="font-semibold">{playerId}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Story arcs view */}
      {selectedCampaignId && campaignView === "story-arcs" && (
        <section className="space-y-3 rounded-lg border p-4"
          style={{ borderColor: '#8b6f47', backgroundColor: 'rgba(244, 232, 208, 0.6)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-md font-semibold" style={{ fontFamily: "'Cinzel', serif", color: '#3d2817' }}>
              Story Arcs for{" "}
              {
                campaigns.find((c) => c.id === selectedCampaignId)?.name ??
                "selected campaign"
              }
            </h3>
            <button
              type="button"
              className="rounded px-3 py-1 text-xs font-semibold hover:opacity-90"
              style={{ backgroundColor: '#6b5438', color: '#f4e8d0', fontFamily: "'Cinzel', serif" }}
              onClick={() => setStoryArcModalOpen(true)}
            >
              Add story arc
            </button>
          </div>

          {storyArcs.length === 0 ? (
            <p className="text-sm" style={{ color: '#5a4232' }}>
              No story arcs have been added to this campaign yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {storyArcs.map((arc) => (
                <li
                  key={arc.id}
                  role="listitem"
                  className="rounded border p-3 text-sm"
                  style={{ borderColor: '#8b6f47', backgroundColor: 'rgba(244, 232, 208, 0.6)' }}
                >
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
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Timeline view - this is very large, so I'll include the key parts */}
      {selectedCampaignId && campaignView === "timeline" && timeline && (
        <section className="space-y-3 rounded-lg border p-4"
          style={{ borderColor: '#8b6f47', backgroundColor: 'rgba(244, 232, 208, 0.6)' }}>
          <h3 className="text-md font-semibold">
            Timeline for{" "}
            {
              campaigns.find((c) => c.id === selectedCampaignId)?.name ??
              "selected campaign"
            }
          </h3>

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
                    onClick={() => onAdvanceTimeline(1, unit as any)}
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
                    onClick={() => onAdvanceTimeline(-1, unit as any)}
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
                  <h3 className="text-sm font-semibold" style={{ color: '#5a4232', fontFamily: "'Cinzel', serif" }}>
                    Active Story Arcs
                  </h3>
                  {activeStoryArcs.length === 0 ? (
                    <p className="text-sm" style={{ color: '#5a4232' }}>
                      No story arcs are currently active.
                    </p>
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
        </section>
      )}

      {/* Story arc events view */}
      {selectedStoryArcId && (
        <section className="space-y-3 rounded-lg border p-4"
          style={{ borderColor: '#8b6f47', backgroundColor: 'rgba(244, 232, 208, 0.6)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-md font-semibold" style={{ fontFamily: "'Cinzel', serif", color: '#3d2817' }}>
              Events for{" "}
              {
                storyArcs.find((arc) => arc.id === selectedStoryArcId)?.name ??
                "selected story arc"
              }
            </h3>
            <button
              type="button"
              className="rounded px-3 py-1 text-xs font-semibold hover:opacity-90"
              style={{ backgroundColor: '#6b5438', color: '#f4e8d0', fontFamily: "'Cinzel', serif" }}
              onClick={() => setStoryArcEventModalOpen(true)}
            >
              Add event
            </button>
          </div>

          {storyArcEvents.length === 0 ? (
            <p className="text-sm" style={{ color: '#5a4232' }}>
              No events have been added to this story arc yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {storyArcEvents.map((eventId) => {
                const event = allEvents.find((e) => e.id === eventId);
                return (
                  <li
                    key={eventId}
                    role="listitem"
                    className="rounded border p-3 text-sm"
                    style={{ borderColor: '#8b6f47', backgroundColor: 'rgba(244, 232, 208, 0.6)' }}
                  >
                    <div className="font-semibold">
                      {event?.name ?? eventId}
                    </div>
                    {event?.summary && (
                      <p className="text-xs" style={{ color: '#5a4232' }}>{event.summary}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Scenes view */}
      {selectedSessionId && (
        <section className="space-y-3 rounded-lg border p-4"
          style={{ borderColor: '#8b6f47', backgroundColor: 'rgba(244, 232, 208, 0.6)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-md font-semibold" style={{ fontFamily: "'Cinzel', serif", color: '#3d2817' }}>
              Scenes for{" "}
              {
                sessions.find((s) => s.id === selectedSessionId)?.name ??
                "selected session"
              }
            </h3>
            <button
              type="button"
              className="rounded px-3 py-1 text-xs font-semibold hover:opacity-90"
              style={{ backgroundColor: '#6b5438', color: '#f4e8d0', fontFamily: "'Cinzel', serif" }}
              onClick={() => setSceneModalOpen(true)}
            >
              Add scene
            </button>
          </div>

          {scenes.length === 0 ? (
            <p className="text-sm" style={{ color: '#5a4232' }}>
              No scenes have been added to this session yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {scenes.map((scene) => (
                <li
                  key={scene.id}
                  role="listitem"
                  className="rounded border p-3 text-sm"
                  style={{ borderColor: '#8b6f47', backgroundColor: 'rgba(244, 232, 208, 0.6)' }}
                >
                  <div className="font-semibold">{scene.name}</div>
                  {scene.summary && (
                    <p className="text-xs" style={{ color: '#5a4232' }}>{scene.summary}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Modals */}
      {campaignModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Create campaign"
            className="w-full max-w-md rounded-lg border p-4 shadow-lg"
            style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', boxShadow: '0 10px 25px rgba(107, 84, 56, 0.3)' }}
          >
            <h2 className="text-lg font-medium mb-3" style={{ fontFamily: "'Cinzel', serif", color: '#3d2817' }}>Create campaign</h2>
            <form onSubmit={onCreateCampaign} className="space-y-3">
              <label className="block text-sm">
                Campaign name
                <input
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Summary
                <textarea
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
                  rows={3}
                  value={campaignSummary}
                  onChange={(e) => setCampaignSummary(e.target.value)}
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="rounded px-3 py-1 text-sm hover:opacity-80"
                  style={{ color: '#5a4232' }}
                  onClick={() => setCampaignModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded px-3 py-1 text-sm font-semibold hover:opacity-90"
                  style={{ backgroundColor: '#6b5438', color: '#f4e8d0', fontFamily: "'Cinzel', serif" }}
                >
                  Save campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {sessionModalOpen && selectedCampaignId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add session"
            className="w-full max-w-md rounded-lg border p-4 shadow-lg"
            style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', boxShadow: '0 10px 25px rgba(107, 84, 56, 0.3)' }}
          >
            <h2 className="text-lg font-medium mb-3" style={{ fontFamily: "'Cinzel', serif", color: '#3d2817' }}>Add session</h2>
            <form onSubmit={onCreateSession} className="space-y-3">
              <label className="block text-sm">
                Session name
                <input
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="rounded px-3 py-1 text-sm hover:opacity-80"
                  style={{ color: '#5a4232' }}
                  onClick={() => setSessionModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded px-3 py-1 text-sm font-semibold hover:opacity-90"
                  style={{ backgroundColor: '#6b5438', color: '#f4e8d0', fontFamily: "'Cinzel', serif" }}
                >
                  Save session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {sceneModalOpen && selectedSessionId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add scene"
            className="w-full max-w-md rounded-lg border p-4 shadow-lg"
            style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', boxShadow: '0 10px 25px rgba(107, 84, 56, 0.3)' }}
          >
            <h2 className="text-lg font-medium mb-3" style={{ fontFamily: "'Cinzel', serif", color: '#3d2817' }}>Add scene</h2>
            <form onSubmit={onCreateScene} className="space-y-3">
              <label className="block text-sm">
                Scene name
                <input
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
                  value={sceneName}
                  onChange={(e) => setSceneName(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Summary
                <textarea
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
                  rows={3}
                  value={sceneSummary}
                  onChange={(e) => setSceneSummary(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                World
                <select
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
                  value={sceneWorldId}
                  onChange={(e) => setSceneWorldId(e.target.value)}
                >
                  <option value="">Select a world</option>
                  {worlds.map((world) => (
                    <option key={world.id} value={world.id}>
                      {world.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="rounded px-3 py-1 text-sm hover:opacity-80"
                  style={{ color: '#5a4232' }}
                  onClick={() => setSceneModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded px-3 py-1 text-sm font-semibold hover:opacity-90"
                  style={{ backgroundColor: '#6b5438', color: '#f4e8d0', fontFamily: "'Cinzel', serif" }}
                >
                  Save scene
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {playerModalOpen && selectedCampaignId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add player"
            className="w-full max-w-md rounded-lg border p-4 shadow-lg"
            style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', boxShadow: '0 10px 25px rgba(107, 84, 56, 0.3)' }}
          >
            <h2 className="text-lg font-medium mb-3" style={{ fontFamily: "'Cinzel', serif", color: '#3d2817' }}>Add player</h2>
            <form onSubmit={onAddPlayer} className="space-y-3">
              <label className="block text-sm">
                Player username
                <input
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
                  value={playerUsername}
                  onChange={(e) => setPlayerUsername(e.target.value)}
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="rounded px-3 py-1 text-sm hover:opacity-80"
                  style={{ color: '#5a4232' }}
                  onClick={() => setPlayerModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded px-3 py-1 text-sm font-semibold hover:opacity-90"
                  style={{ backgroundColor: '#6b5438', color: '#f4e8d0', fontFamily: "'Cinzel', serif" }}
                >
                  Save player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {storyArcModalOpen && selectedCampaignId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add story arc"
            className="w-full max-w-md rounded-lg border p-4 shadow-lg"
            style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', boxShadow: '0 10px 25px rgba(107, 84, 56, 0.3)' }}
          >
            <h2 className="text-lg font-medium mb-3" style={{ fontFamily: "'Cinzel', serif", color: '#3d2817' }}>Add story arc</h2>
            <form onSubmit={onCreateStoryArc} className="space-y-3">
              <label className="block text-sm">
                Story arc name
                <input
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
                  value={storyArcName}
                  onChange={(e) => setStoryArcName(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Summary
                <textarea
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
                  rows={3}
                  value={storyArcSummary}
                  onChange={(e) => setStoryArcSummary(e.target.value)}
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="rounded px-3 py-1 text-sm hover:opacity-80"
                  style={{ color: '#5a4232' }}
                  onClick={() => setStoryArcModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded px-3 py-1 text-sm font-semibold hover:opacity-90"
                  style={{ backgroundColor: '#6b5438', color: '#f4e8d0', fontFamily: "'Cinzel', serif" }}
                >
                  Save story arc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {storyArcEventModalOpen && selectedStoryArcId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add event to story arc"
            className="w-full max-w-md rounded-lg border p-4 shadow-lg"
            style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', boxShadow: '0 10px 25px rgba(107, 84, 56, 0.3)' }}
          >
            <h2 className="text-lg font-medium mb-3" style={{ fontFamily: "'Cinzel', serif", color: '#3d2817' }}>Add event to story arc</h2>
            <form onSubmit={onAddEventToStoryArc} className="space-y-3">
              <label className="block text-sm">
                Event
                <select
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                >
                  <option value="">Select an event</option>
                  {allEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="rounded px-3 py-1 text-sm hover:opacity-80"
                  style={{ color: '#5a4232' }}
                  onClick={() => setStoryArcEventModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded px-3 py-1 text-sm font-semibold hover:opacity-90"
                  style={{ backgroundColor: '#6b5438', color: '#f4e8d0', fontFamily: "'Cinzel', serif" }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

