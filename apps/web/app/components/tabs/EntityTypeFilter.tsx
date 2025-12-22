import TabList from "../ui/TabList";
import TabButton from "../ui/TabButton";

type EntityType = "all" | "location" | "creature" | "faction" | "event";

interface EntityTypeFilterProps {
  selectedType: EntityType;
  onTypeChange: (type: EntityType) => void;
}

const ENTITY_TYPES: EntityType[] = ["all", "location", "creature", "faction", "event"];

const TYPE_LABELS: Record<EntityType, string> = {
  all: "All",
  location: "Locations",
  creature: "Creatures",
  faction: "Factions",
  event: "Events"
};

/**
 * Component for filtering entities by type.
 */
export default function EntityTypeFilter({
  selectedType,
  onTypeChange
}: EntityTypeFilterProps) {
  return (
    <TabList aria-label="Entity types" variant="filter">
      {ENTITY_TYPES.map((type) => {
        const isActive = selectedType === type;
        return (
          <TabButton
            key={type}
            isActive={isActive}
            onClick={() => onTypeChange(type)}
            className="capitalize"
          >
            {TYPE_LABELS[type]}
          </TabButton>
        );
      })}
    </TabList>
  );
}
