import TabList from "../ui/TabList";
import TabButton from "../ui/TabButton";
import SectionHeader from "../ui/SectionHeader";
import EmptyState from "../ui/EmptyState";
import type { World } from "../../../lib/clients/worldClient";

interface WorldSelectionProps {
  worlds: World[];
  selectedWorldId: string | null;
  onWorldSelect: (worldId: string) => void;
  onEntityTypeReset: () => void;
}

/**
 * Component for selecting a world when no world is currently selected.
 */
export default function WorldSelection({
  worlds,
  selectedWorldId,
  onWorldSelect,
  onEntityTypeReset
}: WorldSelectionProps) {
  if (worlds.length === 0) {
    return <EmptyState message="No worlds have been created yet." />;
  }

  return (
    <>
      <SectionHeader>Worlds</SectionHeader>
      <TabList aria-label="Worlds" variant="planning">
        {worlds.map((world) => {
          const isActive = selectedWorldId === world.id;
          return (
            <TabButton
              key={world.id}
              isActive={isActive}
              onClick={() => {
                onWorldSelect(world.id);
                onEntityTypeReset();
              }}
              style={!isActive ? { color: "#fefce8" } : undefined}
            >
              {world.name}
            </TabButton>
          );
        })}
      </TabList>
    </>
  );
}
