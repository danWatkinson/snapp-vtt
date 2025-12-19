import { Page, expect } from "@playwright/test";
import {
  USER_CREATED_EVENT,
  USER_DELETED_EVENT,
  ROLE_ASSIGNED_EVENT,
  ROLE_REVOKED_EVENT
} from "../../../lib/auth/authEvents";
import { DEFAULT_EVENT_TIMEOUT } from "./constants";
import { waitForEventWithNameFilter, matchesName, isVisibleSafely, isHiddenSafely } from "./utils";

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
