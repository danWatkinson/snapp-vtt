import type { WorldEntity, LocationRelationship } from "../../../lib/clients/worldClient";

interface EntityRelationshipDisplayProps {
  entity: WorldEntity;
  allEntities: WorldEntity[];
}

/**
 * Component that displays relationship information for an entity.
 * Handles different relationship types based on entity type.
 * Note: For events, also displays locationId even if there are no relationships.
 */
export default function EntityRelationshipDisplay({
  entity,
  allEntities
}: EntityRelationshipDisplayProps) {
  // For events, we need to check locationId even if there are no relationships
  // For other types, we can return early if there are no relationships
  if (entity.type !== "event" && (!entity.relationships || entity.relationships.length === 0)) {
    return null;
  }

  // Location relationships (excluding hierarchical "is contained by" which is handled separately)
  if (entity.type === "location") {
    const locationEntities = allEntities.filter((e) => e.type === "location");
    const filteredRels = (entity.relationships || []).filter(
      (rel) => rel.relationshipType !== "is contained by"
    );
    
    if (filteredRels.length === 0) return null;
    
    return (
      <div className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
        {filteredRels.map((rel, idx) => {
          const targetLocation = locationEntities.find((e) => e.id === rel.targetLocationId);
          if (!targetLocation) return null;
          return (
            <span key={idx} className="mr-2">
              {rel.relationshipType} {targetLocation.name}
              {idx < filteredRels.length - 1 && ", "}
            </span>
          );
        })}
      </div>
    );
  }

  // Event relationships
  if (entity.type === "event") {
    const allEvents = allEntities.filter((e) => e.type === "event");
    const allLocations = allEntities.filter((e) => e.type === "location");
    
    const displayElements: JSX.Element[] = [];
    
    // Show location if event has locationId (can show even without relationships)
    if (entity.locationId) {
      const eventLocation = allLocations.find((e) => e.id === entity.locationId);
      if (eventLocation) {
        displayElements.push(
          <div key="location" className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
            At: {eventLocation.name}
          </div>
        );
      } else {
        displayElements.push(
          <div key="location-loading" className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
            At: <span className="italic">Loading location...</span>
          </div>
        );
      }
    }
    
    // Show relationships if they exist (can show even if there's a locationId)
    if (entity.relationships && entity.relationships.length > 0) {
      // Show sub-events (events that are contained by this event)
      const subEvents = entity.relationships
        .filter((rel) => rel.relationshipType === "contains")
        .map((rel) => {
          const subEvent = allEvents.find((e) => e.id === rel.targetLocationId);
          return subEvent;
        })
        .filter((e): e is WorldEntity => e !== undefined);
      
      if (subEvents.length > 0) {
        displayElements.push(
          <div key="sub-events" className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
            Sub-events: {subEvents.map((e) => e.name).join(", ")}
          </div>
        );
      }
      
      // Show parent event (if this event is part of a composite event)
      const parentEventRel = entity.relationships.find(
        (rel) => rel.relationshipType === "is contained by"
      );
      if (parentEventRel) {
        const parentEvent = allEvents.find((e) => e.id === parentEventRel.targetLocationId);
        if (parentEvent) {
          displayElements.push(
            <div key="parent-event" className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
              Part of: {parentEvent.name}
            </div>
          );
        }
      }
    }
    
    return displayElements.length > 0 ? <>{displayElements}</> : null;
  }

  // Creature relationships
  if (entity.type === "creature") {
    const allFactions = allEntities.filter((e) => e.type === "faction");
    const factions = (entity.relationships || [])
      .filter((rel) => rel.relationshipType === "is member of")
      .map((rel) => {
        const faction = allFactions.find((e) => e.id === rel.targetLocationId);
        return faction;
      })
      .filter((e): e is WorldEntity => e !== undefined);
    
    if (factions.length > 0) {
      return (
        <div className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
          Member of: {factions.map((e) => e.name).join(", ")}
        </div>
      );
    }
    
    return null;
  }

  // Faction relationships
  if (entity.type === "faction") {
    const allFactions = allEntities.filter((e) => e.type === "faction");
    const allCreatures = allEntities.filter((e) => e.type === "creature");
    
    const subFactions = (entity.relationships || [])
      .filter((rel) => rel.relationshipType === "contains")
      .map((rel) => {
        const subFaction = allFactions.find((e) => e.id === rel.targetLocationId);
        return subFaction;
      })
      .filter((e): e is WorldEntity => e !== undefined);
    
    const members = (entity.relationships || [])
      .filter((rel) => rel.relationshipType === "has member")
      .map((rel) => {
        const member = allCreatures.find((e) => e.id === rel.targetLocationId);
        return member;
      })
      .filter((e): e is WorldEntity => e !== undefined);
    
    const parentFactionRel = (entity.relationships || []).find(
      (rel) => rel.relationshipType === "is contained by"
    );
    const parentFaction = parentFactionRel
      ? allFactions.find((e) => e.id === parentFactionRel.targetLocationId)
      : null;
    
    const displayElements: JSX.Element[] = [];
    
    if (subFactions.length > 0) {
      displayElements.push(
        <div key="sub-factions" className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
          Sub-factions: {subFactions.map((e) => e.name).join(", ")}
        </div>
      );
    }
    
    if (members.length > 0) {
      displayElements.push(
        <div key="members" className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
          Members: {members.map((e) => e.name).join(", ")}
        </div>
      );
    }
    
    if (parentFaction) {
      displayElements.push(
        <div key="parent" className="mt-1 text-xs" style={{ color: "#8b6f47" }}>
          Part of: {parentFaction.name}
        </div>
      );
    }
    
    return displayElements.length > 0 ? <>{displayElements}</> : null;
  }

  return null;
}
