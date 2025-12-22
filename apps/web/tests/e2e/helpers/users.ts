import { Page, expect } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import {
  USER_CREATED_EVENT,
  USER_DELETED_EVENT,
  ROLE_ASSIGNED_EVENT,
  ROLE_REVOKED_EVENT
} from "../../../lib/auth/authEvents";
import { DEFAULT_EVENT_TIMEOUT } from "./constants";
import { waitForEventWithNameFilter, matchesName, isVisibleSafely, isHiddenSafely, getUniqueUsername } from "./utils";
import { createApiClient } from "./api";

/**
 * Wait for a user to be created using transition events.
 * 
 * @param page - Playwright page object
 * @param username - Username to wait for (can be partial match)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForUserCreated(
  page: Page,
  username: string,
  timeout: number = DEFAULT_EVENT_TIMEOUT
): Promise<void> {
  await waitForEventWithNameFilter(
    page,
    USER_CREATED_EVENT,
    "username",
    username,
    timeout,
    `Timeout waiting for user "{name}" to be created after ${timeout}ms`,
    async () => {
      // Fallback: Wait for user item to appear in DOM
      const userItem = page.getByTestId(`user-${username}`);
      await expect(userItem).toBeVisible({ timeout });
    }
  ).catch(async (error) => {
    // If both failed, check if user item exists anyway
    const userItem = page.getByTestId(`user-${username}`);
    const isVisible = await isVisibleSafely(userItem);
    if (isVisible) {
      return; // User item is visible, that's good enough
    }
    throw error; // Neither event nor DOM, rethrow
  });
}

/**
 * Wait for a user to be deleted using transition events.
 * 
 * @param page - Playwright page object
 * @param username - Username to wait for deletion
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForUserDeleted(
  page: Page,
  username: string,
  timeout: number = DEFAULT_EVENT_TIMEOUT
): Promise<void> {
  await waitForEventWithNameFilter(
    page,
    USER_DELETED_EVENT,
    "username",
    username,
    timeout,
    `Timeout waiting for user "{name}" to be deleted after ${timeout}ms`,
    async () => {
      // Fallback: Wait for user item to disappear from DOM
      const userItem = page.getByTestId(`user-${username}`);
      await expect(userItem).not.toBeVisible({ timeout });
    }
  ).catch(async (error) => {
    // If both failed, check if user item is hidden anyway
    const userItem = page.getByTestId(`user-${username}`);
    const isHidden = await isHiddenSafely(userItem);
    if (isHidden) {
      return; // User item is hidden, that's good enough
    }
    throw error; // Neither event nor DOM, rethrow
  });
}

/**
 * Wait for a role to be assigned to a user using transition events.
 * 
 * @param page - Playwright page object
 * @param username - Username to wait for
 * @param role - Role that was assigned (optional, for verification)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForRoleAssigned(
  page: Page,
  username: string,
  role?: string,
  timeout: number = DEFAULT_EVENT_TIMEOUT
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ name, role, timeout, eventName }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventUsername = customEvent.detail?.username || "";
          const eventRole = (customEvent.detail?.role || "").trim().toLowerCase();
          const searchRole = role?.trim().toLowerCase();
          
          // Match username using matchesName pattern (exact or partial, case-insensitive)
          const usernameMatch = eventUsername && (() => {
            const event = (eventUsername || "").trim().toLowerCase();
            const search = (name || "").trim().toLowerCase();
            if (!event || !search) return false;
            if (event === search) return true;
            if (event.includes(search)) return true;
            if (search.includes(event)) return true;
            return false;
          })();
          
          // If role is specified, also match role
          const roleMatch = !searchRole || eventRole === searchRole;
          
          if (usernameMatch && roleMatch && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for role${role ? ` "${role}"` : ""} to be assigned to user "${name}" after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { name: username, role, timeout, eventName: ROLE_ASSIGNED_EVENT }
  );

  // Fallback: Wait for role badge to appear in DOM (only if role is specified)
  if (role) {
    const domPromise = (async () => {
      const roleBadge = page.getByTestId(`user-${username}`).getByText(role, { exact: false });
      await expect(roleBadge).toBeVisible({ timeout });
    })();

    // Wait for EITHER the event OR the DOM element
    await Promise.race([eventPromise, domPromise]);
  } else {
    // No specific DOM check available - rely on event
    await eventPromise;
  }
}

/**
 * Wait for a role to be revoked from a user using transition events.
 * 
 * @param page - Playwright page object
 * @param username - Username to wait for
 * @param role - Role that was revoked (optional, for verification)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForRoleRevoked(
  page: Page,
  username: string,
  role?: string,
  timeout: number = DEFAULT_EVENT_TIMEOUT
): Promise<void> {
  // Set up event listener first
  const eventPromise = page.evaluate(
    ({ name, role, timeout, eventName }) => {
      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const eventUsername = customEvent.detail?.username || "";
          const eventRole = (customEvent.detail?.role || "").trim().toLowerCase();
          const searchRole = role?.trim().toLowerCase();
          
          // Match username using matchesName pattern (exact or partial, case-insensitive)
          const usernameMatch = eventUsername && (() => {
            const event = (eventUsername || "").trim().toLowerCase();
            const search = (name || "").trim().toLowerCase();
            if (!event || !search) return false;
            if (event === search) return true;
            if (event.includes(search)) return true;
            if (search.includes(event)) return true;
            return false;
          })();
          
          // If role is specified, also match role
          const roleMatch = !searchRole || eventRole === searchRole;
          
          if (usernameMatch && roleMatch && !resolved) {
            resolved = true;
            clearTimeout(timer);
            window.removeEventListener(eventName, handler);
            resolve();
          }
        };

        window.addEventListener(eventName, handler);

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventName, handler);
            reject(new Error(`Timeout waiting for role${role ? ` "${role}"` : ""} to be revoked from user "${name}" after ${timeout}ms`));
          }
        }, timeout);
      });
    },
    { name: username, role, timeout, eventName: ROLE_REVOKED_EVENT }
  );

  // Fallback: Wait for role badge to disappear from DOM (only if role is specified)
  if (role) {
    const domPromise = (async () => {
      const roleBadge = page.getByTestId(`user-${username}`).getByText(role, { exact: false });
      await expect(roleBadge).not.toBeVisible({ timeout });
    })();

    // Wait for EITHER the event OR the DOM element
    await Promise.race([eventPromise, domPromise]);
  } else {
    // No specific DOM check available - rely on event
    await eventPromise;
  }
}

/**
 * Ensure a test user exists with specified roles.
 * Creates the user via API if it doesn't exist, or updates roles if they don't match.
 * Stores the username in page context for other steps to use.
 * 
 * @param page - Playwright page object
 * @param request - Playwright API request context
 * @param baseUsername - Base username (will be made unique per worker)
 * @param password - User password
 * @param roles - Array of role names
 * @param storageKey - Key to store username in page context (default: based on baseUsername)
 * @returns The unique username that was created/stored
 */
export async function ensureTestUser(
  page: Page,
  request: APIRequestContext,
  baseUsername: string,
  password: string,
  roles: string[],
  storageKey?: string
): Promise<string> {
  // Generate unique username per worker to avoid conflicts
  const uniqueUsername = getUniqueUsername(baseUsername);
  
  // Store the unique name in page context for other steps to use
  const key = storageKey || `__test${baseUsername.charAt(0).toUpperCase() + baseUsername.slice(1)}Username`;
  await page.evaluate(({ username, key }) => {
    (window as any)[key] = username;
  }, { username: uniqueUsername, key });
  
  // Ensure user exists with correct roles via API
  const api = createApiClient(request);
  await api.ensureUserExists(uniqueUsername, password, roles);
  
  return uniqueUsername;
}

/**
 * Get a stored test username from page context.
 * Falls back to generating a unique name if not stored.
 * 
 * @param page - Playwright page object
 * @param baseUsername - Base username (used for fallback generation)
 * @param storageKey - Key where username is stored (default: based on baseUsername)
 * @returns The stored or generated unique username
 */
export async function getStoredTestUsername(
  page: Page,
  baseUsername: string,
  storageKey?: string
): Promise<string> {
  const key = storageKey || `__test${baseUsername.charAt(0).toUpperCase() + baseUsername.slice(1)}Username`;
  try {
    const storedName = await page.evaluate((key) => {
      return (window as any)[key];
    }, key);
    if (storedName) {
      return storedName;
    }
  } catch {
    // Can't retrieve - fall back to unique name generation
  }
  // Fall back to generating unique name if not stored
  return getUniqueUsername(baseUsername);
}
