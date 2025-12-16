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
});


