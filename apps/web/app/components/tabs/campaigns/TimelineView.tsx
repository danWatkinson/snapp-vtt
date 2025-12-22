"use client";

import SectionHeader from "../../ui/SectionHeader";
import Heading from "../../ui/Heading";
import EmptyState from "../../ui/EmptyState";
import ListItem from "../../ui/ListItem";
import type { Timeline, StoryArc } from "../../../../lib/clients/campaignClient";
import type { WorldEntity } from "../../../../lib/clients/worldClient";

interface TimelineViewProps {
  timeline: Timeline;
  storyArcs: StoryArc[];
  allEvents: WorldEntity[];
  onAdvanceTimeline: (amount: number, unit: "second" | "minute" | "hour" | "day" | "week" | "month" | "year") => void;
}

export default function TimelineView({
  timeline,
  storyArcs,
  allEvents,
  onAdvanceTimeline
}: TimelineViewProps) {
  // Calculate active story arcs
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

  // Filter events by timeline position
  const pastEvents = allEvents.filter(
    (e) => e.endingTimestamp && e.endingTimestamp < timeline.currentMoment
  );
  const currentEvents = allEvents.filter((event) => {
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
  });
  const futureEvents = allEvents.filter(
    (e) => e.beginningTimestamp && e.beginningTimestamp > timeline.currentMoment
  );

  return (
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

        {/* Events on Timeline */}
        {allEvents.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium" style={{ color: '#5a4232' }}>
              Events on Timeline
            </div>
            <div className="space-y-2">
              {pastEvents.map((event) => (
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
              {currentEvents.map((event) => (
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
              {futureEvents.map((event) => (
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
  );
}
