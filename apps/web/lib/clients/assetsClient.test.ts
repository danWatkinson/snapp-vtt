import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAssets, createAsset, type MediaType } from "./assetsClient";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("assetsClient", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("fetchAssets", () => {
    it("builds URL with optional mediaType and search and returns assets", async () => {
      const assets = [
        {
          id: "a1",
          ownerUserId: "admin",
          name: "Forest background",
          originalFileName: "forest-background.png",
          mediaType: "image" as MediaType,
          mimeType: "image/png",
          sizeBytes: 1234,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: [],
          storageUrl: "/mock-assets/forest-background.png"
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ assets })
      });

      const result = await fetchAssets("token", {
        mediaType: "image",
        search: "forest"
      });

      expect(result).toEqual(assets);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/assets?");
      expect(url).toContain("mediaType=image");
      expect(url).toContain("search=forest");
    });

    it("throws with server-provided error message when response not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Forbidden" })
      });

      await expect(fetchAssets("token")).rejects.toThrow("Forbidden");
    });

    it("throws generic error when response not ok and body has no error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(fetchAssets("token")).rejects.toThrow("Request failed");
    });

    it("handles empty options without adding query parameters", async () => {
      const assets: any[] = [];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ assets })
      });

      const result = await fetchAssets("token");

      expect(result).toEqual(assets);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toMatch(/\/assets$/); // no ?query string when no options provided
    });

    it("throws error when response omits assets field", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await expect(fetchAssets("token")).rejects.toThrow("Expected property 'assets' in response");
    });
  });

  describe("createAsset", () => {
    it("posts asset metadata and returns created asset", async () => {
      const created = {
        id: "a2",
        ownerUserId: "admin",
        name: "Ambience",
        originalFileName: "forest-ambience.mp3",
        mediaType: "audio" as MediaType,
        mimeType: "audio/mpeg",
        sizeBytes: 2048,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        storageUrl: "/mock-assets/forest-ambience.mp3"
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ asset: created })
      });

      const result = await createAsset("token", {
        originalFileName: "forest-ambience.mp3",
        mimeType: "audio/mpeg",
        sizeBytes: 2048
      });

      expect(result).toEqual(created);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/assets"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer token"
          }),
          body: JSON.stringify({
            originalFileName: "forest-ambience.mp3",
            mimeType: "audio/mpeg",
            sizeBytes: 2048
          })
        })
      );
    });

    it("throws with server-provided error message when creation fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Validation failed" })
      });

      await expect(
        createAsset("token", {
          originalFileName: "bad.file",
          mimeType: "application/octet-stream"
        })
      ).rejects.toThrow("Validation failed");
    });

    it("throws generic error when creation fails without error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(
        createAsset("token", {
          originalFileName: "bad.file",
          mimeType: "application/octet-stream"
        })
      ).rejects.toThrow("Request failed");
    });
  });
});

