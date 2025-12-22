import { Request, Response } from "express";
import { createServiceApp } from "../../../packages/express-app";
import {
  InMemoryCampaignStore,
  type Campaign,
  type Session,
  type Scene,
  type StoryArc
} from "./campaignStore";
import { authenticate } from "../../../packages/auth-middleware";

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
      app.get("/worlds/:worldId/campaigns", (req: Request, res: Response) => {
    const { worldId } = req.params;
    const campaigns = store.listCampaignsByWorld(worldId);
    res.json({ campaigns });
  });

  app.post("/campaigns", authenticate("gm"), (req: Request, res: Response) => {
    const { name, summary, worldId } = req.body as {
      name?: string;
      summary?: string;
      worldId?: string;
    };
    if (!worldId || !worldId.trim()) {
      res.status(400).json({ error: "worldId is required" });
      return;
    }
    try {
      const campaign = store.createCampaign(name ?? "", summary ?? "", worldId);
      res.status(201).json({ campaign });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Sessions within a campaign
  app.get("/campaigns/:campaignId/sessions", (req: Request, res: Response) => {
    const { campaignId } = req.params;
    const sessions = store.listSessions(campaignId);
    res.json({ sessions });
  });

  app.post(
    "/campaigns/:campaignId/sessions",
    authenticate("gm"),
    (req: Request, res: Response) => {
      const { campaignId } = req.params;
      const { name } = req.body as { name?: string };
      try {
        const session = store.createSession(campaignId, name ?? "");
        res.status(201).json({ session });
      } catch (err) {
        res.status(400).json({ error: (err as Error).message });
      }
    }
  );

  // Scenes within a session
  app.get("/sessions/:sessionId/scenes", (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const scenes = store.listScenes(sessionId);
    res.json({ scenes });
  });

  app.post("/sessions/:sessionId/scenes", (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { name, summary, worldId, entityIds } = req.body as {
      name?: string;
      summary?: string;
      worldId?: string;
      entityIds?: string[];
    };
    try {
      const scene = store.createScene(
        sessionId,
        name ?? "",
        summary ?? "",
        worldId ?? "",
        entityIds ?? []
      );
      res.status(201).json({ scene });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Players within a campaign
  app.get("/campaigns/:campaignId/players", (req: Request, res: Response) => {
    const { campaignId } = req.params;
    try {
      const playerIds = store.listPlayers(campaignId);
      res.json({ players: playerIds });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  app.post("/campaigns/:campaignId/players", authenticate("gm"), (req: Request, res: Response) => {
    const { campaignId } = req.params;
    const { playerId } = req.body as { playerId?: string };
    try {
      store.addPlayer(campaignId, playerId ?? "");
      res.status(201).json({ playerId: playerId ?? "" });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Story arcs within a campaign
  app.get("/campaigns/:campaignId/story-arcs", (req: Request, res: Response) => {
    const { campaignId } = req.params;
    const storyArcs = store.listStoryArcs(campaignId);
    res.json({ storyArcs });
  });

  app.post("/campaigns/:campaignId/story-arcs",
    authenticate("gm"), (req: Request, res: Response) => {
    const { campaignId } = req.params;
    const { name, summary } = req.body as {
      name?: string;
      summary?: string;
    };
    try {
      const storyArc = store.createStoryArc(
        campaignId,
        name ?? "",
        summary ?? ""
      );
      res.status(201).json({ storyArc });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Events within a story arc
  app.get("/story-arcs/:storyArcId/events", (req: Request, res: Response) => {
    const { storyArcId } = req.params;
    try {
      const eventIds = store.listStoryArcEvents(storyArcId);
      res.json({ events: eventIds });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  app.post("/story-arcs/:storyArcId/events",
    authenticate("gm"), (req: Request, res: Response) => {
    const { storyArcId } = req.params;
    const { eventId } = req.body as { eventId?: string };
    try {
      store.addEventToStoryArc(storyArcId, eventId ?? "");
      res.status(201).json({ eventId: eventId ?? "" });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Timeline
  app.get("/campaigns/:campaignId/timeline", (req: Request, res: Response) => {
    const { campaignId } = req.params;
    try {
      const timeline = store.getTimeline(campaignId);
      res.json(timeline);
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  app.post("/campaigns/:campaignId/timeline/advance",
    authenticate("gm"), (req: Request, res: Response) => {
    const { campaignId } = req.params;
    const { amount, unit } = req.body as {
      amount?: number;
      unit?: "second" | "minute" | "hour" | "day" | "week" | "month" | "year";
    };
    try {
      store.advanceTimeline(
        campaignId,
        amount ?? 1,
        unit ?? "day"
      );
      const timeline = store.getTimeline(campaignId);
      res.json(timeline);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });
    }
  });

  return app;
}


