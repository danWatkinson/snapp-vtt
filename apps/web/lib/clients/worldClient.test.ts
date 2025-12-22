import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchWorlds,
  createWorld,
  fetchWorldEntities,
  createWorldEntity,
  fetchWorldLocations,
  createWorldLocation
} from "./worldClient";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("worldClient", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchWorlds", () => {
    it("should fetch and return worlds", async () => {
      const mockWorlds = [
        { id: "1", name: "World 1", description: "Desc 1" },
        { id: "2", name: "World 2", description: "Desc 2" }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ worlds: mockWorlds })
      });

      const result = await fetchWorlds();

      expect(result).toEqual(mockWorlds);
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(fetchWorlds()).rejects.toThrow("Request failed");
    });

    it("should handle JSON parse failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        }
      });

      await expect(fetchWorlds()).rejects.toThrow();
    });
  });

  describe("createWorld", () => {
    it("should create world with token", async () => {
      const mockWorld = { id: "1", name: "New World", description: "Desc" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ world: mockWorld })
      });

      const result = await createWorld("New World", "Desc", "token");

      expect(result).toEqual(mockWorld);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/worlds"),
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer token"
          }
        })
      );
    });

    it("should create world without token", async () => {
      const mockWorld = { id: "1", name: "New World", description: "Desc" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ world: mockWorld })
      });

      const result = await createWorld("New World", "Desc");

      expect(result).toEqual(mockWorld);
      const call = mockFetch.mock.calls[0][1];
      expect(call.headers).not.toHaveProperty("Authorization");
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "World name already exists" })
      });

      await expect(createWorld("Existing", "Desc")).rejects.toThrow("World name already exists");
    });

    it("should throw generic error when response has no error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(createWorld("New", "Desc")).rejects.toThrow("Request failed");
    });
  });

  describe("fetchWorldEntities", () => {
    it("should fetch entities without type filter", async () => {
      const mockEntities = [
        { id: "1", worldId: "w1", type: "location", name: "Loc 1", summary: "Sum" }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entities: mockEntities })
      });

      const result = await fetchWorldEntities("w1");

      expect(result).toEqual(mockEntities);
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("/worlds/w1/entities");
      expect(callUrl).not.toContain("type=");
    });

    it("should fetch entities with type filter", async () => {
      const mockEntities = [
        { id: "1", worldId: "w1", type: "location", name: "Loc 1", summary: "Sum" }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entities: mockEntities })
      });

      const result = await fetchWorldEntities("w1", "location");

      expect(result).toEqual(mockEntities);
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("/worlds/w1/entities");
      expect(callUrl).toContain("type=location");
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(fetchWorldEntities("w1")).rejects.toThrow("Request failed");
    });
  });

  describe("createWorldEntity", () => {
    it("should create entity with timestamps for events", async () => {
      const mockEntity = {
        id: "1",
        worldId: "w1",
        type: "event",
        name: "Event 1",
        summary: "Sum",
        beginningTimestamp: 1000,
        endingTimestamp: 2000
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entity: mockEntity })
      });

      const result = await createWorldEntity(
        "w1",
        "event",
        "Event 1",
        "Sum",
        1000,
        2000,
        "token"
      );

      expect(result).toEqual(mockEntity);
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.beginningTimestamp).toBe(1000);
      expect(callBody.endingTimestamp).toBe(2000);
    });

    it("should create event entity with only beginningTimestamp", async () => {
      const mockEntity = {
        id: "1",
        worldId: "w1",
        type: "event",
        name: "Event 1",
        summary: "Sum",
        beginningTimestamp: 1000
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entity: mockEntity })
      });

      const result = await createWorldEntity("w1", "event", "Event 1", "Sum", 1000, undefined, "token");

      expect(result).toEqual(mockEntity);
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.beginningTimestamp).toBe(1000);
      expect(callBody).not.toHaveProperty("endingTimestamp");
    });

    it("should create entity without timestamps for non-events", async () => {
      const mockEntity = {
        id: "1",
        worldId: "w1",
        type: "location",
        name: "Loc 1",
        summary: "Sum"
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entity: mockEntity })
      });

      const result = await createWorldEntity("w1", "location", "Loc 1", "Sum");

      expect(result).toEqual(mockEntity);
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody).not.toHaveProperty("beginningTimestamp");
      expect(callBody).not.toHaveProperty("endingTimestamp");
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Invalid entity type" })
      });

      await expect(createWorldEntity("w1", "location", "Loc", "Sum")).rejects.toThrow("Invalid entity type");
    });

    it("should throw generic error when response has no error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(createWorldEntity("w1", "location", "Loc", "Sum")).rejects.toThrow("Request failed");
    });
  });

  describe("fetchWorldLocations", () => {
    it("should fetch locations", async () => {
      const mockLocations = [
        { id: "1", worldId: "w1", type: "location", name: "Loc 1", summary: "Sum" }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entities: mockLocations })
      });

      const result = await fetchWorldLocations("w1");

      expect(result).toEqual(mockLocations);
    });
  });

  describe("createWorldLocation", () => {
    it("should create location", async () => {
      const mockLocation = {
        id: "1",
        worldId: "w1",
        type: "location",
        name: "Loc 1",
        summary: "Sum"
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entity: mockLocation })
      });

      const result = await createWorldLocation("w1", "Loc 1", "Sum");

      expect(result).toEqual(mockLocation);
    });
  });
});
