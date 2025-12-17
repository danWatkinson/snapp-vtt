import { describe, it, expect } from "vitest";
import {
  AUTH_EVENT,
  OPEN_LOGIN_EVENT,
  OPEN_USER_MANAGEMENT_EVENT,
  OPEN_CREATE_WORLD_EVENT
} from "./authEvents";

describe("authEvents", () => {
  it("should export AUTH_EVENT constant", () => {
    expect(AUTH_EVENT).toBe("snapp-auth-changed");
  });

  it("should export OPEN_LOGIN_EVENT constant", () => {
    expect(OPEN_LOGIN_EVENT).toBe("snapp-open-login");
  });

  it("should export OPEN_USER_MANAGEMENT_EVENT constant", () => {
    expect(OPEN_USER_MANAGEMENT_EVENT).toBe("snapp:open-user-management");
  });

  it("should export OPEN_CREATE_WORLD_EVENT constant", () => {
    expect(OPEN_CREATE_WORLD_EVENT).toBe("snapp:create-world");
  });
});
