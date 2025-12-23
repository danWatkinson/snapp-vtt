export type WorldEntityType = "location" | "creature" | "faction" | "concept" | "event";

export type LocationRelationshipType = 
  | "contains"           // A contains B → B is contained by A
  | "is contained by"    // A is contained by B → B contains A
  | "borders against"    // A borders against B → B borders against A (symmetric)
  | "is near"           // A is near B → B is near A (symmetric)
  | "is connected to"   // A is connected to B → B is connected to A (symmetric)
  | "has member"        // A faction has member B (creature) → B creature is member of A faction
  | "is member of";     // A creature is member of B faction → B faction has member A

export interface LocationRelationship {
  targetLocationId: string;
  relationshipType: LocationRelationshipType;
}

// For backward compatibility, LocationRelationship is still used
// but relationships can now reference any entity type (locations or events)
// The targetLocationId field is used for both locations and events

export interface WorldEntity {
  id: string;
  worldId: string;
  type: WorldEntityType;
  name: string;
  summary: string;
  beginningTimestamp?: number; // Unix timestamp in milliseconds (for events)
  endingTimestamp?: number; // Unix timestamp in milliseconds (for events)
  relationships?: LocationRelationship[]; // Relationships to other locations
  locationId?: string; // Optional reference to a location (for events)
  imageAssetId?: string; // Optional reference to a DigitalAsset (image) used as the entity's image
}

// Relationship type definitions with their inverses
const RELATIONSHIP_INVERSES: Record<LocationRelationshipType, LocationRelationshipType> = {
  "contains": "is contained by",
  "is contained by": "contains",
  "borders against": "borders against", // Symmetric
  "is near": "is near", // Symmetric
  "is connected to": "is connected to", // Symmetric
  "has member": "is member of",
  "is member of": "has member"
};

export class InMemoryWorldEntityStore {
  private entities: WorldEntity[] = [];

  listByWorld(worldId: string, type?: WorldEntityType): WorldEntity[] {
    const filtered = this.entities.filter(
      (e) => e.worldId === worldId && (!type || e.type === type)
    );
    return filtered;
  }

  createEntity(
    worldId: string,
    type: WorldEntityType,
    name: string,
    summary: string,
    beginningTimestamp?: number,
    endingTimestamp?: number,
    locationId?: string
  ): WorldEntity {
    if (!worldId.trim()) {
      throw new Error("worldId is required");
    }
    if (!name.trim()) {
      throw new Error("name is required");
    }
    
    if (locationId !== undefined && locationId !== null) {
      // Validate that location exists and is a location (for events)
      if (type !== "event") {
        throw new Error("locationId can only be set for events");
      }
      const location = this.entities.find((e) => e.id === locationId);
      if (!location) {
        throw new Error("Location not found");
      }
      if (location.type !== "location") {
        throw new Error("locationId must reference a location");
      }
      if (location.worldId !== worldId) {
        throw new Error("Location must be in the same world");
      }
    }
    const entity: WorldEntity = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      worldId,
      type,
      name,
      summary
    };
    if (type === "event") {
      if (beginningTimestamp !== undefined) {
        entity.beginningTimestamp = beginningTimestamp;
      }
      if (endingTimestamp !== undefined) {
        entity.endingTimestamp = endingTimestamp;
      }
    }
    if (locationId !== undefined && locationId !== null) {
      entity.locationId = locationId;
    }
    this.entities.push(entity);
    return entity;
  }

  listByParentLocation(parentLocationId: string): WorldEntity[] {
    // Find all entities that have a relationship indicating they are contained by the parent
    return this.entities.filter((e) => {
      if (!e.relationships) return false;
      return e.relationships.some(
        (rel) => rel.targetLocationId === parentLocationId && rel.relationshipType === "is contained by"
      );
    });
  }

  addRelationship(
    sourceLocationId: string,
    targetLocationId: string,
    relationshipType: LocationRelationshipType
  ): void {
    // Validate both entities exist
    const source = this.entities.find((e) => e.id === sourceLocationId);
    const target = this.entities.find((e) => e.id === targetLocationId);

    if (!source) {
      throw new Error("Source entity not found");
    }
    if (!target) {
      throw new Error("Target entity not found");
    }
    
    // Allow relationships between:
    // - Two locations (existing behavior)
    // - Two events (for composite events)
    // - Two factions (for nested factions)
    // - Faction and creature (for faction membership)
    const isValidLocationRelationship = source.type === "location" && target.type === "location";
    const isValidEventRelationship = source.type === "event" && target.type === "event";
    const isValidFactionRelationship = source.type === "faction" && target.type === "faction";
    const isValidFactionCreatureRelationship = 
      (source.type === "faction" && target.type === "creature") ||
      (source.type === "creature" && target.type === "faction");
    
    if (!isValidLocationRelationship && !isValidEventRelationship && !isValidFactionRelationship && !isValidFactionCreatureRelationship) {
      throw new Error("Relationships can only be created between two locations, two events, two factions, or between a faction and a creature");
    }
    
    // For event relationships, only allow "contains" / "is contained by" (for composite events)
    if (isValidEventRelationship) {
      if (relationshipType !== "contains" && relationshipType !== "is contained by") {
        throw new Error("Event relationships can only use 'contains' or 'is contained by' relationship types");
      }
    }
    
    // For faction-faction relationships, only allow "contains" / "is contained by" (for nested factions)
    if (isValidFactionRelationship) {
      if (relationshipType !== "contains" && relationshipType !== "is contained by") {
        throw new Error("Faction-faction relationships can only use 'contains' or 'is contained by' relationship types");
      }
    }
    
    // For faction-creature relationships, only allow "has member" / "is member of" (for faction membership)
    if (isValidFactionCreatureRelationship) {
      if (relationshipType !== "has member" && relationshipType !== "is member of") {
        throw new Error("Faction-creature relationships can only use 'has member' or 'is member of' relationship types");
      }
      // Ensure the relationship direction is correct: faction has member creature
      if (source.type === "creature" && relationshipType === "has member") {
        throw new Error("A creature cannot have 'has member' relationship. Use 'is member of' from creature to faction, or 'has member' from faction to creature");
      }
      if (source.type === "faction" && relationshipType === "is member of") {
        throw new Error("A faction cannot have 'is member of' relationship. Use 'has member' from faction to creature, or 'is member of' from creature to faction");
      }
    }
    
    if (source.worldId !== target.worldId) {
      throw new Error("Both entities must be in the same world");
    }
    if (sourceLocationId === targetLocationId) {
      throw new Error("Cannot create relationship to self");
    }
    
    // Check for cycles (only for hierarchical relationships)
    // Membership relationships don't create cycles (a creature can be a member of multiple factions)
    if (relationshipType === "contains" || relationshipType === "is contained by") {
      if (this.wouldCreateCycle(sourceLocationId, targetLocationId, relationshipType, source.type)) {
        throw new Error("Cannot create circular reference");
      }
    }

    // Initialize relationships arrays if needed
    if (!source.relationships) {
      source.relationships = [];
    }
    if (!target.relationships) {
      target.relationships = [];
    }

    // Check if relationship already exists (check both directions to prevent duplicates)
    const existingRelationship = source.relationships.find(
      (r) => r.targetLocationId === targetLocationId && r.relationshipType === relationshipType
    );
    if (existingRelationship) {
      return; // Relationship already exists, no need to add again
    }
    
    // Get the inverse relationship type
    const inverseType = RELATIONSHIP_INVERSES[relationshipType];
    
    // Also check if the inverse relationship exists on the target (prevents duplicate reciprocal relationships)
    const existingInverse = target.relationships.find(
      (r) => r.targetLocationId === sourceLocationId && r.relationshipType === inverseType
    );
    if (existingInverse) {
      // Inverse already exists, just add the forward relationship to maintain consistency
      source.relationships.push({
        targetLocationId,
        relationshipType
      });
      return;
    }

    // Add relationship from source to target
    source.relationships.push({
      targetLocationId,
      relationshipType
    });

    // Add inverse relationship from target to source
    target.relationships.push({
      targetLocationId: sourceLocationId,
      relationshipType: inverseType
    });
  }

  getRelationships(locationId: string): LocationRelationship[] {
    const entity = this.entities.find((e) => e.id === locationId);
    return entity?.relationships || [];
  }

  getRelatedLocations(locationId: string, relationshipType?: LocationRelationshipType): WorldEntity[] {
    const relationships = this.getRelationships(locationId);
    const filtered = relationshipType
      ? relationships.filter((r) => r.relationshipType === relationshipType)
      : relationships;

    return filtered
      .map((r) => this.entities.find((e) => e.id === r.targetLocationId))
      .filter((e): e is WorldEntity => e !== undefined);
  }

  // Get sub-events for a composite event (events that are contained by this event)
  getSubEventsForEvent(eventId: string): WorldEntity[] {
    const event = this.entities.find((e) => e.id === eventId && e.type === "event");
    if (!event) {
      return []; // Event not found
    }
    
    // Find all events that have a "is contained by" relationship to this event
    return this.entities.filter((e) => {
      if (e.type !== "event") return false;
      if (!e.relationships) return false;
      return e.relationships.some(
        (rel) => rel.targetLocationId === eventId && rel.relationshipType === "is contained by"
      );
    });
  }

  // Get sub-factions for a nested faction (factions that are contained by this faction)
  getSubFactionsForFaction(factionId: string): WorldEntity[] {
    const faction = this.entities.find((e) => e.id === factionId && e.type === "faction");
    if (!faction) {
      return []; // Faction not found
    }
    
    // Find all factions that have a "is contained by" relationship to this faction
    return this.entities.filter((e) => {
      if (e.type !== "faction") return false;
      if (!e.relationships) return false;
      return e.relationships.some(
        (rel) => rel.targetLocationId === factionId && rel.relationshipType === "is contained by"
      );
    });
  }

  // Get members (creatures) of a faction
  getMembersForFaction(factionId: string): WorldEntity[] {
    const faction = this.entities.find((e) => e.id === factionId && e.type === "faction");
    if (!faction) {
      return []; // Faction not found
    }
    
    // Find all creatures that have an "is member of" relationship to this faction
    return this.entities.filter((e) => {
      if (e.type !== "creature") return false;
      if (!e.relationships) return false;
      return e.relationships.some(
        (rel) => rel.targetLocationId === factionId && rel.relationshipType === "is member of"
      );
    });
  }

  // Get events for a location, including events from parent locations
  // Uses relationships to find parent locations (via "is contained by" relationships)
  getEventsForLocation(locationId: string): WorldEntity[] {
    const events: WorldEntity[] = [];
    const locationIds = new Set<string>();
    const visited = new Set<string>();
    
    // Start with the given location
    let currentLocation = this.entities.find((e) => e.id === locationId && e.type === "location");
    if (!currentLocation) {
      return events; // Location not found
    }
    
    // Collect all parent location IDs (walk up the hierarchy using relationships)
    const locationsToProcess: WorldEntity[] = [currentLocation];
    
    while (locationsToProcess.length > 0) {
      const location = locationsToProcess.pop()!;
      
      if (visited.has(location.id)) {
        continue; // Already processed
      }
      visited.add(location.id);
      locationIds.add(location.id);
      
      // Find parent locations via relationships (e.g., "is contained by" means the target is a parent)
      if (location.relationships) {
        location.relationships.forEach((rel) => {
          if (rel.relationshipType === "is contained by") {
            // The target location is a parent
            const parentByRel = this.entities.find(
              (e) => e.id === rel.targetLocationId && e.type === "location"
            );
            if (parentByRel && !visited.has(parentByRel.id)) {
              locationsToProcess.push(parentByRel);
            }
          }
        });
      }
    }
    
    // Find all events associated with any of these locations
    this.entities.forEach((entity) => {
      if (entity.type === "event" && entity.locationId && locationIds.has(entity.locationId)) {
        events.push(entity);
      }
    });
    
    return events;
  }

  private wouldCreateCycle(sourceLocationId: string, targetLocationId: string, relationshipType: LocationRelationshipType, entityType: WorldEntityType): boolean {
    // Check if adding a relationship would create a cycle
    // For "contains": check if target (or anything target contains) contains source
    // For "is contained by": check if target (or anything that contains target) is source
    // Works for both locations and events
    
    if (relationshipType === "contains") {
      // We're adding "source contains target"
      // Check if target (or anything target contains) contains source
      const visited = new Set<string>();
      const entitiesToProcess: string[] = [targetLocationId];
      
      while (entitiesToProcess.length > 0) {
        const currentId = entitiesToProcess.pop()!;
        
        if (visited.has(currentId)) {
          continue;
        }
        visited.add(currentId);
        
        // If we've reached the source, we have a cycle
        if (currentId === sourceLocationId) {
          return true; // Cycle detected
        }
        
        // Find all entities that this entity contains (walk down the hierarchy)
        const entity = this.entities.find((e) => e.id === currentId && e.type === entityType);
        if (entity?.relationships) {
          entity.relationships.forEach((rel) => {
            if (rel.relationshipType === "contains" && !visited.has(rel.targetLocationId)) {
              entitiesToProcess.push(rel.targetLocationId);
            }
          });
        }
      }
    } else if (relationshipType === "is contained by") {
      // We're adding "source is contained by target"
      // Check if target (or anything that contains target) is source
      const visited = new Set<string>();
      const entitiesToProcess: string[] = [targetLocationId];
      
      while (entitiesToProcess.length > 0) {
        const currentId = entitiesToProcess.pop()!;
        
        if (visited.has(currentId)) {
          continue;
        }
        visited.add(currentId);
        
        // If we've reached the source, we have a cycle
        if (currentId === sourceLocationId) {
          return true; // Cycle detected
        }
        
        // Find all entities that contain this entity (walk up the hierarchy)
        const entity = this.entities.find((e) => e.id === currentId && e.type === entityType);
        if (entity?.relationships) {
          entity.relationships.forEach((rel) => {
            if (rel.relationshipType === "is contained by" && !visited.has(rel.targetLocationId)) {
              entitiesToProcess.push(rel.targetLocationId);
            }
          });
        }
      }
    }
    
    return false;
  }

  /**
   * Update an entity with partial data.
   * Only updates the provided fields, leaving others unchanged.
   */
  updateEntity(
    entityId: string,
    updates: Partial<Pick<WorldEntity, "name" | "summary" | "imageAssetId">>
  ): WorldEntity {
    const index = this.entities.findIndex((e) => e.id === entityId);
    if (index === -1) {
      throw new Error("Entity not found");
    }
    
    const entity = this.entities[index];
    const updated: WorldEntity = { ...entity, ...updates };
    this.entities[index] = updated;
    return updated;
  }

  /**
   * Clear all entities from the store.
   * Used for test isolation - resets the store to an empty state.
   */
  clear(): void {
    this.entities = [];
  }
}


