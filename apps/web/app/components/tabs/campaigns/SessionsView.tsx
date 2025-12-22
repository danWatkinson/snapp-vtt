"use client";

import SectionHeader from "../../ui/SectionHeader";
import ListContainer from "../../ui/ListContainer";
import ListItem from "../../ui/ListItem";
import Button from "../../ui/Button";
import type { Session } from "../../../../lib/clients/campaignClient";

interface SessionsViewProps {
  sessions: Session[];
  onAddSession: () => void;
  onViewScenes: (sessionId: string) => void;
}

export default function SessionsView({
  sessions,
  onAddSession,
  onViewScenes
}: SessionsViewProps) {
  return (
    <>
      <SectionHeader
        level={4}
        className="text-sm font-medium"
        action={{
          label: "Add session",
          onClick: onAddSession,
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
                onClick={() => onViewScenes(session.id)}
              >
                View scenes
              </Button>
            </div>
          </ListItem>
        ))}
      </ListContainer>
    </>
  );
}
