import ListContainer from "../ui/ListContainer";
import EntityListItem from "./EntityListItem";
import LocationHierarchy from "./LocationHierarchy";
import type { WorldEntity } from "../../../lib/clients/worldClient";
import type { DigitalAsset } from "../../../lib/clients/assetsClient";

type EntityType = "all" | "location" | "creature" | "faction" | "event";

interface EntityListProps {
  entities: WorldEntity[];
  selectedEntityType: EntityType;
  showTypeLabel?: boolean;
  onLocationClick?: (location: WorldEntity) => void;
  assets?: DigitalAsset[];
}

/**
 * Component that renders the list of entities.
 * Handles hierarchical location rendering and flat list for other types.
 */
export default function EntityList({
  entities,
  selectedEntityType,
  showTypeLabel = false,
  onLocationClick,
  assets = []
}: EntityListProps) {
  const filteredEntities =
    selectedEntityType === "all"
      ? entities
      : entities.filter((e) => e.type === selectedEntityType);

  const emptyMessage =
    selectedEntityType === "all"
      ? "No entities have been added to this world yet."
      : `No ${selectedEntityType}s have been added to this world yet.`;

  // For locations, organize hierarchically
  const shouldRenderHierarchically =
    selectedEntityType === "location" ||
    (selectedEntityType === "all" && entities.some((e) => e.type === "location"));

  if (shouldRenderHierarchically) {
    const locationEntities = entities.filter((e) => e.type === "location");
    const allEvents = entities.filter((e) => e.type === "event");
    const otherEntities =
      selectedEntityType === "all"
        ? entities.filter((e) => e.type !== "location")
        : [];

    return (
      <ListContainer items={filteredEntities} emptyMessage={emptyMessage}>
        <LocationHierarchy
          locations={locationEntities}
          allEntities={entities}
          allEvents={allEvents}
          showTypeLabel={showTypeLabel}
          onLocationClick={onLocationClick}
          assets={assets}
        />
        {otherEntities.map((entity) => (
          <EntityListItem
            key={entity.id}
            entity={entity}
            allEntities={entities}
            showTypeLabel={showTypeLabel}
          />
        ))}
      </ListContainer>
    );
  }

  // For non-location types, render flat list
  return (
    <ListContainer items={filteredEntities} emptyMessage={emptyMessage}>
      {filteredEntities.map((entity) => (
        <EntityListItem
          key={entity.id}
          entity={entity}
          allEntities={entities}
          showTypeLabel={showTypeLabel}
          onLocationClick={entity.type === "location" ? onLocationClick : undefined}
          assets={assets}
        />
      ))}
    </ListContainer>
  );
}
