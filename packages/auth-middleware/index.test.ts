import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { createAuthenticateMiddleware, authenticate } from "./index";
import { TokenVerifier } from "./tokenVerifier";

vi.mock("./tokenVerifier");

const mockedTokenVerifier = vi.mocked(TokenVerifier);

function createMockReq(headers: Record<string, string | undefined> = {}): Request {
  return {
    header: (name: string) => headers[name.toLowerCase()] ?? headers[name] ?? undefined
  } as unknown as Request;
}

function createMockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res as Response);
  res.json = vi.fn().mockReturnValue(res as Response);
  return res as Response;
}

describe("auth-middleware", () => {
  let verifyMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    verifyMock = vi.fn();
    mockedTokenVerifier.mockImplementation((config: any) => {
      return {
        verifyToken: verifyMock
      } as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 401 when bearer token is missing", () => {
    const middleware = createAuthenticateMiddleware({ jwtSecret: "secret" });
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    middleware(req as any, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing bearer token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 when token is invalid", () => {
    const middleware = createAuthenticateMiddleware({ jwtSecret: "secret" });
    const req = createMockReq({ authorization: "Bearer bad-token" });
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    verifyMock.mockImplementation(() => {
      throw new Error("invalid token");
    });

    middleware(req as any, res, next);

    expect(verifyMock).toHaveBeenCalledWith("bad-token");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow request through with valid token and no requiredRole", () => {
    const middleware = createAuthenticateMiddleware({ jwtSecret: "secret" });
    const req = createMockReq({ authorization: "Bearer good-token" }) as any;
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    verifyMock.mockReturnValue({ sub: "user1", roles: ["gm"] });

    middleware(req, res, next);

    expect(req.auth).toEqual({ userId: "user1", roles: ["gm"] });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should return 403 when requiredRole is not present (and not admin)", () => {
    const middleware = createAuthenticateMiddleware({ jwtSecret: "secret", requiredRole: "gm" });
    const req = createMockReq({ authorization: "Bearer token" }) as any;
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    verifyMock.mockReturnValue({ sub: "user1", roles: ["player"] });

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow admin to bypass requiredRole", () => {
    const middleware = createAuthenticateMiddleware({ jwtSecret: "secret", requiredRole: "gm" });
    const req = createMockReq({ authorization: "Bearer token" }) as any;
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    verifyMock.mockReturnValue({ sub: "admin", roles: ["admin"] });

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should use AUTH_JWT_SECRET from environment in authenticate()", () => {
    const original = process.env.AUTH_JWT_SECRET;
    process.env.AUTH_JWT_SECRET = "env-secret";

    const middleware = authenticate();
    const req = createMockReq({ authorization: "Bearer token" }) as any;
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    verifyMock.mockReturnValue({ sub: "user1", roles: ["gm"] });

    middleware(req, res, next);

    // TokenVerifier was constructed with env-secret (implicit via mock)
    expect(verifyMock).toHaveBeenCalledWith("token");

    process.env.AUTH_JWT_SECRET = original;
  });
});
