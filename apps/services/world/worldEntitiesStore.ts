export type WorldEntityType = "location" | "creature" | "faction" | "concept" | "event";

export type LocationRelationshipType = 
  | "contains"           // A contains B → B is contained by A
  | "is contained by"    // A is contained by B → B contains A
  | "borders against"    // A borders against B → B borders against A (symmetric)
  | "is near"           // A is near B → B is near A (symmetric)
  | "is connected to";  // A is connected to B → B is connected to A (symmetric)

export interface LocationRelationship {
  targetLocationId: string;
  relationshipType: LocationRelationshipType;
}

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
}

// Relationship type definitions with their inverses
const RELATIONSHIP_INVERSES: Record<LocationRelationshipType, LocationRelationshipType> = {
  "contains": "is contained by",
  "is contained by": "contains",
  "borders against": "borders against", // Symmetric
  "is near": "is near", // Symmetric
  "is connected to": "is connected to" // Symmetric
};

export class InMemoryWorldEntityStore {
  private entities: WorldEntity[] = [];

  listByWorld(worldId: string, type?: WorldEntityType): WorldEntity[] {
    const filtered = this.entities.filter(
      (e) => e.worldId === worldId && (!type || e.type === type)
    );
    // Log all locations for debugging
    const allLocations = filtered.filter(e => e.type === "location");
    const locationsWithRelationships = allLocations.filter(e => e.relationships && e.relationships.length > 0);
    console.log('[worldEntitiesStore] listByWorld:', {
      worldId,
      type,
      totalEntities: filtered.length,
      allLocations: allLocations.map(e => ({
        id: e.id,
        name: e.name,
        hasRelationships: !!e.relationships && e.relationships.length > 0,
        relationshipCount: e.relationships?.length || 0
      })),
      locationsWithRelationships: locationsWithRelationships.map(e => ({
        id: e.id,
        name: e.name,
        relationships: e.relationships
      }))
    });
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
    // Validate both locations exist and are locations
    const source = this.entities.find((e) => e.id === sourceLocationId);
    const target = this.entities.find((e) => e.id === targetLocationId);

    if (!source) {
      throw new Error("Source location not found");
    }
    if (!target) {
      throw new Error("Target location not found");
    }
    if (source.type !== "location" || target.type !== "location") {
      throw new Error("Both entities must be locations");
    }
    if (source.worldId !== target.worldId) {
      throw new Error("Both locations must be in the same world");
    }
    if (sourceLocationId === targetLocationId) {
      throw new Error("Cannot create relationship to self");
    }
    
    // Check for cycles (only for hierarchical relationships)
    if (relationshipType === "contains" || relationshipType === "is contained by") {
      if (this.wouldCreateCycle(sourceLocationId, targetLocationId, relationshipType)) {
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

    console.log('[worldEntitiesStore] Added relationship:', {
      sourceId: source.id,
      sourceName: source.name,
      targetId: target.id,
      targetName: target.name,
      relationshipType,
      inverseType
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

  private wouldCreateCycle(sourceLocationId: string, targetLocationId: string, relationshipType: LocationRelationshipType): boolean {
    // Check if adding a relationship would create a cycle
    // For "contains": check if target (or anything target contains) contains source
    // For "is contained by": check if target (or anything that contains target) is source
    
    if (relationshipType === "contains") {
      // We're adding "source contains target"
      // Check if target (or anything target contains) contains source
      const visited = new Set<string>();
      const locationsToProcess: string[] = [targetLocationId];
      
      while (locationsToProcess.length > 0) {
        const currentId = locationsToProcess.pop()!;
        
        if (visited.has(currentId)) {
          continue;
        }
        visited.add(currentId);
        
        // If we've reached the source, we have a cycle
        if (currentId === sourceLocationId) {
          return true; // Cycle detected
        }
        
        // Find all locations that this location contains (walk down the hierarchy)
        const location = this.entities.find((e) => e.id === currentId && e.type === "location");
        if (location?.relationships) {
          location.relationships.forEach((rel) => {
            if (rel.relationshipType === "contains" && !visited.has(rel.targetLocationId)) {
              locationsToProcess.push(rel.targetLocationId);
            }
          });
        }
      }
    } else if (relationshipType === "is contained by") {
      // We're adding "source is contained by target"
      // Check if target (or anything that contains target) is source
      const visited = new Set<string>();
      const locationsToProcess: string[] = [targetLocationId];
      
      while (locationsToProcess.length > 0) {
        const currentId = locationsToProcess.pop()!;
        
        if (visited.has(currentId)) {
          continue;
        }
        visited.add(currentId);
        
        // If we've reached the source, we have a cycle
        if (currentId === sourceLocationId) {
          return true; // Cycle detected
        }
        
        // Find all locations that contain this location (walk up the hierarchy)
        const location = this.entities.find((e) => e.id === currentId && e.type === "location");
        if (location?.relationships) {
          location.relationships.forEach((rel) => {
            if (rel.relationshipType === "is contained by" && !visited.has(rel.targetLocationId)) {
              locationsToProcess.push(rel.targetLocationId);
            }
          });
        }
      }
    }
    
    return false;
  }
}


