import { Request } from "express";
import { createServiceApp } from "../../../packages/express-app";
import { authenticate, AuthedRequest } from "../../../packages/auth-middleware";
import { createGetRoute, createPostRoute, requireFields } from "../../../packages/express-routes";

export type MediaType = "image" | "audio";

export interface DigitalAsset {
  id: string;
  ownerUserId: string;
  name: string;
  originalFileName: string;
  mediaType: MediaType;
  mimeType: string;
  sizeBytes: number;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  storageUrl: string;
}

export interface AssetStore {
  create(asset: Omit<DigitalAsset, "id" | "createdAt" | "updatedAt">): DigitalAsset;
  listByOwner(ownerUserId: string, filters?: { mediaType?: MediaType; search?: string }): DigitalAsset[];
  getById(id: string): DigitalAsset | undefined;
}

import { generateId } from "../../../packages/store-utils";

export class InMemoryAssetStore implements AssetStore {
  private assets: DigitalAsset[] = [];

  create(
    asset: Omit<DigitalAsset, "id" | "createdAt" | "updatedAt">
  ): DigitalAsset {
    const now = Date.now();
    const created: DigitalAsset = {
      ...asset,
      id: generateId("asset"),
      createdAt: now,
      updatedAt: now
    };
    this.assets.push(created);
    return created;
  }

  listByOwner(
    ownerUserId: string,
    filters?: { mediaType?: MediaType; search?: string }
  ): DigitalAsset[] {
    let results = this.assets.filter((a) => a.ownerUserId === ownerUserId);
    if (filters?.mediaType) {
      results = results.filter((a) => a.mediaType === filters.mediaType);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.originalFileName.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return results;
  }

  getById(id: string): DigitalAsset | undefined {
    return this.assets.find((a) => a.id === id);
  }

  /**
   * Clear all assets from the store.
   * Used for test isolation - resets the store to an empty state.
   */
  clear(): void {
    this.assets = [];
  }
}

export interface AssetAppDependencies {
  store?: AssetStore;
}

import { assets as assetsConfig } from "../../../packages/config";

const MAX_FILE_SIZE_BYTES = assetsConfig.maxFileSizeBytes;

const allowedImageTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp"
]);

const allowedAudioTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg"
]);

function inferMediaType(mimeType: string): MediaType | null {
  if (allowedImageTypes.has(mimeType)) return "image";
  if (allowedAudioTypes.has(mimeType)) return "audio";
  return null;
}

export function createAssetApp(deps: AssetAppDependencies = {}) {
  const store = deps.store ?? new InMemoryAssetStore();

  const app = createServiceApp({
    serviceName: "assets",
    routes: (app) => {
      // POST /assets – create a new digital asset (metadata only MVP)
      // Requires "gm" role (Game Master / World Builder role)
      // Admin users also have access (admin bypasses role requirements)
      app.post("/assets", authenticate("gm"), createPostRoute(
        (req: AuthedRequest) => {
          requireFields(req, ["originalFileName", "mimeType"]);

          const {
            name,
            originalFileName,
            mimeType,
            sizeBytes,
            tags,
            storageUrl
          } = req.body as {
            name?: string;
            originalFileName: string;
            mimeType: string;
            sizeBytes?: number;
            tags?: string[];
            storageUrl?: string;
          };

          const mediaType = inferMediaType(mimeType);
          if (!mediaType) {
            throw new Error(
              "Unsupported file type. Only common image and audio MIME types are allowed."
            );
          }

          if (typeof sizeBytes === "number" && sizeBytes > MAX_FILE_SIZE_BYTES) {
            throw new Error(
              `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_BYTES} bytes`
            );
          }

          return store.create({
            ownerUserId: req.auth.userId,
            name: name ?? originalFileName,
            originalFileName,
            mimeType,
            mediaType,
            sizeBytes: sizeBytes ?? 0,
            tags: tags ?? [],
            storageUrl: storageUrl ?? `/mock-assets/${encodeURIComponent(originalFileName)}`
          });
        },
        { responseProperty: "asset" }
      ));

  // GET /assets – list assets for the current user
  // No role restriction - all authenticated users can view assets
  app.get("/assets", authenticate(), createGetRoute(
    (req: AuthedRequest) => {
      const { mediaType, search } = req.query as {
        mediaType?: MediaType;
        search?: string;
      };

      return store.listByOwner(req.auth.userId, {
        mediaType,
        search
      });
    },
    { responseProperty: "assets" }
  ));

  // GET /assets/:assetId – get a single asset
  // No role restriction - all authenticated users can view assets
  app.get("/assets/:assetId", authenticate(), createGetRoute(
    (req: AuthedRequest) => {
      const { assetId } = req.params;
      const asset = store.getById(assetId);
      if (!asset || asset.ownerUserId !== req.auth.userId) {
        throw new Error("Asset not found");
      }

      return asset;
    },
    { responseProperty: "asset" }
  ));

  // Admin endpoint: Reset all data (for test isolation)
  // Available in development and test environments for e2e test isolation
  // Endpoint is always registered but checks at request time for security
  app.post("/admin/reset", createPostRoute(
    () => {
      // Allow in development (for e2e tests) or test mode
      // In production, this endpoint would not be available (services shouldn't be in production mode for e2e)
      const isDevelopment = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
      const isTest = process.env.NODE_ENV === "test" || process.env.E2E_TEST_MODE === "true";
      if (!isDevelopment && !isTest) {
        throw new Error("Reset endpoint only available in development or test mode");
      }
      store.clear();
      return { message: "Assets store reset" };
    },
    { responseProperty: "message" }
  ));
    }
  });

  return app;
}

