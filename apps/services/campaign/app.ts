import { Request } from "express";
import { createServiceApp } from "../../../packages/express-app";
import {
  InMemoryCampaignStore,
  type Campaign,
  type Session,
  type Scene,
  type StoryArc
} from "./campaignStore";
import { authenticate } from "../../../packages/auth-middleware";
import { createGetRoute, createPostRoute, createPostVoidRoute, requireFields } from "../../../packages/express-routes";

export interface CampaignAppDependencies {
  store?: InMemoryCampaignStore;
}

export function createCampaignApp(
  deps: CampaignAppDependencies = {}
) {
  const store = deps.store ?? new InMemoryCampaignStore();

  const app = createServiceApp({
    serviceName: "campaign",
    routes: (app) => {
      // Campaigns by world
      app.get("/worlds/:worldId/campaigns", createGetRoute(
    (req: Request) => {
      const { worldId } = req.params;
      return store.listCampaignsByWorld(worldId);
    },
    { responseProperty: "campaigns" }
  ));

  app.post("/campaigns", authenticate("gm"), createPostRoute(
    (req: Request) => {
      const { name, summary, worldId } = req.body as {
        name?: string;
        summary?: string;
        worldId?: string;
      };
      requireFields(req, ["worldId"]);
      return store.createCampaign(name ?? "", summary ?? "", worldId!);
    },
    { responseProperty: "campaign" }
  ));

  // Sessions within a campaign
  app.get("/campaigns/:campaignId/sessions", createGetRoute(
    (req: Request) => {
      const { campaignId } = req.params;
      return store.listSessions(campaignId);
    },
    { responseProperty: "sessions" }
  ));

  app.post(
    "/campaigns/:campaignId/sessions",
    authenticate("gm"),
    createPostRoute(
      (req: Request) => {
        const { campaignId } = req.params;
        const { name } = req.body as { name?: string };
        return store.createSession(campaignId, name ?? "");
      },
      { responseProperty: "session" }
    )
  );

  // Scenes within a session
  app.get("/sessions/:sessionId/scenes", createGetRoute(
    (req: Request) => {
      const { sessionId } = req.params;
      return store.listScenes(sessionId);
    },
    { responseProperty: "scenes" }
  ));

  app.post("/sessions/:sessionId/scenes", createPostRoute(
    (req: Request) => {
      const { sessionId } = req.params;
      const { name, summary, worldId, entityIds } = req.body as {
        name?: string;
        summary?: string;
        worldId?: string;
        entityIds?: string[];
      };
      return store.createScene(
        sessionId,
        name ?? "",
        summary ?? "",
        worldId ?? "",
        entityIds ?? []
      );
    },
    { responseProperty: "scene" }
  ));

  // Players within a campaign
  app.get("/campaigns/:campaignId/players", createGetRoute(
    (req: Request) => {
      const { campaignId } = req.params;
      return store.listPlayers(campaignId);
    },
    { responseProperty: "players" }
  ));

  app.post("/campaigns/:campaignId/players", authenticate("gm"), createPostRoute(
    (req: Request) => {
      const { campaignId } = req.params;
      const { playerId } = req.body as { playerId?: string };
      store.addPlayer(campaignId, playerId ?? "");
      return { playerId: playerId ?? "" };
    },
    { responseProperty: "playerId", statusCode: 201 }
  ));

  // Story arcs within a campaign
  app.get("/campaigns/:campaignId/story-arcs", createGetRoute(
    (req: Request) => {
      const { campaignId } = req.params;
      return store.listStoryArcs(campaignId);
    },
    { responseProperty: "storyArcs" }
  ));

  app.post("/campaigns/:campaignId/story-arcs",
    authenticate("gm"),
    createPostRoute(
      (req: Request) => {
        const { campaignId } = req.params;
        const { name, summary } = req.body as {
          name?: string;
          summary?: string;
        };
        return store.createStoryArc(
          campaignId,
          name ?? "",
          summary ?? ""
        );
      },
      { responseProperty: "storyArc" }
    )
  );

  // Events within a story arc
  app.get("/story-arcs/:storyArcId/events", createGetRoute(
    (req: Request) => {
      const { storyArcId } = req.params;
      return store.listStoryArcEvents(storyArcId);
    },
    { responseProperty: "events" }
  ));

  app.post("/story-arcs/:storyArcId/events",
    authenticate("gm"),
    createPostRoute(
      (req: Request) => {
        const { storyArcId } = req.params;
        const { eventId } = req.body as { eventId?: string };
        store.addEventToStoryArc(storyArcId, eventId ?? "");
        return { eventId: eventId ?? "" };
      },
      { responseProperty: "eventId", statusCode: 201 }
    )
  );

  // Timeline
  app.get("/campaigns/:campaignId/timeline", createGetRoute(
    (req: Request) => {
      const { campaignId } = req.params;
      return store.getTimeline(campaignId);
    }
  ));

  app.post("/campaigns/:campaignId/timeline/advance",
    authenticate("gm"),
    createPostRoute(
      (req: Request) => {
        const { campaignId } = req.params;
        const { amount, unit } = req.body as {
          amount?: number;
          unit?: "second" | "minute" | "hour" | "day" | "week" | "month" | "year";
        };
        store.advanceTimeline(
          campaignId,
          amount ?? 1,
          unit ?? "day"
        );
        return store.getTimeline(campaignId);
      },
      { statusCode: 200, responseProperty: undefined }
    )
  );

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
      return { message: "Campaign store reset" };
    },
    { responseProperty: "message" }
  ));
    }
  });

  return app;
}


