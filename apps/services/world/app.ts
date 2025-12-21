import express, { Request, Response } from "express";
import cors from "cors";
import { InMemoryWorldStore } from "./worldStore";
import {
  InMemoryWorldEntityStore,
  type WorldEntityType,
  type LocationRelationshipType
} from "./worldEntitiesStore";
import { authenticate } from "../../../packages/auth-middleware";

export interface WorldAppDependencies {
  store?: InMemoryWorldStore;
  entityStore?: InMemoryWorldEntityStore;
}

export function createWorldApp(deps: WorldAppDependencies = {}) {
  const store = deps.store ?? new InMemoryWorldStore();
  const entityStore = deps.entityStore ?? new InMemoryWorldEntityStore();

  const app = express();
  app.use(
    cors({
      origin: "https://localhost:3000"
    })
  );
  app.use(express.json());

  // Response logging middleware
  app.use((req: Request, res: Response, next) => {
    const startTime = process.hrtime.bigint();
    const originalSend = res.send;
    const originalJson = res.json;
    
    const logResponse = () => {
      const service = "world";
      const operation = req.method;
      const responseCode = res.statusCode;
      const requestedUrl = req.originalUrl || req.url;
      const endTime = process.hrtime.bigint();
      const responseTimeMs = Number(endTime - startTime) / 1_000_000; // Convert nanoseconds to milliseconds
      // Service color: yellow for world
      const serviceColor = '\x1b[33m';
      // Response code color: green for 2xx (success), red for others
      const responseColor = responseCode >= 200 && responseCode < 300 ? '\x1b[32m' : '\x1b[31m';
      const resetCode = '\x1b[0m';
      // eslint-disable-next-line no-console
      console.log(`${serviceColor}${service}${resetCode} [${operation}] ${responseColor}${responseCode}${resetCode} [${requestedUrl}] [${responseTimeMs.toFixed(2)}ms]`);
    };
    
    res.send = function (body) {
      logResponse();
      return originalSend.call(this, body);
    };
    
    res.json = function (body) {
      logResponse();
      return originalJson.call(this, body);
    };
    
    next();
  });

  app.get("/worlds", (_req: Request, res: Response) => {
    const worlds = store.listWorlds();
    res.json({ worlds });
  });

  // Update world metadata (e.g. splash image asset)
  app.patch("/worlds/:worldId", authenticate("gm"), (req: Request, res: Response) => {
    const { worldId } = req.params;
    const {
      splashImageAssetId
    } = req.body as {
      splashImageAssetId?: string | null;
    };

    try {
      const world = store.updateWorld(worldId, {
        splashImageAssetId: splashImageAssetId ?? undefined
      });
      res.json({ world });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  app.post("/worlds", authenticate("gm"), (req: Request, res: Response) => {
    const { name, description } = req.body as {
      name?: string;
      description?: string;
    };
    try {
      const world = store.createWorld(name ?? "", description ?? "");
      res.status(201).json({ world });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // World entities (e.g. locations) for a given world
  app.get("/worlds/:worldId/entities", (req: Request, res: Response) => {
    const { worldId } = req.params;
    const { type } = req.query as { type?: WorldEntityType };
    const entities = entityStore.listByWorld(worldId, type);
    res.json({ entities });
  });

  app.post("/worlds/:worldId/entities", authenticate("gm"), (req: Request, res: Response) => {
    const { worldId } = req.params;
    const { type, name, summary, beginningTimestamp, endingTimestamp, locationId } = req.body as {
      type?: WorldEntityType;
      name?: string;
      summary?: string;
      beginningTimestamp?: number;
      endingTimestamp?: number;
      locationId?: string;
    };
    try {
      const entity = entityStore.createEntity(
        worldId,
        type ?? "location",
        name ?? "",
        summary ?? "",
        beginningTimestamp,
        endingTimestamp,
        locationId
      );
      res.status(201).json({ entity });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Add relationship between two locations
  app.post("/worlds/:worldId/locations/:sourceLocationId/relationships", authenticate("gm"), (req: Request, res: Response) => {
    const { worldId, sourceLocationId } = req.params;
    const { targetLocationId, relationshipType } = req.body as {
      targetLocationId?: string;
      relationshipType?: LocationRelationshipType;
    };
    try {
      if (!targetLocationId) {
        res.status(400).json({ error: "targetLocationId is required" });
        return;
      }
      if (!relationshipType) {
        res.status(400).json({ error: "relationshipType is required" });
        return;
      }
      entityStore.addRelationship(sourceLocationId, targetLocationId, relationshipType);
      res.status(201).json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Get relationships for a location
  app.get("/worlds/:worldId/locations/:locationId/relationships", (req: Request, res: Response) => {
    const { locationId } = req.params;
    const { type } = req.query as { type?: LocationRelationshipType };
    try {
      const relationships = entityStore.getRelationships(locationId);
      const filtered = type
        ? relationships.filter((r) => r.relationshipType === type)
        : relationships;
      res.json({ relationships: filtered });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Get events for a location (including events from parent locations)
  app.get("/worlds/:worldId/locations/:locationId/events", (req: Request, res: Response) => {
    const { locationId } = req.params;
    try {
      const events = entityStore.getEventsForLocation(locationId);
      res.json({ events });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return app;
}


