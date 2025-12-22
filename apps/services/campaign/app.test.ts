import request from "supertest";
import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { createCampaignApp } from "./app";
import { InMemoryCampaignStore } from "./campaignStore";

function createSeededCampaignApp() {
  const store = new InMemoryCampaignStore();
  const app = createCampaignApp({ store });
  return { app, store };
}

function createTestToken(roles: string[] = ["gm"]): string {
  const jwtSecret = process.env.AUTH_JWT_SECRET ?? process.env.JWT_SECRET ?? "dev-secret";
  return jwt.sign({ sub: "test-user", roles }, jwtSecret, { expiresIn: "1h" });
}

describe("campaign REST API", () => {
  const TEST_WORLD_ID = "world-1";

  it("lists no campaigns initially and allows creating a campaign", async () => {
    const { app } = createSeededCampaignApp();

    // Check that no campaigns exist for the test world
    const listResponse = await request(app).get(`/worlds/${TEST_WORLD_ID}/campaigns`).expect(200);
    expect(listResponse.body.campaigns).toEqual([]);

    const createResponse = await request(app)
      .post("/campaigns")
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({ name: "Rise of the Dragon King", summary: "A long campaign.", worldId: TEST_WORLD_ID })
      .expect(201);

    expect(createResponse.body.campaign.name).toBe("Rise of the Dragon King");
    expect(createResponse.body.campaign.worldId).toBe(TEST_WORLD_ID);

    // List campaigns for the world after creation
    const listAfter = await request(app).get(`/worlds/${TEST_WORLD_ID}/campaigns`).expect(200);
    expect(listAfter.body.campaigns).toHaveLength(1);
  });

  it("returns 400 when creating campaign without worldId", async () => {
    const { app } = createSeededCampaignApp();

    const response = await request(app)
      .post("/campaigns")
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({ name: "Campaign", summary: "Summary" })
      .expect(400);

    expect(response.body.error).toBe("worldId is required");
  });

  it("lists campaigns by world", async () => {
    const { app, store } = createSeededCampaignApp();

    const campaign1 = store.createCampaign("Camp 1", "Summary", "world-1");
    const campaign2 = store.createCampaign("Camp 2", "Summary", "world-1");
    const campaign3 = store.createCampaign("Camp 3", "Summary", "world-2");

    const world1Response = await request(app)
      .get("/worlds/world-1/campaigns")
      .expect(200);
    expect(world1Response.body.campaigns).toHaveLength(2);
    expect(world1Response.body.campaigns.map((c: any) => c.id)).toContain(campaign1.id);
    expect(world1Response.body.campaigns.map((c: any) => c.id)).toContain(campaign2.id);

    const world2Response = await request(app)
      .get("/worlds/world-2/campaigns")
      .expect(200);
    expect(world2Response.body.campaigns).toHaveLength(1);
    expect(world2Response.body.campaigns[0].id).toBe(campaign3.id);
  });

  it("creates sessions and scenes under a campaign", async () => {
    const { app, store } = createSeededCampaignApp();

    const campaign = store.createCampaign("Camp", "Summary", TEST_WORLD_ID);

    const sessionResponse = await request(app)
      .post(`/campaigns/${campaign.id}/sessions`)
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({ name: "Session 1" })
      .expect(201);

    const sessionId = sessionResponse.body.session.id as string;

    await request(app)
      .post(`/sessions/${sessionId}/scenes`)
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({
        name: "Scene 1",
        summary: "Intro",
        worldId: "world-1",
        entityIds: ["ent-1"]
      })
      .expect(201);

    const scenesResponse = await request(app)
      .get(`/sessions/${sessionId}/scenes`)
      .expect(200);
    expect(scenesResponse.body.scenes).toHaveLength(1);
  });

  it("manages players in campaigns", async () => {
    const { app, store } = createSeededCampaignApp();

    const campaign = store.createCampaign("Camp", "Summary", TEST_WORLD_ID);

    const listResponse = await request(app)
      .get(`/campaigns/${campaign.id}/players`)
      .expect(200);
    expect(listResponse.body.players).toEqual([]);

    await request(app)
      .post(`/campaigns/${campaign.id}/players`)
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({ playerId: "alice" })
      .expect(201);

    const listAfter = await request(app)
      .get(`/campaigns/${campaign.id}/players`)
      .expect(200);
    expect(listAfter.body.players).toEqual(["alice"]);

    await request(app)
      .post(`/campaigns/${campaign.id}/players`)
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({ playerId: "bob" })
      .expect(201);

    const listAfterTwo = await request(app)
      .get(`/campaigns/${campaign.id}/players`)
      .expect(200);
    expect(listAfterTwo.body.players).toEqual(["alice", "bob"]);
  });

  it("returns 400 when adding duplicate player", async () => {
    const { app, store } = createSeededCampaignApp();

    const campaign = store.createCampaign("Camp", "Summary", TEST_WORLD_ID);
    store.addPlayer(campaign.id, "alice");

    const response = await request(app)
      .post(`/campaigns/${campaign.id}/players`)
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({ playerId: "alice" })
      .expect(400);

    expect(response.body.error).toContain("already in campaign");
  });

  it("returns 404 when listing players for non-existent campaign", async () => {
    const { app } = createSeededCampaignApp();

    await request(app)
      .get("/campaigns/non-existent/players")
      .expect(404);
  });

  it("manages story arcs in campaigns", async () => {
    const { app, store } = createSeededCampaignApp();

    const campaign = store.createCampaign("Camp", "Summary", TEST_WORLD_ID);

    const listResponse = await request(app)
      .get(`/campaigns/${campaign.id}/story-arcs`)
      .expect(200);
    expect(listResponse.body.storyArcs).toEqual([]);

    const createResponse = await request(app)
      .post(`/campaigns/${campaign.id}/story-arcs`)
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({ name: "The Ancient Prophecy", summary: "An ancient prophecy." })
      .expect(201);

    expect(createResponse.body.storyArc.name).toBe("The Ancient Prophecy");

    const listAfter = await request(app)
      .get(`/campaigns/${campaign.id}/story-arcs`)
      .expect(200);
    expect(listAfter.body.storyArcs).toHaveLength(1);
    expect(listAfter.body.storyArcs[0].name).toBe("The Ancient Prophecy");
  });

  it("returns 400 when creating story arc with missing name", async () => {
    const { app, store } = createSeededCampaignApp();

    const campaign = store.createCampaign("Camp", "Summary", TEST_WORLD_ID);

    const response = await request(app)
      .post(`/campaigns/${campaign.id}/story-arcs`)
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({ summary: "Summary only" })
      .expect(400);

    expect(response.body.error).toContain("Story arc name is required");
  });

  it("returns 400 when creating story arc with invalid campaignId", async () => {
    const { app } = createSeededCampaignApp();

    const response = await request(app)
      .post("/campaigns/non-existent/story-arcs")
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({ name: "Arc", summary: "Summary" })
      .expect(404);

    expect(response.body.error).toContain("Campaign non-existent not found");
  });

  it("returns 400 when creating duplicate story arc in same campaign", async () => {
    const { app, store } = createSeededCampaignApp();

    const campaign = store.createCampaign("Camp", "Summary", TEST_WORLD_ID);
    store.createStoryArc(campaign.id, "Arc", "Summary");

    const response = await request(app)
      .post(`/campaigns/${campaign.id}/story-arcs`)
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({ name: "Arc", summary: "Another summary" })
      .expect(400);

    expect(response.body.error).toContain("already exists in this campaign");
  });

  it("allows same story arc name in different campaigns", async () => {
    const { app, store } = createSeededCampaignApp();

    const campaign1 = store.createCampaign("Camp 1", "Summary", TEST_WORLD_ID);
    const campaign2 = store.createCampaign("Camp 2", "Summary", TEST_WORLD_ID);

    const response1 = await request(app)
      .post(`/campaigns/${campaign1.id}/story-arcs`)
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({ name: "Arc", summary: "Summary" })
      .expect(201);

    const response2 = await request(app)
      .post(`/campaigns/${campaign2.id}/story-arcs`)
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({ name: "Arc", summary: "Summary" })
      .expect(201);

    expect(response1.body.storyArc.name).toBe("Arc");
    expect(response2.body.storyArc.name).toBe("Arc");
    expect(response1.body.storyArc.campaignId).toBe(campaign1.id);
    expect(response2.body.storyArc.campaignId).toBe(campaign2.id);
    expect(response1.body.storyArc.id).not.toBe(response2.body.storyArc.id);
  });

  it("manages events in story arcs", async () => {
    const { app, store } = createSeededCampaignApp();

    const campaign = store.createCampaign("Camp", "Summary", TEST_WORLD_ID);
    const storyArc = store.createStoryArc(campaign.id, "Arc", "Summary");

    const listResponse = await request(app)
      .get(`/story-arcs/${storyArc.id}/events`)
      .expect(200);
    expect(listResponse.body.events).toEqual([]);

    await request(app)
      .post(`/story-arcs/${storyArc.id}/events`)
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({ eventId: "event-1" })
      .expect(201);

    const listAfter = await request(app)
      .get(`/story-arcs/${storyArc.id}/events`)
      .expect(200);
    expect(listAfter.body.events).toEqual(["event-1"]);

    await request(app)
      .post(`/story-arcs/${storyArc.id}/events`)
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({ eventId: "event-2" })
      .expect(201);

    const listAfterTwo = await request(app)
      .get(`/story-arcs/${storyArc.id}/events`)
      .expect(200);
    expect(listAfterTwo.body.events).toEqual(["event-1", "event-2"]);
  });

  it("returns 400 when adding duplicate event to story arc", async () => {
    const { app, store } = createSeededCampaignApp();

    const campaign = store.createCampaign("Camp", "Summary", TEST_WORLD_ID);
    const storyArc = store.createStoryArc(campaign.id, "Arc", "Summary");
    store.addEventToStoryArc(storyArc.id, "event-1");

    const response = await request(app)
      .post(`/story-arcs/${storyArc.id}/events`)
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({ eventId: "event-1" })
      .expect(400);

    expect(response.body.error).toContain("already in story arc");
  });

  it("returns 404 when listing events for non-existent story arc", async () => {
    const { app } = createSeededCampaignApp();

    await request(app)
      .get("/story-arcs/non-existent/events")
      .expect(404);
  });

  it("manages campaign timeline", async () => {
    const { app, store } = createSeededCampaignApp();

    const campaign = store.createCampaign("Camp", "Summary", TEST_WORLD_ID);

    const getResponse = await request(app)
      .get(`/campaigns/${campaign.id}/timeline`)
      .expect(200);

    expect(getResponse.body.currentMoment).toBeGreaterThan(0);
    const initialMoment = getResponse.body.currentMoment as number;

    const advanceResponse = await request(app)
      .post(`/campaigns/${campaign.id}/timeline/advance`)
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({ amount: 1, unit: "day" })
      .expect(200);

    // POST route with responseProperty: undefined returns data directly (like GET)
    expect(advanceResponse.body.currentMoment).toBeGreaterThan(initialMoment);
    expect(advanceResponse.body.currentMoment - initialMoment).toBe(
      24 * 60 * 60 * 1000
    );
  });

  it("returns 404 when getting timeline for non-existent campaign", async () => {
    const { app } = createSeededCampaignApp();

    await request(app)
      .get("/campaigns/non-existent/timeline")
      .expect(404);
  });
});

