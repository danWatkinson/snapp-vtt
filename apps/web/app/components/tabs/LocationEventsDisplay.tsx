import type { WorldEntity } from "../../../lib/clients/worldClient";

interface LocationEventsDisplayProps {
  location: WorldEntity;
  allEvents: WorldEntity[];
  allLocations: WorldEntity[];
}

/**
 * Component that displays events associated with a location,
 * including events from parent locations in the hierarchy.
 */
export default function LocationEventsDisplay({
  location,
  allEvents,
  allLocations
}: LocationEventsDisplayProps) {
  // Deduplicate events by ID
  const eventMap = new Map<string, WorldEntity>();
  allEvents.forEach((event) => {
    eventMap.set(event.id, event);
  });
  const uniqueEvents = Array.from(eventMap.values());
  
  // Filter events for this location
  const locationEvents = uniqueEvents.filter(
    (e) => e.locationId === location.id
  );
  
  // Build parent chain by traversing up the hierarchy
  const parentLocationIds = new Set<string>();
  const visited = new Set<string>();
  const locationsToProcess: WorldEntity[] = [location];
  
  while (locationsToProcess.length > 0) {
    const currentLoc = locationsToProcess.pop()!;
    if (visited.has(currentLoc.id)) continue;
    visited.add(currentLoc.id);
    
    if (currentLoc.relationships) {
      currentLoc.relationships.forEach((rel) => {
        if (rel.relationshipType === "is contained by") {
          const parentId = rel.targetLocationId;
          parentLocationIds.add(parentId);
          const parent = allLocations.find((e) => e.id === parentId);
          if (parent && !visited.has(parent.id)) {
            locationsToProcess.push(parent);
          }
        }
      });
    }
  }
  
  // Filter events that belong to any parent location in the chain
  const parentEvents = uniqueEvents.filter(
    (e) => e.locationId && parentLocationIds.has(e.locationId)
  );
  
  // Always show Events section if there are any events (location or parent)
  if (locationEvents.length === 0 && parentEvents.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-2 text-xs" style={{ color: "#6b7280" }}>
      <div className="font-medium mb-1">Events:</div>
      {locationEvents.map((event) => (
        <div key={event.id} className="ml-2">
          • {event.name}
        </div>
      ))}
      {parentEvents.length > 0 && (
        <>
          <div className="ml-2 mt-1 italic" style={{ color: "#9ca3af" }}>
            From parent locations:
          </div>
          {parentEvents.map((event) => {
            const eventLocation = allLocations.find((e) => e.id === event.locationId);
            return (
              <div key={event.id} className="ml-4">
                • {event.name} ({eventLocation?.name || "Unknown"})
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
