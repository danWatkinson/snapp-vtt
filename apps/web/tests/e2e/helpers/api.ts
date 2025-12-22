import type { APIRequestContext } from "@playwright/test";
import { serviceUrls } from "../../../lib/config/services";

/**
 * Service names for type-safe API calls
 */
export type ServiceName = "auth" | "world" | "campaign" | "assets";

/**
 * Options for API calls
 */
export interface ApiCallOptions {
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
}

/**
 * Consolidated API client for E2E tests.
 * Provides a unified interface for making API calls to all services.
 */
export class TestApiClient {
  constructor(private request: APIRequestContext) {}

  /**
   * Get the base URL for a service
   */
  private getServiceUrl(service: ServiceName): string {
    // For tests, also check AUTH_SERVICE_URL, WORLD_SERVICE_URL, etc. env vars
    // This allows overriding in test environments
    const envVar = `${service.toUpperCase()}_SERVICE_URL`;
    const envUrl = process.env[envVar] || process.env[`NEXT_PUBLIC_${envVar}`];
    
    if (envUrl) {
      return envUrl;
    }
    
    return serviceUrls[service];
  }

  /**
   * Make an API call to a service
   * 
   * @param service - Service name (auth, world, campaign, assets)
   * @param method - HTTP method
   * @param path - API path (e.g., "/users" or "/worlds")
   * @param options - Request options (body, token, headers)
   * @returns Parsed JSON response
   * @throws Error if request fails
   */
  async call(
    service: ServiceName,
    method: string,
    path: string,
    options: ApiCallOptions = {}
  ): Promise<any> {
    // Check if request context is still valid
    if (!this.request || (this.request as any).__disposed) {
      throw new Error("Request context was disposed before API call");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers
    };

    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    const url = `${this.getServiceUrl(service)}${path}`;
    let response;

    try {
      response = await this.request.fetch(url, {
        method,
        headers,
        data: options.body,
        ignoreHTTPSErrors: true
      });
    } catch (error: any) {
      if (error.message?.includes("disposed") || error.message?.includes("Request context")) {
        throw new Error(
          `Request context was disposed during API call to ${method} ${url}. ` +
          `This may indicate concurrent test execution issues.`
        );
      }
      
      // Check for connection errors
      if (error.message?.includes("ECONNREFUSED") || error.message?.includes("Failed to fetch")) {
        throw new Error(
          `Cannot connect to ${service} service at ${this.getServiceUrl(service)}. ` +
          `Ensure the ${service} service is running (npm run dev:${service === "auth" ? "auth" : service}).`
        );
      }
      
      throw error;
    }

    if (!response.ok()) {
      const status = response.status();
      const errorBody = await response.json().catch(() => ({}));
      const errorMessage = (errorBody as { error?: string }).error ?? `API call failed with status ${status}`;
      throw new Error(`${errorMessage} (${method} ${url})`);
    }

    return response.json();
  }

  /**
   * Ensure admin user exists, creating it if necessary
   * 
   * @returns Promise that resolves when admin user is guaranteed to exist
   */
  async ensureAdminUserExists(): Promise<void> {
    try {
      // Try to login first
      const loginResponse = await this.request.fetch(`${this.getServiceUrl("auth")}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: { username: "admin", password: "admin123" },
        ignoreHTTPSErrors: true
      });

      if (loginResponse.ok()) {
        // Admin user exists, we're good
        return;
      }
    } catch {
      // Login failed, try to bootstrap
    }

    // Admin doesn't exist or login failed - try to bootstrap
    try {
      const bootstrapResponse = await this.request.fetch(`${this.getServiceUrl("auth")}/bootstrap/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: { username: "admin", password: "admin123", roles: ["admin"] },
        ignoreHTTPSErrors: true
      });

      if (!bootstrapResponse.ok()) {
        const errorBody = await bootstrapResponse.json().catch(() => ({}));
        // If bootstrap says users exist, try login again
        if ((errorBody as { error?: string }).error?.includes("users exist")) {
          // Users exist but login failed - this is an error
          throw new Error("Admin user should exist but login failed");
        }
        throw new Error(`Bootstrap failed: ${(errorBody as { error?: string }).error || "Unknown error"}`);
      }
    } catch (err) {
      const error = err as Error;
      if (error.message.includes("ECONNREFUSED") || error.message.includes("Failed to fetch")) {
        throw new Error(
          `Cannot connect to auth service at ${this.getServiceUrl("auth")}. ` +
          `Ensure the auth service is running (npm run dev:auth).`
        );
      }
      throw error;
    }
  }

  /**
   * Get admin token for API calls.
   * Creates admin user if it doesn't exist.
   * 
   * @returns Admin JWT token
   */
  async getAdminToken(): Promise<string> {
    // Ensure admin user exists first
    await this.ensureAdminUserExists();

    const url = `${this.getServiceUrl("auth")}/auth/login`;
    const response = await this.request.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: { username: "admin", password: "admin123" },
      ignoreHTTPSErrors: true
    });

    if (!response.ok()) {
      const status = response.status();
      const errorBody = await response.json().catch(() => ({}));
      const errorMessage = (errorBody as { error?: string }).error ?? `HTTP ${status}`;
      throw new Error(
        `Login failed: ${errorMessage} (status ${status}). ` +
        `Check that auth service is running at ${this.getServiceUrl("auth")}.`
      );
    }

    const body = await response.json() as { token?: string };
    if (!body.token) {
      throw new Error("Login response missing token");
    }
    return body.token;
  }

  /**
   * Ensure a user exists with specified roles.
   * Creates the user if it doesn't exist, or updates roles if they don't match.
   * 
   * @param username - Username
   * @param password - Password
   * @param roles - Array of role names
   * @returns Promise that resolves when user is guaranteed to exist with correct roles
   */
  async ensureUserExists(username: string, password: string, roles: string[]): Promise<void> {
    const adminToken = await this.getAdminToken();

    try {
      // Try to get the user first
      const user = await this.call("auth", "GET", `/users/${username}`, { token: adminToken });
      const userRoles = (user as { user?: { roles?: string[] } }).user?.roles || [];
      
      // Check if roles match (order doesn't matter)
      const rolesMatch = 
        roles.length === userRoles.length &&
        roles.every(role => userRoles.includes(role)) &&
        userRoles.every(role => roles.includes(role));
      
      if (!rolesMatch) {
        // Update roles
        await this.call("auth", "PUT", `/users/${username}/roles`, {
          token: adminToken,
          body: { roles }
        });
      }
    } catch (err: any) {
      // User doesn't exist - create it
      if (err.message?.includes("404") || err.message?.includes("not found")) {
        await this.call("auth", "POST", "/users", {
          token: adminToken,
          body: { username, password, roles }
        });
      } else {
        // Some other error
        throw err;
      }
    }
  }
}

/**
 * Create a TestApiClient instance
 * 
 * @param request - Playwright API request context
 * @returns TestApiClient instance
 */
export function createApiClient(request: APIRequestContext): TestApiClient {
  return new TestApiClient(request);
}
