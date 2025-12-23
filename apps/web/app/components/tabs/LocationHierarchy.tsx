import ListItem from "../ui/ListItem";
import EntityRelationshipDisplay from "./EntityRelationshipDisplay";
import LocationEventsDisplay from "./LocationEventsDisplay";
import type { WorldEntity } from "../../../lib/clients/worldClient";
import type { DigitalAsset } from "../../../lib/clients/assetsClient";

interface LocationHierarchyProps {
  locations: WorldEntity[];
  allEntities: WorldEntity[];
  allEvents: WorldEntity[];
  showTypeLabel?: boolean;
  onLocationClick?: (location: WorldEntity) => void;
  assets?: DigitalAsset[];
}

/**
 * Component for rendering locations in a hierarchical structure.
 * Handles parent-child relationships and displays events for each location.
 */
export default function LocationHierarchy({
  locations,
  allEntities,
  allEvents,
  showTypeLabel = false,
  onLocationClick,
  assets = []
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
    const locationImage = location.imageAssetId
      ? assets.find((asset) => asset.id === location.imageAssetId && asset.mediaType === "image")
      : null;
    
    return (
      <div key={location.id}>
        <ListItem
          onClick={onLocationClick ? () => onLocationClick(location) : undefined}
          className={onLocationClick ? "cursor-pointer hover:bg-slate-50/60" : ""}
        >
          <div className="flex items-start gap-3">
            <div className="h-16 w-24 overflow-hidden rounded border border-dashed snapp-border bg-slate-50/60 flex items-center justify-center flex-shrink-0">
              {locationImage ? (
                <img
                  src={locationImage.storageUrl}
                  alt={locationImage.name || locationImage.originalFileName || location.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="px-2 text-xs text-slate-500 text-center">
                  No image
                </span>
              )}
            </div>
            <div className="flex-1" style={{ marginLeft: `${depth * 1.5}rem` }}>
              <div className="flex items-center gap-2">
                {showTypeLabel && (
                  <span className="rounded px-2 py-0.5 text-xs capitalize snapp-pill">
                    {location.type}
                  </span>
                )}
                <div className="font-semibold">
                  {depth > 0 && "└ "}
                  {location.name}
                </div>
              </div>
              {location.summary && (
                <p className="text-xs mt-1" style={{ color: "#5a4232" }}>
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
