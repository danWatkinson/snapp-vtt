import { Request } from "express";
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
  app.post("/worlds/:worldId/events/:sourceEventId/relationships", authenticate("gm"), createPostVoidRoute(
    (req: Request) => {
      requireFields(req, ["targetEventId", "relationshipType"]);
      const { sourceEventId } = req.params;
      const { targetEventId, relationshipType } = req.body as {
        targetEventId: string;
        relationshipType: LocationRelationshipType;
      };
      entityStore.addRelationship(sourceEventId, targetEventId, relationshipType);
    }
  ));

  // Get sub-events for a composite event
  app.get("/worlds/:worldId/events/:eventId/sub-events", createGetRoute(
    (req: Request) => {
      const { eventId } = req.params;
      return entityStore.getSubEventsForEvent(eventId);
    },
    { responseProperty: "subEvents" }
  ));

  // Add relationship between two factions (for nested factions)
  app.post("/worlds/:worldId/factions/:sourceFactionId/relationships", authenticate("gm"), createPostVoidRoute(
    (req: Request) => {
      requireFields(req, ["targetFactionId", "relationshipType"]);
      const { sourceFactionId } = req.params;
      const { targetFactionId, relationshipType } = req.body as {
        targetFactionId: string;
        relationshipType: LocationRelationshipType;
      };
      entityStore.addRelationship(sourceFactionId, targetFactionId, relationshipType);
    }
  ));

  // Get sub-factions for a nested faction
  app.get("/worlds/:worldId/factions/:factionId/sub-factions", createGetRoute(
    (req: Request) => {
      const { factionId } = req.params;
      return entityStore.getSubFactionsForFaction(factionId);
    },
    { responseProperty: "subFactions" }
  ));

  // Add creature as member of a faction
  app.post("/worlds/:worldId/factions/:factionId/members", authenticate("gm"), createPostVoidRoute(
    (req: Request) => {
      requireFields(req, ["creatureId"]);
      const { factionId } = req.params;
      const { creatureId } = req.body as {
        creatureId: string;
      };
      // Use "has member" relationship type (faction -> creature)
      entityStore.addRelationship(factionId, creatureId, "has member");
    }
  ));

  // Get members (creatures) of a faction
  app.get("/worlds/:worldId/factions/:factionId/members", createGetRoute(
    (req: Request) => {
      const { factionId } = req.params;
      return entityStore.getMembersForFaction(factionId);
    },
    { responseProperty: "members" }
  ));

  // Admin endpoint: Reset all data (for test isolation)
  // Available in development and test environments for e2e test isolation
  // Endpoint is always registered but checks at request time for security
  app.post("/admin/reset", createPostVoidRoute(
    () => {
      // Allow in development (for e2e tests) or test mode
      // In production, this endpoint would not be available (services shouldn't be in production mode for e2e)
      const isDevelopment = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
      const isTest = process.env.NODE_ENV === "test" || process.env.E2E_TEST_MODE === "true";
      if (!isDevelopment && !isTest) {
        throw new Error("Reset endpoint only available in development or test mode");
      }
      store.clear();
      entityStore.clear();
    }
  ));
    }
  });

  return app;
}


