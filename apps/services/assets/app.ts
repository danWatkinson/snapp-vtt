import { Request, Response } from "express";
import { createServiceApp } from "../../../packages/express-app";
import { authenticate } from "../../../packages/auth-middleware";

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

export class InMemoryAssetStore implements AssetStore {
  private assets: DigitalAsset[] = [];

  create(
    asset: Omit<DigitalAsset, "id" | "createdAt" | "updatedAt">
  ): DigitalAsset {
    const now = Date.now();
    const created: DigitalAsset = {
      ...asset,
      id: `asset-${this.assets.length + 1}`,
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
}

export interface AssetAppDependencies {
  store?: AssetStore;
}

const MAX_FILE_SIZE_BYTES =
  Number(process.env.ASSET_MAX_FILE_SIZE_BYTES ?? 10 * 1024 * 1024);

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
      app.post("/assets", authenticate("gm"), (req: Request, res: Response) => {
    const auth = (req as any).auth as { userId: string } | undefined;
    if (!auth?.userId) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    const {
      name,
      originalFileName,
      mimeType,
      sizeBytes,
      tags,
      storageUrl
    } = req.body as {
      name?: string;
      originalFileName?: string;
      mimeType?: string;
      sizeBytes?: number;
      tags?: string[];
      storageUrl?: string;
    };

    if (!originalFileName) {
      return res
        .status(400)
        .json({ error: "originalFileName is required for asset creation" });
    }

    if (!mimeType) {
      return res.status(400).json({ error: "mimeType is required" });
    }

    const mediaType = inferMediaType(mimeType);
    if (!mediaType) {
      return res.status(400).json({
        error:
          "Unsupported file type. Only common image and audio MIME types are allowed."
      });
    }

    if (typeof sizeBytes === "number" && sizeBytes > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        error: `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_BYTES} bytes`
      });
    }

    const asset = store.create({
      ownerUserId: auth.userId,
      name: name ?? originalFileName,
      originalFileName,
      mimeType,
      mediaType,
      sizeBytes: sizeBytes ?? 0,
      tags: tags ?? [],
      storageUrl: storageUrl ?? `/mock-assets/${encodeURIComponent(originalFileName)}`
    });

    return res.status(201).json({ asset });
  });

  // GET /assets – list assets for the current user
  // No role restriction - all authenticated users can view assets
  app.get("/assets", authenticate(), (req: Request, res: Response) => {
    const auth = (req as any).auth as { userId: string } | undefined;
    if (!auth?.userId) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    const { mediaType, search } = req.query as {
      mediaType?: MediaType;
      search?: string;
    };

    const assets = store.listByOwner(auth.userId, {
      mediaType,
      search
    });

    return res.status(200).json({ assets });
  });

  // GET /assets/:assetId – get a single asset
  // No role restriction - all authenticated users can view assets
  app.get("/assets/:assetId", authenticate(), (req: Request, res: Response) => {
    const auth = (req as any).auth as { userId: string } | undefined;
    if (!auth?.userId) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    const { assetId } = req.params;
    const asset = store.getById(assetId);
    if (!asset || asset.ownerUserId !== auth.userId) {
      return res.status(404).json({ error: "Asset not found" });
    }

    return res.status(200).json({ asset });
  });
    }
  });

  return app;
}

