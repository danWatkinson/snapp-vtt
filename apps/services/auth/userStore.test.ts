import { describe, it, expect } from "vitest";
import { InMemoryUserStore } from "./userStore";

describe("InMemoryUserStore", () => {
  it("creates and retrieves a user with no roles", () => {
    const store = new InMemoryUserStore();
    const user = store.createUser("alice");
    expect(user.username).toBe("alice");
    expect(user.roles).toEqual([]);

    const fetched = store.getUser("alice");
    expect(fetched).toEqual(user);
  });

  it("prevents creating duplicate usernames", () => {
    const store = new InMemoryUserStore();
    store.createUser("alice");
    expect(() => store.createUser("alice")).toThrow(
      "User 'alice' already exists"
    );
  });

  it("assigns roles and avoids duplicates", () => {
    const store = new InMemoryUserStore();
    store.createUser("alice", ["player"]);
    const updated = store.assignRoles("alice", ["gm", "player"]);
    expect(updated.roles.sort()).toEqual(["gm", "player"].sort());
  });

  it("throws when assigning roles to a missing user", () => {
    const store = new InMemoryUserStore();
    expect(() => store.assignRoles("missing", ["gm"])).toThrow(
      "User 'missing' not found"
    );
  });

  it("lists all users", () => {
    const store = new InMemoryUserStore();
    store.createUser("alice");
    store.createUser("bob", ["gm"]);
    store.createUser("admin", ["admin"]);
    const users = store.listUsers();
    expect(users).toHaveLength(3);
    expect(users.map((u) => u.username)).toContain("alice");
    expect(users.map((u) => u.username)).toContain("bob");
    expect(users.map((u) => u.username)).toContain("admin");
  });

  it("removes a user", () => {
    const store = new InMemoryUserStore();
    store.createUser("alice");
    store.createUser("bob");
    store.removeUser("alice");
    expect(store.getUser("alice")).toBeUndefined();
    expect(store.getUser("bob")).toBeDefined();
    expect(store.listUsers()).toHaveLength(1);
  });

  it("throws when removing non-existent user", () => {
    const store = new InMemoryUserStore();
    expect(() => store.removeUser("nonexistent")).toThrow(
      "User 'nonexistent' not found"
    );
  });

  it("revokes a role from a user", () => {
    const store = new InMemoryUserStore();
    store.createUser("alice", ["gm", "player"]);
    const updated = store.revokeRole("alice", "gm");
    expect(updated.roles).toEqual(["player"]);
    expect(store.getUser("alice")?.roles).toEqual(["player"]);
  });

  it("throws when revoking role from non-existent user", () => {
    const store = new InMemoryUserStore();
    expect(() => store.revokeRole("nonexistent", "gm")).toThrow(
      "User 'nonexistent' not found"
    );
  });

  it("sets all roles for a user (replaces existing)", () => {
    const store = new InMemoryUserStore();
    store.createUser("alice", ["gm", "player"]);
    const updated = store.setRoles("alice", ["admin"]);
    expect(updated.roles).toEqual(["admin"]);
    expect(store.getUser("alice")?.roles).toEqual(["admin"]);
  });

  it("can set empty roles array", () => {
    const store = new InMemoryUserStore();
    store.createUser("alice", ["gm"]);
    const updated = store.setRoles("alice", []);
    expect(updated.roles).toEqual([]);
  });

  it("throws when setting roles for non-existent user", () => {
    const store = new InMemoryUserStore();
    expect(() => store.setRoles("nonexistent", ["gm"])).toThrow(
      "User 'nonexistent' not found"
    );
  });

  it("updates password for an existing user", () => {
    const store = new InMemoryUserStore();
    store.createUser("alice", ["player"], "old-hash");
    const updated = store.updatePassword("alice", "new-hash");
    expect(updated.passwordHash).toBe("new-hash");
    expect(store.getUser("alice")?.passwordHash).toBe("new-hash");
  });

  it("throws when updating password for non-existent user", () => {
    const store = new InMemoryUserStore();
    expect(() => store.updatePassword("nonexistent", "hash")).toThrow(
      "User 'nonexistent' not found"
    );
  });
});
