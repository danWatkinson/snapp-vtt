"use client";

import SectionHeader from "../../ui/SectionHeader";
import ListContainer from "../../ui/ListContainer";
import ListItem from "../../ui/ListItem";
import type { StoryArc } from "../../../../lib/clients/campaignClient";
import type { WorldEntity } from "../../../../lib/clients/worldClient";

interface StoryArcEventsViewProps {
  storyArcEvents: string[];
  storyArcs: StoryArc[];
  allEvents: WorldEntity[];
  selectedStoryArcId: string;
  onAddEvent: () => void;
}

export default function StoryArcEventsView({
  storyArcEvents,
  storyArcs,
  allEvents,
  selectedStoryArcId,
  onAddEvent
}: StoryArcEventsViewProps) {
  const storyArcName = storyArcs.find((arc) => arc.id === selectedStoryArcId)?.name ?? "selected story arc";

  return (
    <>
      <SectionHeader
        level={4}
        className="text-sm font-medium"
        action={{
          label: "Add event",
          onClick: onAddEvent,
          size: "xs"
        }}
      >
        Events for {storyArcName}
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
  );
}
