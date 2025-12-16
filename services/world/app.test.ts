import request from "supertest";
import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { createWorldApp } from "./app";
import { InMemoryWorldStore } from "./worldStore";
import { InMemoryWorldEntityStore } from "./worldEntitiesStore";

function createSeededWorldApp() {
  const store = new InMemoryWorldStore();
  const entityStore = new InMemoryWorldEntityStore();
  const app = createWorldApp({ store, entityStore });
  return { app, store, entityStore };
}

function createTestToken(roles: string[] = ["gm"]): string {
  const jwtSecret = process.env.AUTH_JWT_SECRET ?? process.env.JWT_SECRET ?? "dev-secret";
  return jwt.sign({ sub: "test-user", roles }, jwtSecret, { expiresIn: "1h" });
}

describe("world REST API", () => {
  it("lists no worlds initially and allows creating a world", async () => {
    const { app } = createSeededWorldApp();

    const listResponse = await request(app).get("/worlds").expect(200);
    expect(listResponse.body.worlds).toEqual([]);

    const createResponse = await request(app)
      .post("/worlds")
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({ name: "Eldoria", description: "A high-fantasy realm." })
      .expect(201);

    expect(createResponse.body.world.name).toBe("Eldoria");

    const listAfter = await request(app).get("/worlds").expect(200);
    expect(listAfter.body.worlds).toHaveLength(1);
  });

  it("rejects creating a world without a name", async () => {
    const { app } = createSeededWorldApp();

    const response = await request(app)
      .post("/worlds")
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({ name: "", description: "No name" })
      .expect(400);

    expect(response.body.error).toBe("World name is required");
  });

  it("creates and lists entities for a world", async () => {
    const { app, store } = createSeededWorldApp();

    const world = store.createWorld("Eldoria", "desc");

    const listEmpty = await request(app)
      .get(`/worlds/${world.id}/entities?type=location`)
      .expect(200);
    expect(listEmpty.body.entities).toEqual([]);

    const createEntity = await request(app)
      .post(`/worlds/${world.id}/entities`)
      .set("Authorization", `Bearer ${createTestToken(["gm"])}`)
      .send({
        type: "location",
        name: "Whispering Woods",
        summary: "A forest."
      })
      .expect(201);

    expect(createEntity.body.entity.name).toBe("Whispering Woods");

    const listAfter = await request(app)
      .get(`/worlds/${world.id}/entities?type=location`)
      .expect(200);
    expect(listAfter.body.entities).toHaveLength(1);
  });
});


