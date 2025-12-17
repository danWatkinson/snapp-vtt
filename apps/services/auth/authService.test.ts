import { describe, it, expect, vi } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { InMemoryUserStore } from "./userStore";
import { AuthService } from "./authService";

vi.mock("jsonwebtoken");

const mockedVerify = vi.mocked(jwt.verify);
const mockedSign = vi.mocked(jwt.sign);

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

    // Ensure jwt.sign returns a deterministic token
    mockedSign.mockReturnValueOnce("fake-token" as any);

    const { user, token } = await service.login("alice", "password123");

    expect(user.username).toBe("alice");
    expect(token).toBeTypeOf("string");

    mockedVerify.mockReturnValueOnce({ sub: "alice", roles: ["gm"] } as any);
    const payload = service.verifyToken(token);
    expect(payload.sub).toBe("alice");
    expect(payload.roles).toEqual(["gm"]);
    expect(mockedVerify).toHaveBeenCalledWith("fake-token", "test-secret");
  });

  it("refuses login for unknown users", async () => {
    const store = new InMemoryUserStore();
    const service = new AuthService(store, config);

    await expect(service.login("unknown", "password")).rejects.toThrow(
      "Invalid username or password"
    );
  });

  it("refuses login with incorrect password", async () => {
    const store = new InMemoryUserStore();
    const passwordHash = await bcrypt.hash("password123", 10);
    store.createUser("alice", ["gm"], passwordHash);
    const service = new AuthService(store, config);

    await expect(service.login("alice", "wrongpassword")).rejects.toThrow(
      "Invalid username or password"
    );
  });

  it("refuses login when user has no password hash", async () => {
    const store = new InMemoryUserStore();
    // Create user without passwordHash (SSO-style user)
    store.createUser("alice", ["gm"]);
    const service = new AuthService(store, config);

    await expect(service.login("alice", "anything")).rejects.toThrow(
      "Invalid username or password"
    );
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

    expect(() => service.assignRolesAsAdmin("bob", "alice", ["gm"])).toThrow(
      "Only admins can assign roles"
    );
  });

  it("hashes passwords using bcrypt", async () => {
    const store = new InMemoryUserStore();
    const service = new AuthService(store, config);

    const hash = await service.hashPassword("secret");

    expect(hash).toBeTypeOf("string");
    expect(hash).not.toBe("secret");
    const matches = await bcrypt.compare("secret", hash);
    expect(matches).toBe(true);
  });

  it("throws when verifyToken receives a string payload", () => {
    const store = new InMemoryUserStore();
    const service = new AuthService(store, config);

    mockedVerify.mockReturnValueOnce("not-an-object" as any);

    expect(() => service.verifyToken("token")).toThrow("Invalid token payload");
  });

  it("propagates errors thrown by jwt.verify", () => {
    const store = new InMemoryUserStore();
    const service = new AuthService(store, config);
    const err = new Error("invalid signature");

    mockedVerify.mockImplementation(() => {
      throw err;
    });

    expect(() => service.verifyToken("bad-token")).toThrow(err);
  });
});
