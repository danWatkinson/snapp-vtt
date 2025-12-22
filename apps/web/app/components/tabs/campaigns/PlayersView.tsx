"use client";

import SectionHeader from "../../ui/SectionHeader";
import ListContainer from "../../ui/ListContainer";
import ListItem from "../../ui/ListItem";

interface PlayersViewProps {
  players: string[];
  onAddPlayer: () => void;
}

export default function PlayersView({
  players,
  onAddPlayer
}: PlayersViewProps) {
  return (
    <>
      <SectionHeader
        level={4}
        className="text-sm font-medium"
        action={{
          label: "Add player",
          onClick: onAddPlayer,
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
  );
}
