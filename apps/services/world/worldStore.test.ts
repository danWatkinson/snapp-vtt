import { describe, it, expect } from "vitest";
import { InMemoryWorldStore } from "./worldStore";

describe("InMemoryWorldStore", () => {
  it("starts with no worlds and can create a world", () => {
    const store = new InMemoryWorldStore();
    expect(store.listWorlds()).toEqual([]);

    const world = store.createWorld("Eldoria", "A high-fantasy realm.");
    expect(world.name).toBe("Eldoria");
    expect(store.listWorlds()).toHaveLength(1);
  });

  it("requires a non-empty name", () => {
    const store = new InMemoryWorldStore();
    expect(() => store.createWorld("", "desc")).toThrow(
      "World name is required"
    );
  });

  it("prevents duplicate world names (case-insensitive)", () => {
    const store = new InMemoryWorldStore();
    store.createWorld("Eldoria", "First");
    expect(() => store.createWorld("eldoria", "Second")).toThrow(
      "World 'eldoria' already exists"
    );
  });
});


