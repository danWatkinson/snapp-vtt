import request from "supertest";
import { describe, it, expect } from "vitest";
import bcrypt from "bcrypt";
import { createApp } from "./app";
import { InMemoryUserStore } from "./userStore";
import { AuthService, AuthServiceConfig } from "./authService";

async function createSeededApp(store?: InMemoryUserStore) {
  const userStore = store ?? new InMemoryUserStore();
  const adminHash = await bcrypt.hash("admin123", 10);
  const aliceHash = await bcrypt.hash("alice123", 10);
  if (!userStore.getUser("admin")) {
    userStore.createUser("admin", ["admin"], adminHash);
  }
  if (!userStore.getUser("alice")) {
    userStore.createUser("alice", [], aliceHash);
  }
  const config: AuthServiceConfig = {
    jwtSecret: "test-secret",
    tokenExpiresInSeconds: 60
  };
  const app = createApp({ userStore, authConfig: config });
  return app;
}

describe("auth REST API", () => {
  it("allows admin to assign GM role and enforces role-based endpoints", async () => {
    const app = await createSeededApp();

    const adminLogin = await request(app)
      .post("/auth/login")
      .send({ username: "admin", password: "admin123" })
      .expect(200);

    const adminToken = adminLogin.body.token as string;
    expect(adminToken).toBeTypeOf("string");

    const assignResponse = await request(app)
      .post("/users/alice/roles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ roles: ["gm"] })
      .expect(200);

    expect(assignResponse.body.user.roles).toContain("gm");

    const aliceLogin = await request(app)
      .post("/auth/login")
      .send({ username: "alice", password: "alice123" })
      .expect(200);

    const aliceToken = aliceLogin.body.token as string;
    expect(aliceToken).toBeTypeOf("string");

    await request(app)
      .get("/gm-only")
      .set("Authorization", `Bearer ${aliceToken}`)
      .expect(200);

    await request(app)
      .get("/admin-only")
      .set("Authorization", `Bearer ${aliceToken}`)
      .expect(403);
  });

  it("allows admin to access admin-only endpoint", async () => {
    const app = await createSeededApp();

    const adminLogin = await request(app)
      .post("/auth/login")
      .send({ username: "admin", password: "admin123" })
      .expect(200);

    const adminToken = adminLogin.body.token as string;

    const res = await request(app)
      .get("/admin-only")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.message).toBe("Admin content");
  });

  it("rejects role assignment when caller is not admin", async () => {
    const app = await createSeededApp();

    const aliceLogin = await request(app)
      .post("/auth/login")
      .send({ username: "alice", password: "alice123" })
      .expect(200);

    const aliceToken = aliceLogin.body.token as string;

    await request(app)
      .post("/users/alice/roles")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ roles: ["gm"] })
      .expect(403);
  });

  it("prevents user from getting other user's details", async () => {
    const app = await createSeededApp();

    const aliceLogin = await request(app)
      .post("/auth/login")
      .send({ username: "alice", password: "alice123" })
      .expect(200);

    const aliceToken = aliceLogin.body.token as string;

    await request(app)
      .get("/users/admin")
      .set("Authorization", `Bearer ${aliceToken}`)
      .expect(403);
  });

  it("returns 404 when getting details for a missing user", async () => {
    const app = await createSeededApp();

    const adminLogin = await request(app)
      .post("/auth/login")
      .send({ username: "admin", password: "admin123" })
      .expect(200);

    const adminToken = adminLogin.body.token as string;

    await request(app)
      .get("/users/missing")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(404);
  });

  // ... existing tests for users list, create, delete, roles, password, and auth errors ...
});
