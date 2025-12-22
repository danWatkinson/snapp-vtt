import { Request, Response } from "express";
import { createServiceApp } from "../../../packages/express-app";
import { InMemoryWorldStore } from "./worldStore";
import {
  InMemoryWorldEntityStore,
  type WorldEntityType,
  type LocationRelationshipType
} from "./worldEntitiesStore";
import { authenticate } from "../../../packages/auth-middleware";
import { createGetRoute, createPostRoute, createPatchRoute, createPostVoidRoute, requireFields } from "../../../packages/express-routes";

export interface WorldAppDependencies {
  store?: InMemoryWorldStore;
  entityStore?: InMemoryWorldEntityStore;
}

export function createWorldApp(deps: WorldAppDependencies = {}) {
  const store = deps.store ?? new InMemoryWorldStore();
  const entityStore = deps.entityStore ?? new InMemoryWorldEntityStore();

  const app = createServiceApp({
    serviceName: "world",
    routes: (app) => {
      app.get("/worlds", createGetRoute(
    () => store.listWorlds(),
    { responseProperty: "worlds" }
  ));

  // Update world metadata (e.g. splash image asset)
  app.patch("/worlds/:worldId", authenticate("gm"), createPatchRoute(
    (req: Request) => {
      const { worldId } = req.params;
      const { splashImageAssetId } = req.body as { splashImageAssetId?: string | null };
      return store.updateWorld(worldId, {
        splashImageAssetId: splashImageAssetId ?? undefined
      });
    },
    { responseProperty: "world" }
  ));

  app.post("/worlds", authenticate("gm"), createPostRoute(
    (req: Request) => {
      const { name, description } = req.body as { name?: string; description?: string };
      return store.createWorld(name ?? "", description ?? "");
    },
    { responseProperty: "world" }
  ));

  // World entities (e.g. locations) for a given world
  app.get("/worlds/:worldId/entities", createGetRoute(
    (req: Request) => {
      const { worldId } = req.params;
      const { type } = req.query as { type?: WorldEntityType };
      return entityStore.listByWorld(worldId, type);
    },
    { responseProperty: "entities" }
  ));

  app.post("/worlds/:worldId/entities", authenticate("gm"), createPostRoute(
    (req: Request) => {
      const { worldId } = req.params;
      const { type, name, summary, beginningTimestamp, endingTimestamp, locationId } = req.body as {
        type?: WorldEntityType;
        name?: string;
        summary?: string;
        beginningTimestamp?: number;
        endingTimestamp?: number;
        locationId?: string;
      };
      return entityStore.createEntity(
        worldId,
        type ?? "location",
        name ?? "",
        summary ?? "",
        beginningTimestamp,
        endingTimestamp,
        locationId
      );
    },
    { responseProperty: "entity" }
  ));

  // Add relationship between two locations
  app.post("/worlds/:worldId/locations/:sourceLocationId/relationships", authenticate("gm"), createPostVoidRoute(
    (req: Request) => {
      requireFields(req, ["targetLocationId", "relationshipType"]);
      const { sourceLocationId } = req.params;
      const { targetLocationId, relationshipType } = req.body as {
        targetLocationId: string;
        relationshipType: LocationRelationshipType;
      };
      entityStore.addRelationship(sourceLocationId, targetLocationId, relationshipType);
    }
  ));

  // Get relationships for a location
  app.get("/worlds/:worldId/locations/:locationId/relationships", createGetRoute(
    (req: Request) => {
      const { locationId } = req.params;
      const { type } = req.query as { type?: LocationRelationshipType };
      const relationships = entityStore.getRelationships(locationId);
      return type
        ? relationships.filter((r) => r.relationshipType === type)
        : relationships;
    },
    { responseProperty: "relationships" }
  ));

  // Get events for a location (including events from parent locations)
  app.get("/worlds/:worldId/locations/:locationId/events", createGetRoute(
    (req: Request) => {
      const { locationId } = req.params;
      return entityStore.getEventsForLocation(locationId);
    },
    { responseProperty: "events" }
  ));

  // Add relationship between two events (for composite events)
  app.post("/worlds/:worldId/events/:sourceEventId/relationships", authenticate("gm"), (req: Request, res: Response) => {
    const { worldId, sourceEventId } = req.params;
    const { targetEventId, relationshipType } = req.body as {
      targetEventId?: string;
      relationshipType?: LocationRelationshipType;
    };
    try {
      if (!targetEventId) {
        res.status(400).json({ error: "targetEventId is required" });
        return;
      }
      if (!relationshipType) {
        res.status(400).json({ error: "relationshipType is required" });
        return;
      }
      entityStore.addRelationship(sourceEventId, targetEventId, relationshipType);
      res.status(201).json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Get sub-events for a composite event
  app.get("/worlds/:worldId/events/:eventId/sub-events", (req: Request, res: Response) => {
    const { eventId } = req.params;
    try {
      const subEvents = entityStore.getSubEventsForEvent(eventId);
      res.json({ subEvents });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Add relationship between two factions (for nested factions)
  app.post("/worlds/:worldId/factions/:sourceFactionId/relationships", authenticate("gm"), (req: Request, res: Response) => {
    const { worldId, sourceFactionId } = req.params;
    const { targetFactionId, relationshipType } = req.body as {
      targetFactionId?: string;
      relationshipType?: LocationRelationshipType;
    };
    try {
      if (!targetFactionId) {
        res.status(400).json({ error: "targetFactionId is required" });
        return;
      }
      if (!relationshipType) {
        res.status(400).json({ error: "relationshipType is required" });
        return;
      }
      entityStore.addRelationship(sourceFactionId, targetFactionId, relationshipType);
      res.status(201).json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Get sub-factions for a nested faction
  app.get("/worlds/:worldId/factions/:factionId/sub-factions", (req: Request, res: Response) => {
    const { factionId } = req.params;
    try {
      const subFactions = entityStore.getSubFactionsForFaction(factionId);
      res.json({ subFactions });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Add creature as member of a faction
  app.post("/worlds/:worldId/factions/:factionId/members", authenticate("gm"), (req: Request, res: Response) => {
    const { worldId, factionId } = req.params;
    const { creatureId } = req.body as {
      creatureId?: string;
    };
    try {
      if (!creatureId) {
        res.status(400).json({ error: "creatureId is required" });
        return;
      }
      // Use "has member" relationship type (faction -> creature)
      entityStore.addRelationship(factionId, creatureId, "has member");
      res.status(201).json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Get members (creatures) of a faction
  app.get("/worlds/:worldId/factions/:factionId/members", (req: Request, res: Response) => {
    const { factionId } = req.params;
    try {
      const members = entityStore.getMembersForFaction(factionId);
      res.json({ members });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });
    }
  });

  return app;
}


