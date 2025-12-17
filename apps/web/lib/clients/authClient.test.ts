import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  login,
  listUsers,
  getUser,
  createUser,
  deleteUser,
  assignRoles,
  revokeRole,
  setRoles
} from "./authClient";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("authClient", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("login", () => {
    it("should successfully login and return user and token", async () => {
      const mockResponse = {
        user: { username: "testuser", roles: ["admin"] },
        token: "test-token"
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await login("testuser", "password");

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/login"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "testuser", password: "password" })
        })
      );
    });

    it("should throw network error on fetch failure", async () => {
      const networkError = new Error("Failed to fetch");
      mockFetch.mockRejectedValueOnce(networkError);

      try {
        await login("testuser", "password");
        expect.fail("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Network error: Failed to fetch");
        expect((error as any).isNetworkError).toBe(true);
      }
    });

    it("should throw error on failed login", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Invalid credentials" })
      });

      await expect(login("testuser", "wrongpassword")).rejects.toThrow("Invalid credentials");
    });

    it("should throw generic error when response has no error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({})
      });

      await expect(login("testuser", "password")).rejects.toThrow("Login failed");
    });
  });

  describe("listUsers", () => {
    it("should fetch and return users list", async () => {
      const mockUsers = [
        { id: "1", username: "user1", roles: [] },
        { id: "2", username: "user2", roles: ["gm"] }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers })
      });

      const result = await listUsers("token");

      expect(result).toEqual(mockUsers);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/users"),
        expect.objectContaining({
          method: "GET",
          headers: { Authorization: "Bearer token" }
        })
      );
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Forbidden" })
      });

      await expect(listUsers("token")).rejects.toThrow("Forbidden");
    });

    it("should throw generic error when response has no error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(listUsers("token")).rejects.toThrow("Failed to list users");
    });

    it("should handle JSON parse failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error("Invalid JSON");
        }
      });

      await expect(listUsers("token")).rejects.toThrow("Failed to list users");
    });
  });

  describe("getUser", () => {
    it("should fetch and return user", async () => {
      const mockUser = { id: "1", username: "user1", roles: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser })
      });

      const result = await getUser("token", "user1");

      expect(result).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/users/user1"),
        expect.objectContaining({
          method: "GET",
          headers: { Authorization: "Bearer token" }
        })
      );
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "User not found" })
      });

      await expect(getUser("token", "user1")).rejects.toThrow("User not found");
    });

    it("should throw generic error when response has no error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(getUser("token", "user1")).rejects.toThrow("Failed to get user");
    });
  });

  describe("createUser", () => {
    it("should create user and return created user", async () => {
      const mockUser = { id: "1", username: "newuser", roles: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser })
      });

      const result = await createUser("token", "newuser", "password", ["gm"]);

      expect(result).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/users"),
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer token"
          },
          body: JSON.stringify({ username: "newuser", password: "password", roles: ["gm"] })
        })
      );
    });

    it("should create user with empty roles array by default", async () => {
      const mockUser = { id: "1", username: "newuser", roles: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser })
      });

      await createUser("token", "newuser", "password");

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.roles).toEqual([]);
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Username already exists" })
      });

      await expect(createUser("token", "existing", "password")).rejects.toThrow("Username already exists");
    });
  });

  describe("deleteUser", () => {
    it("should delete user successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await deleteUser("token", "user1");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/users/user1"),
        expect.objectContaining({
          method: "DELETE",
          headers: { Authorization: "Bearer token" }
        })
      );
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "User not found" })
      });

      await expect(deleteUser("token", "user1")).rejects.toThrow("User not found");
    });

    it("should throw generic error when response has no error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(deleteUser("token", "user1")).rejects.toThrow("Failed to delete user");
    });
  });

  describe("assignRoles", () => {
    it("should assign roles to user", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await assignRoles("token", "user1", ["gm", "admin"]);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/users/user1/roles"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ roles: ["gm", "admin"] })
        })
      );
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Invalid role" })
      });

      await expect(assignRoles("token", "user1", ["invalid"])).rejects.toThrow("Invalid role");
    });

    it("should throw generic error when response has no error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(assignRoles("token", "user1", ["gm"])).rejects.toThrow("Role assignment failed");
    });
  });

  describe("revokeRole", () => {
    it("should revoke role from user", async () => {
      const mockUser = { id: "1", username: "user1", roles: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser })
      });

      const result = await revokeRole("token", "user1", "gm");

      expect(result).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/users/user1/roles/gm"),
        expect.objectContaining({
          method: "DELETE"
        })
      );
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Role not found" })
      });

      await expect(revokeRole("token", "user1", "gm")).rejects.toThrow("Role not found");
    });

    it("should throw generic error when response has no error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(revokeRole("token", "user1", "gm")).rejects.toThrow("Failed to revoke role");
    });
  });

  describe("setRoles", () => {
    it("should set roles for user", async () => {
      const mockUser = { id: "1", username: "user1", roles: ["admin"] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser })
      });

      const result = await setRoles("token", "user1", ["admin"]);

      expect(result).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/users/user1/roles"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ roles: ["admin"] })
        })
      );
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Invalid roles" })
      });

      await expect(setRoles("token", "user1", ["invalid"])).rejects.toThrow("Invalid roles");
    });

    it("should throw generic error when response has no error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(setRoles("token", "user1", ["admin"])).rejects.toThrow("Failed to set roles");
    });
  });
});
