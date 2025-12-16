import { describe, it, expect } from "vitest";
import bcrypt from "bcrypt";
import { InMemoryUserStore } from "./userStore";
import { AuthService } from "./authService";

const config = {
  jwtSecret: "test-secret",
  tokenExpiresInSeconds: 60
};

describe("AuthService", () => {
  it("logs in an existing user and returns a token with roles", async () => {
    const store = new InMemoryUserStore();
    const passwordHash = await bcrypt.hash("password123", 10);
    store.createUser("alice", ["gm"], passwordHash);
    const service = new AuthService(store, config);

    const { user, token } = await service.login("alice", "password123");

    expect(user.username).toBe("alice");
    expect(token).toBeTypeOf("string");

    const payload = service.verifyToken(token);
    expect(payload.sub).toBe("alice");
    expect(payload.roles).toEqual(["gm"]);
  });

  it("refuses login for unknown users", async () => {
    const store = new InMemoryUserStore();
    const service = new AuthService(store, config);

    await expect(service.login("unknown", "password")).rejects.toThrow("Invalid username or password");
  });

  it("refuses login with incorrect password", async () => {
    const store = new InMemoryUserStore();
    const passwordHash = await bcrypt.hash("password123", 10);
    store.createUser("alice", ["gm"], passwordHash);
    const service = new AuthService(store, config);

    await expect(service.login("alice", "wrongpassword")).rejects.toThrow("Invalid username or password");
  });

  it("allows admins to assign roles", () => {
    const store = new InMemoryUserStore();
    store.createUser("admin", ["admin"]);
    store.createUser("alice");
    const service = new AuthService(store, config);

    const updated = service.assignRolesAsAdmin("admin", "alice", ["gm"]);
    expect(updated.roles).toEqual(["gm"]);
  });

  it("prevents non-admins from assigning roles", () => {
    const store = new InMemoryUserStore();
    store.createUser("bob"); // no admin role
    store.createUser("alice");
    const service = new AuthService(store, config);

    expect(() =>
      service.assignRolesAsAdmin("bob", "alice", ["gm"])
    ).toThrow("Only admins can assign roles");
  });
});



