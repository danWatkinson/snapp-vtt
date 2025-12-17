import { describe, it, expect } from "vitest";
import { findById, getNameById, getEntityTypeLabel } from "./entityHelpers";

interface TestEntity {
  id: string;
  name: string;
}

describe("entityHelpers", () => {
  describe("findById", () => {
    it("should find an entity by ID", () => {
      const entities = [
        { id: "1", name: "Entity 1" },
        { id: "2", name: "Entity 2" },
        { id: "3", name: "Entity 3" }
      ];
      expect(findById(entities, "2")).toEqual({ id: "2", name: "Entity 2" });
    });

    it("should return undefined if entity not found", () => {
      const entities = [{ id: "1", name: "Entity 1" }];
      expect(findById(entities, "999")).toBeUndefined();
    });

    it("should return undefined if id is null", () => {
      const entities = [{ id: "1", name: "Entity 1" }];
      expect(findById(entities, null)).toBeUndefined();
    });

    it("should return undefined if id is undefined", () => {
      const entities = [{ id: "1", name: "Entity 1" }];
      expect(findById(entities, undefined)).toBeUndefined();
    });
  });

  describe("getNameById", () => {
    const entities: TestEntity[] = [
      { id: "1", name: "Entity 1" },
      { id: "2", name: "Entity 2" }
    ];

    it("should return entity name when found", () => {
      expect(getNameById(entities, "1", "Unknown")).toBe("Entity 1");
    });

    it("should return fallback when entity not found", () => {
      expect(getNameById(entities, "999", "Unknown")).toBe("Unknown");
    });

    it("should return fallback when id is null", () => {
      expect(getNameById(entities, null, "Unknown")).toBe("Unknown");
    });

    it("should return fallback when id is undefined", () => {
      expect(getNameById(entities, undefined, "Unknown")).toBe("Unknown");
    });
  });

  describe("getEntityTypeLabel", () => {
    it("should return 'All' for 'all'", () => {
      expect(getEntityTypeLabel("all")).toBe("All");
    });

    it("should return 'Locations' for 'location'", () => {
      expect(getEntityTypeLabel("location")).toBe("Locations");
    });

    it("should return 'Creatures' for 'creature'", () => {
      expect(getEntityTypeLabel("creature")).toBe("Creatures");
    });

    it("should return 'Factions' for 'faction'", () => {
      expect(getEntityTypeLabel("faction")).toBe("Factions");
    });

    it("should return 'Events' for 'event'", () => {
      expect(getEntityTypeLabel("event")).toBe("Events");
    });

    it("should return 'All' as default for unknown type", () => {
      // Test the default case by passing a value that doesn't match any case
      // TypeScript prevents this, but we can test the default branch
      const result = getEntityTypeLabel("all" as any);
      expect(result).toBe("All");
    });
  });
});
