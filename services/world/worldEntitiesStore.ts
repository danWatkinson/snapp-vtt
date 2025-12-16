export type WorldEntityType = "location" | "creature" | "faction" | "concept" | "event";

export interface WorldEntity {
  id: string;
  worldId: string;
  type: WorldEntityType;
  name: string;
  summary: string;
  beginningTimestamp?: number; // Unix timestamp in milliseconds (for events)
  endingTimestamp?: number; // Unix timestamp in milliseconds (for events)
}

export class InMemoryWorldEntityStore {
  private entities: WorldEntity[] = [];

  listByWorld(worldId: string, type?: WorldEntityType): WorldEntity[] {
    return this.entities.filter(
      (e) => e.worldId === worldId && (!type || e.type === type)
    );
  }

  createEntity(
    worldId: string,
    type: WorldEntityType,
    name: string,
    summary: string,
    beginningTimestamp?: number,
    endingTimestamp?: number
  ): WorldEntity {
    if (!worldId.trim()) {
      throw new Error("worldId is required");
    }
    if (!name.trim()) {
      throw new Error("name is required");
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
    this.entities.push(entity);
    return entity;
  }
}


