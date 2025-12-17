// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { AUTH_EVENT } from "../auth/authEvents";

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should provide default context values", () => {
    const TestComponent = () => {
      const { currentUser, isAuthenticated } = useAuth();
      return (
        <div>
          <span data-testid="user">{currentUser ? currentUser.user.username : "null"}</span>
          <span data-testid="authenticated">{isAuthenticated ? "true" : "false"}</span>
        </div>
      );
    };

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(getByTestId("user").textContent).toBe("null");
    expect(getByTestId("authenticated").textContent).toBe("false");
  });

  it("should allow setting current user", () => {
    const TestComponent = () => {
      const { currentUser, setCurrentUser, isAuthenticated } = useAuth();
      return (
        <div>
          <span data-testid="user">{currentUser ? currentUser.user.username : "null"}</span>
          <span data-testid="authenticated">{isAuthenticated ? "true" : "false"}</span>
          <button
            data-testid="set-user"
            onClick={() =>
              setCurrentUser({
                user: { username: "testuser", roles: [] },
                token: "test-token"
              })
            }
          >
            Set User
          </button>
        </div>
      );
    };

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(getByTestId("user").textContent).toBe("null");
    expect(getByTestId("authenticated").textContent).toBe("false");

    act(() => {
      getByTestId("set-user").click();
    });

    expect(getByTestId("user").textContent).toBe("testuser");
    expect(getByTestId("authenticated").textContent).toBe("true");
  });

  it("should update when AUTH_EVENT fires with null username", () => {
    const TestComponent = () => {
      const { currentUser, setCurrentUser, isAuthenticated } = useAuth();
      return (
        <div>
          <span data-testid="user">{currentUser ? currentUser.user.username : "null"}</span>
          <span data-testid="authenticated">{isAuthenticated ? "true" : "false"}</span>
          <button
            data-testid="set-user"
            onClick={() =>
              setCurrentUser({
                user: { username: "testuser", roles: [] },
                token: "test-token"
              })
            }
          >
            Set User
          </button>
        </div>
      );
    };

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    act(() => {
      getByTestId("set-user").click();
    });

    expect(getByTestId("authenticated").textContent).toBe("true");

    // Dispatch AUTH_EVENT with null username
    act(() => {
      const authEvent = new CustomEvent(AUTH_EVENT, {
        detail: { username: null }
      });
      window.dispatchEvent(authEvent);
    });

    expect(getByTestId("user").textContent).toBe("null");
    expect(getByTestId("authenticated").textContent).toBe("false");
  });

  it("should throw error when useAuth is used outside provider", () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn(() => {});

    try {
      renderHook(() => useAuth());
      expect.fail("Should have thrown");
    } catch (error) {
      expect((error as Error).message).toContain("useAuth must be used within an AuthProvider");
    } finally {
      console.error = originalError;
    }
  });
});
