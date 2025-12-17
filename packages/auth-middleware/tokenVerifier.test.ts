import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";
import { TokenVerifier } from "./tokenVerifier";

vi.mock("jsonwebtoken");

const mockedVerify = vi.mocked(jwt.verify);

describe("TokenVerifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should verify token and return payload", () => {
    mockedVerify.mockReturnValue({ sub: "user1", roles: ["admin"] } as any);

    const verifier = new TokenVerifier({ jwtSecret: "secret" });
    const result = verifier.verifyToken("token");

    expect(jwt.verify).toHaveBeenCalledWith("token", "secret");
    expect(result).toEqual({ sub: "user1", roles: ["admin"] });
  });

  it("should throw when decoded payload is a string", () => {
    mockedVerify.mockReturnValue("not-an-object" as any);

    const verifier = new TokenVerifier({ jwtSecret: "secret" });

    expect(() => verifier.verifyToken("token")).toThrow("Invalid token payload");
  });

  it("should propagate jwt.verify errors", () => {
    const err = new Error("invalid signature");
    mockedVerify.mockImplementation(() => {
      throw err;
    });

    const verifier = new TokenVerifier({ jwtSecret: "secret" });

    expect(() => verifier.verifyToken("bad-token")).toThrow(err);
  });
});
