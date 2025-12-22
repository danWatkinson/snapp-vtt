"use client";

import SectionHeader from "../../ui/SectionHeader";
import ListContainer from "../../ui/ListContainer";
import ListItem from "../../ui/ListItem";
import Button from "../../ui/Button";
import type { StoryArc } from "../../../../lib/clients/campaignClient";

interface StoryArcsViewProps {
  storyArcs: StoryArc[];
  onAddStoryArc: () => void;
  onViewEvents: (storyArcId: string) => void;
}

export default function StoryArcsView({
  storyArcs,
  onAddStoryArc,
  onViewEvents
}: StoryArcsViewProps) {
  return (
    <>
      <SectionHeader
        level={4}
        className="text-sm font-medium"
        action={{
          label: "Add story arc",
          onClick: onAddStoryArc,
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
                onClick={() => onViewEvents(arc.id)}
              >
                View events
              </Button>
            </div>
          </ListItem>
        ))}
      </ListContainer>
    </>
  );
}
