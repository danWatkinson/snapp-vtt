import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mocks for fs, https, bcrypt
const existsSyncMock = vi.fn();
const readFileSyncMock = vi.fn();
const createServerMock = vi.fn();
const listenMock = vi.fn((port: number, cb?: () => void) => {
  if (cb) cb();
});
const hashMock = vi.fn(() => Promise.resolve("hashed-password"));

vi.mock("fs", () => ({
  default: {
    existsSync: existsSyncMock,
    readFileSync: readFileSyncMock
  }
}));

vi.mock("https", () => ({
  default: {
    createServer: createServerMock
  }
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: hashMock
  }
}));

describe("auth server bootstrap", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    existsSyncMock.mockReset();
    readFileSyncMock.mockReset();
    createServerMock.mockReset();
    listenMock.mockReset();
    hashMock.mockReset();
    hashMock.mockImplementation(() => Promise.resolve("hashed-password"));
    createServerMock.mockReturnValue({ listen: listenMock });
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("starts server even when users file is missing", async () => {
    existsSyncMock.mockReturnValue(false);

    vi.resetModules();

    await import("./server");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(existsSyncMock).toHaveBeenCalled();
    expect(createServerMock).toHaveBeenCalled();
    expect(listenMock).toHaveBeenCalled();
  });

  it("seeds users when users file exists and logs startup", async () => {
    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockReturnValue(
      JSON.stringify([
        { username: "seed-admin", password: "admin123", roles: ["admin", "unknown"] }
      ])
    );

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    vi.resetModules();

    await import("./server");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(existsSyncMock).toHaveBeenCalled();
    expect(readFileSyncMock).toHaveBeenCalled();
    expect(createServerMock).toHaveBeenCalled();
    expect(listenMock).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalled(); // covers listen callback log

    consoleLogSpy.mockRestore();
  });

  it("warns and skips users with missing username or password", async () => {
    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockReturnValue(
      JSON.stringify([
        { username: "", password: "p1", roles: ["admin"] },
        { username: "ok", password: "p2", roles: ["gm"] }
      ])
    );

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.resetModules();

    await import("./server");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(createServerMock).toHaveBeenCalled();
    expect(listenMock).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it("resolves AUTH_USERS_FILE env var as absolute path", async () => {
    process.env.AUTH_USERS_FILE = "/abs/path/users.json";
    existsSyncMock.mockReturnValue(false);

    vi.resetModules();

    await import("./server");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(existsSyncMock).toHaveBeenCalledWith("/abs/path/users.json");
  });

  it("resolves AUTH_USERS_FILE env var as relative path from cwd", async () => {
    process.env.AUTH_USERS_FILE = "relative/users.json";
    existsSyncMock.mockReturnValue(false);

    vi.spyOn(process, "cwd").mockReturnValue("/project");

    vi.resetModules();

    await import("./server");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(existsSyncMock).toHaveBeenCalledWith("/project/relative/users.json");
  });

  it("logs and continues when seeding throws at top level", async () => {
    existsSyncMock.mockImplementation(() => {
      throw new Error("fs error");
    });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.resetModules();

    await import("./server");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(createServerMock).toHaveBeenCalled();
    expect(listenMock).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("logs per-user seeding errors and continues", async () => {
    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockReturnValue(
      JSON.stringify([
        { username: "u1", password: "p1", roles: ["admin"] }
      ])
    );

    hashMock.mockRejectedValueOnce(new Error("hash error"));

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.resetModules();

    await import("./server");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(createServerMock).toHaveBeenCalled();
    expect(listenMock).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
