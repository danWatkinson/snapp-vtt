import ListItem from "../ui/ListItem";
import EntityRelationshipDisplay from "./EntityRelationshipDisplay";
import LocationEventsDisplay from "./LocationEventsDisplay";
import type { WorldEntity } from "../../../lib/clients/worldClient";

interface LocationHierarchyProps {
  locations: WorldEntity[];
  allEntities: WorldEntity[];
  allEvents: WorldEntity[];
  showTypeLabel?: boolean;
}

/**
 * Component for rendering locations in a hierarchical structure.
 * Handles parent-child relationships and displays events for each location.
 */
export default function LocationHierarchy({
  locations,
  allEntities,
  allEvents,
  showTypeLabel = false
}: LocationHierarchyProps) {
  // Top-level locations are those without "is contained by" relationships
  const topLevelLocations = locations.filter(
    (e) =>
      !e.relationships ||
      !e.relationships.some((rel) => rel.relationshipType === "is contained by")
  );
  
  // Get children by finding locations that have "is contained by" relationship pointing to this parent
  const getChildren = (parentId: string) =>
    locations.filter(
      (e) =>
        e.relationships?.some(
          (rel) =>
            rel.targetLocationId === parentId &&
            rel.relationshipType === "is contained by"
        )
    );
  
  const renderLocation = (location: WorldEntity, depth: number = 0) => {
    const children = getChildren(location.id);
    return (
      <div key={location.id}>
        <ListItem>
          <div className="flex items-start gap-2">
            {showTypeLabel && (
              <span className="rounded px-2 py-0.5 text-xs capitalize snapp-pill">
                {location.type}
              </span>
            )}
            <div className="flex-1" style={{ marginLeft: `${depth * 1.5}rem` }}>
              <div className="font-semibold">
                {depth > 0 && "└ "}
                {location.name}
              </div>
              {location.summary && (
                <p className="text-xs" style={{ color: "#5a4232" }}>
                  {location.summary}
                </p>
              )}
              <EntityRelationshipDisplay entity={location} allEntities={allEntities} />
              <LocationEventsDisplay
                location={location}
                allEvents={allEvents}
                allLocations={locations}
              />
            </div>
          </div>
        </ListItem>
        {children.map((child) => renderLocation(child, depth + 1))}
      </div>
    );
  };
  
  return <>{topLevelLocations.map((loc) => renderLocation(loc))}</>;
}
