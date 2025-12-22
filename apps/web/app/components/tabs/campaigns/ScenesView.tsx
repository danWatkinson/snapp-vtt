"use client";

import SectionHeader from "../../ui/SectionHeader";
import ListContainer from "../../ui/ListContainer";
import ListItem from "../../ui/ListItem";
import type { Scene, Session } from "../../../../lib/clients/campaignClient";
import { getNameById } from "../../../../lib/helpers/entityHelpers";

interface ScenesViewProps {
  scenes: Scene[];
  sessions: Session[];
  selectedSessionId: string;
  onAddScene: () => void;
}

export default function ScenesView({
  scenes,
  sessions,
  selectedSessionId,
  onAddScene
}: ScenesViewProps) {
  return (
    <>
      <SectionHeader
        level={4}
        className="text-sm font-medium"
        action={{
          label: "Add scene",
          onClick: onAddScene,
          size: "xs"
        }}
      >
        Scenes for {getNameById(sessions, selectedSessionId, "selected session")}
      </SectionHeader>

      <ListContainer
        items={scenes}
        emptyMessage="No scenes have been added to this session yet."
      >
        {scenes.map((scene) => (
          <ListItem key={scene.id}>
            <div className="font-semibold">{scene.name}</div>
            {scene.summary && (
              <p className="text-xs" style={{ color: '#5a4232' }}>{scene.summary}</p>
            )}
          </ListItem>
        ))}
      </ListContainer>
    </>
  );
}
