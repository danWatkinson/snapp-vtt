import { describe, it, expect } from "vitest";
import { AUTH_USERNAME_KEY } from "./authStorage";

describe("authStorage", () => {
  it("should export AUTH_USERNAME_KEY constant", () => {
    expect(AUTH_USERNAME_KEY).toBe("snapp_current_username");
  });
});
