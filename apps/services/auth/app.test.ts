import request from "supertest";
import { describe, it, expect } from "vitest";
import bcrypt from "bcrypt";
import { createApp } from "./app";
import { InMemoryUserStore } from "./userStore";
import { AuthServiceConfig } from "./authService";

async function createSeededApp() {
  const store = new InMemoryUserStore();
  const adminHash = await bcrypt.hash("admin123", 10);
  const aliceHash = await bcrypt.hash("alice123", 10);
  store.createUser("admin", ["admin"], adminHash);
  store.createUser("alice", [], aliceHash);
  const config: AuthServiceConfig = {
    jwtSecret: "test-secret",
    tokenExpiresInSeconds: 60
  };
  const app = createApp({ userStore: store, authConfig: config });
  return app;
}

describe("auth REST API", () => {
  it("allows admin to assign GM role and enforces role-based endpoints", async () => {
    const app = await createSeededApp();

    // Login as admin
    const adminLogin = await request(app)
      .post("/auth/login")
      .send({ username: "admin", password: "admin123" })
      .expect(200);

    const adminToken = adminLogin.body.token as string;
    expect(adminToken).toBeTypeOf("string");

    // Admin assigns gm role to alice
    const assignResponse = await request(app)
      .post("/users/alice/roles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ roles: ["gm"] })
      .expect(200);

    expect(assignResponse.body.user.roles).toContain("gm");

    // Alice logs in and receives token with gm role
    const aliceLogin = await request(app)
      .post("/auth/login")
      .send({ username: "alice", password: "alice123" })
      .expect(200);

    const aliceToken = aliceLogin.body.token as string;
    expect(aliceToken).toBeTypeOf("string");

    // GM-only endpoint succeeds for alice
    await request(app)
      .get("/gm-only")
      .set("Authorization", `Bearer ${aliceToken}`)
      .expect(200);

    // Admin-only endpoint is forbidden for alice
    await request(app)
      .get("/admin-only")
      .set("Authorization", `Bearer ${aliceToken}`)
      .expect(403);
  });

  it("rejects role assignment when caller is not admin", async () => {
    const app = await createSeededApp();

    // Login as alice (non-admin)
    const aliceLogin = await request(app)
      .post("/auth/login")
      .send({ username: "alice", password: "alice123" })
      .expect(200);

    const aliceToken = aliceLogin.body.token as string;

    // alice attempts to assign gm to herself
    await request(app)
      .post("/users/alice/roles")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ roles: ["gm"] })
      .expect(403);
  });

  it("allows admin to list all users", async () => {
    const app = await createSeededApp();

    const adminLogin = await request(app)
      .post("/auth/login")
      .send({ username: "admin", password: "admin123" })
      .expect(200);

    const adminToken = adminLogin.body.token as string;

    const listResponse = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(listResponse.body.users).toBeInstanceOf(Array);
    expect(listResponse.body.users.length).toBeGreaterThanOrEqual(2);
    const usernames = listResponse.body.users.map((u: { username: string }) => u.username);
    expect(usernames).toContain("admin");
    expect(usernames).toContain("alice");
  });

  it("allows admin to get user details", async () => {
    const app = await createSeededApp();

    const adminLogin = await request(app)
      .post("/auth/login")
      .send({ username: "admin", password: "admin123" })
      .expect(200);

    const adminToken = adminLogin.body.token as string;

    const userResponse = await request(app)
      .get("/users/alice")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(userResponse.body.user.username).toBe("alice");
    expect(userResponse.body.user).toHaveProperty("roles");
  });

  it("allows user to get their own details", async () => {
    const app = await createSeededApp();

    const aliceLogin = await request(app)
      .post("/auth/login")
      .send({ username: "alice", password: "alice123" })
      .expect(200);

    const aliceToken = aliceLogin.body.token as string;

    const userResponse = await request(app)
      .get("/users/alice")
      .set("Authorization", `Bearer ${aliceToken}`)
      .expect(200);

    expect(userResponse.body.user.username).toBe("alice");
  });

  it("prevents non-admin from listing users", async () => {
    const app = await createSeededApp();

    const aliceLogin = await request(app)
      .post("/auth/login")
      .send({ username: "alice", password: "alice123" })
      .expect(200);

    const aliceToken = aliceLogin.body.token as string;

    await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${aliceToken}`)
      .expect(403);
  });

  it("allows admin to create a user", async () => {
    const app = await createSeededApp();

    const adminLogin = await request(app)
      .post("/auth/login")
      .send({ username: "admin", password: "admin123" })
      .expect(200);

    const adminToken = adminLogin.body.token as string;

    const createResponse = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ username: "bob", password: "bob123", roles: ["player"] })
      .expect(201);

    expect(createResponse.body.user.username).toBe("bob");
    expect(createResponse.body.user.roles).toEqual(["player"]);
  });

  it("prevents non-admin from creating users", async () => {
    const app = await createSeededApp();

    const aliceLogin = await request(app)
      .post("/auth/login")
      .send({ username: "alice", password: "alice123" })
      .expect(200);

    const aliceToken = aliceLogin.body.token as string;

    await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ username: "bob", password: "bob123" })
      .expect(403); // POST /users requires admin role
  });

  it("allows admin to delete a user", async () => {
    const app = await createSeededApp();

    const adminLogin = await request(app)
      .post("/auth/login")
      .send({ username: "admin", password: "admin123" })
      .expect(200);

    const adminToken = adminLogin.body.token as string;

    // Create a test user first
    await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ username: "testuser", password: "test123" })
      .expect(201);

    // Delete the user
    await request(app)
      .delete("/users/testuser")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    // Verify user is gone
    await request(app)
      .get("/users/testuser")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(404);
  });

  it("allows admin to revoke a role", async () => {
    const app = await createSeededApp();

    const adminLogin = await request(app)
      .post("/auth/login")
      .send({ username: "admin", password: "admin123" })
      .expect(200);

    const adminToken = adminLogin.body.token as string;

    // First assign a role
    await request(app)
      .post("/users/alice/roles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ roles: ["gm"] })
      .expect(200);

    // Verify role is assigned
    const beforeResponse = await request(app)
      .get("/users/alice")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(beforeResponse.body.user.roles).toContain("gm");

    // Revoke the role
    const revokeResponse = await request(app)
      .delete("/users/alice/roles/gm")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(revokeResponse.body.user.roles).not.toContain("gm");
  });

  it("allows admin to replace all roles", async () => {
    const app = await createSeededApp();

    const adminLogin = await request(app)
      .post("/auth/login")
      .send({ username: "admin", password: "admin123" })
      .expect(200);

    const adminToken = adminLogin.body.token as string;

    // First assign some roles
    await request(app)
      .post("/users/alice/roles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ roles: ["gm", "player"] })
      .expect(200);

    // Replace all roles with just "player"
    const replaceResponse = await request(app)
      .put("/users/alice/roles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ roles: ["player"] })
      .expect(200);

    expect(replaceResponse.body.user.roles).toEqual(["player"]);
    expect(replaceResponse.body.user.roles).not.toContain("gm");
  });

  it("allows admin to get user roles", async () => {
    const app = await createSeededApp();

    const adminLogin = await request(app)
      .post("/auth/login")
      .send({ username: "admin", password: "admin123" })
      .expect(200);

    const adminToken = adminLogin.body.token as string;

    const rolesResponse = await request(app)
      .get("/users/alice/roles")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(rolesResponse.body.roles).toBeInstanceOf(Array);
  });

  it("allows user to get their own roles", async () => {
    const app = await createSeededApp();

    const aliceLogin = await request(app)
      .post("/auth/login")
      .send({ username: "alice", password: "alice123" })
      .expect(200);

    const aliceToken = aliceLogin.body.token as string;

    const rolesResponse = await request(app)
      .get("/users/alice/roles")
      .set("Authorization", `Bearer ${aliceToken}`)
      .expect(200);

    expect(rolesResponse.body.roles).toBeInstanceOf(Array);
  });

  it("prevents user from getting other user's roles", async () => {
    const app = await createSeededApp();

    const aliceLogin = await request(app)
      .post("/auth/login")
      .send({ username: "alice", password: "alice123" })
      .expect(200);

    const aliceToken = aliceLogin.body.token as string;

    await request(app)
      .get("/users/admin/roles")
      .set("Authorization", `Bearer ${aliceToken}`)
      .expect(403);
  });
});

