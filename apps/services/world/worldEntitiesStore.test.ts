import { describe, it, expect } from "vitest";
import {
  InMemoryWorldEntityStore,
  type WorldEntityType
} from "./worldEntitiesStore";

describe("InMemoryWorldEntityStore", () => {
  const worldId = "world-1";
  const type: WorldEntityType = "location";

  it("creates and lists entities by world and type", () => {
    const store = new InMemoryWorldEntityStore();
    expect(store.listByWorld(worldId)).toEqual([]);

    const created = store.createEntity(
      worldId,
      type,
      "Whispering Woods",
      "A forest."
    );

    const allForWorld = store.listByWorld(worldId);
    expect(allForWorld).toHaveLength(1);
    expect(allForWorld[0]).toEqual(created);

    const locations = store.listByWorld(worldId, "location");
    expect(locations).toHaveLength(1);
  });

  it("requires worldId and name", () => {
    const store = new InMemoryWorldEntityStore();
    expect(() =>
      store.createEntity("", type, "Name", "Summary")
    ).toThrow("worldId is required");
    expect(() =>
      store.createEntity(worldId, type, "", "Summary")
    ).toThrow("name is required");
  });

  it("handles event entities with optional timestamps", () => {
    const store = new InMemoryWorldEntityStore();

    // both timestamps
    const eventWithBoth = store.createEntity(
      worldId,
      "event",
      "Battle of Dawn",
      "A great battle.",
      1000,
      2000
    );
    expect(eventWithBoth.beginningTimestamp).toBe(1000);
    expect(eventWithBoth.endingTimestamp).toBe(2000);

    // only beginningTimestamp
    const eventWithBegin = store.createEntity(
      worldId,
      "event",
      "Treaty Signed",
      "Peace declared.",
      3000
    );
    expect(eventWithBegin.beginningTimestamp).toBe(3000);
    expect(eventWithBegin.endingTimestamp).toBeUndefined();

    // only endingTimestamp
    const eventWithEnd = store.createEntity(
      worldId,
      "event",
      "Mysterious End",
      "Unknown start.",
      undefined,
      4000
    );
    expect(eventWithEnd.beginningTimestamp).toBeUndefined();
    expect(eventWithEnd.endingTimestamp).toBe(4000);
  });

  it("creates location with parent location", () => {
    const store = new InMemoryWorldEntityStore();
    
    const kingdom = store.createEntity(
      worldId,
      "location",
      "Kingdom of Eldoria",
      "A vast kingdom."
    );
    
    const town = store.createEntity(
      worldId,
      "location",
      "Town of Riversend",
      "A small town.",
      undefined,
      undefined,
      kingdom.id
    );
    
    expect(town.parentLocationId).toBe(kingdom.id);
    expect(kingdom.parentLocationId).toBeUndefined();
  });

  it("validates parent location exists", () => {
    const store = new InMemoryWorldEntityStore();
    
    expect(() =>
      store.createEntity(
        worldId,
        "location",
        "Child Location",
        "A location.",
        undefined,
        undefined,
        "non-existent-id"
      )
    ).toThrow("Parent location not found");
  });

  it("validates parent is a location", () => {
    const store = new InMemoryWorldEntityStore();
    
    const creature = store.createEntity(
      worldId,
      "creature",
      "Dragon",
      "A fearsome dragon."
    );
    
    expect(() =>
      store.createEntity(
        worldId,
        "location",
        "Dragon's Lair",
        "Where the dragon lives.",
        undefined,
        undefined,
        creature.id
      )
    ).toThrow("Parent must be a location");
  });

  it("validates parent is in the same world", () => {
    const store = new InMemoryWorldEntityStore();
    const otherWorldId = "world-2";
    
    const parent = store.createEntity(
      worldId,
      "location",
      "Parent Location",
      "A location."
    );
    
    expect(() =>
      store.createEntity(
        otherWorldId,
        "location",
        "Child Location",
        "A location.",
        undefined,
        undefined,
        parent.id
      )
    ).toThrow("Parent location must be in the same world");
  });

  it("lists children of a parent location", () => {
    const store = new InMemoryWorldEntityStore();
    
    const kingdom = store.createEntity(
      worldId,
      "location",
      "Kingdom",
      "A kingdom."
    );
    
    const town1 = store.createEntity(
      worldId,
      "location",
      "Town 1",
      "First town.",
      undefined,
      undefined,
      kingdom.id
    );
    
    const town2 = store.createEntity(
      worldId,
      "location",
      "Town 2",
      "Second town.",
      undefined,
      undefined,
      kingdom.id
    );
    
    const children = store.listByParentLocation(kingdom.id);
    expect(children).toHaveLength(2);
    expect(children.map(c => c.id)).toContain(town1.id);
    expect(children.map(c => c.id)).toContain(town2.id);
  });

  it("allows creating entities without parent location", () => {
    const store = new InMemoryWorldEntityStore();
    
    const location = store.createEntity(
      worldId,
      "location",
      "Standalone Location",
      "A location without parent."
    );
    
    expect(location.parentLocationId).toBeUndefined();
  });

  it("creates event with location", () => {
    const store = new InMemoryWorldEntityStore();
    
    const location = store.createEntity(
      worldId,
      "location",
      "Border Fort",
      "A fort."
    );
    
    const event = store.createEntity(
      worldId,
      "event",
      "Orc Invasion",
      "An invasion.",
      undefined,
      undefined,
      undefined,
      location.id
    );
    
    expect(event.locationId).toBe(location.id);
    expect(event.type).toBe("event");
  });

  it("validates locationId can only be set for events", () => {
    const store = new InMemoryWorldEntityStore();
    
    const location = store.createEntity(
      worldId,
      "location",
      "Border Fort",
      "A fort."
    );
    
    expect(() =>
      store.createEntity(
        worldId,
        "location",
        "Another Location",
        "A location.",
        undefined,
        undefined,
        undefined,
        location.id
      )
    ).toThrow("locationId can only be set for events");
  });

  it("validates location exists for event", () => {
    const store = new InMemoryWorldEntityStore();
    
    expect(() =>
      store.createEntity(
        worldId,
        "event",
        "Event",
        "An event.",
        undefined,
        undefined,
        undefined,
        "non-existent-id"
      )
    ).toThrow("Location not found");
  });

  it("gets events for location including parent locations", () => {
    const store = new InMemoryWorldEntityStore();
    
    const kingdom = store.createEntity(
      worldId,
      "location",
      "Kingdom",
      "A kingdom."
    );
    
    const town = store.createEntity(
      worldId,
      "location",
      "Town",
      "A town.",
      undefined,
      undefined,
      kingdom.id
    );
    
    const kingdomEvent = store.createEntity(
      worldId,
      "event",
      "Kingdom Event",
      "An event.",
      undefined,
      undefined,
      undefined,
      kingdom.id
    );
    
    const townEvent = store.createEntity(
      worldId,
      "event",
      "Town Event",
      "An event.",
      undefined,
      undefined,
      undefined,
      town.id
    );
    
    // Get events for town - should include both town event and kingdom event
    const events = store.getEventsForLocation(town.id);
    expect(events).toHaveLength(2);
    expect(events.map(e => e.id)).toContain(kingdomEvent.id);
    expect(events.map(e => e.id)).toContain(townEvent.id);
  });
});
