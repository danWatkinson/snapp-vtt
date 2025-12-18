export interface LoginResponse {
  user: { username: string; roles: string[] };
  token: string;
}

const AUTH_SERVICE_URL =
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ?? "https://localhost:4400";

export async function login(username: string, password: string): Promise<LoginResponse> {
  let res: Response;
  try {
    res = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  } catch (err) {
    // Network error - fetch failed completely (CORS, certificate, network unreachable)
    const error = err as Error;
    const networkError = new Error(`Network error: ${error.message}`);
    (networkError as any).isNetworkError = true;
    throw networkError;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // This is an authentication/authorization error, not a network error
    throw new Error(body.error ?? "Login failed");
  }

  return (await res.json()) as LoginResponse;
}

export interface User {
  id: string;
  username: string;
  roles: string[];
}

import { AuthenticationError, isAuthenticationError } from "../auth/authErrors";

export async function listUsers(token: string): Promise<User[]> {
  const res = await fetch(`${AUTH_SERVICE_URL}/users`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    if (isAuthenticationError(res)) {
      throw new AuthenticationError("Authentication failed", res.status);
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to list users");
  }

  const data = await res.json();
  return data.users;
}

export async function getUser(
  token: string,
  username: string
): Promise<User> {
  const res = await fetch(`${AUTH_SERVICE_URL}/users/${username}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    if (isAuthenticationError(res)) {
      throw new AuthenticationError("Authentication failed", res.status);
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to get user");
  }

  const data = await res.json();
  return data.user;
}

export async function createUser(
  token: string,
  username: string,
  password: string,
  roles: string[] = []
): Promise<User> {
  const res = await fetch(`${AUTH_SERVICE_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ username, password, roles })
  });

  if (!res.ok) {
    if (isAuthenticationError(res)) {
      throw new AuthenticationError("Authentication failed", res.status);
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to create user");
  }

  const data = await res.json();
  return data.user;
}

export async function deleteUser(
  token: string,
  username: string
): Promise<void> {
  const res = await fetch(`${AUTH_SERVICE_URL}/users/${username}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    if (isAuthenticationError(res)) {
      throw new AuthenticationError("Authentication failed", res.status);
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to delete user");
  }
}

export async function assignRoles(
  actingToken: string,
  username: string,
  roles: string[]
) {
  const res = await fetch(`${AUTH_SERVICE_URL}/users/${username}/roles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${actingToken}`
    },
    body: JSON.stringify({ roles })
  });

  if (!res.ok) {
    if (isAuthenticationError(res)) {
      throw new AuthenticationError("Authentication failed", res.status);
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Role assignment failed");
  }

  return res.json();
}

export async function revokeRole(
  actingToken: string,
  username: string,
  role: string
): Promise<User> {
  const res = await fetch(
    `${AUTH_SERVICE_URL}/users/${username}/roles/${role}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${actingToken}`
      }
    }
  );

  if (!res.ok) {
    if (isAuthenticationError(res)) {
      throw new AuthenticationError("Authentication failed", res.status);
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to revoke role");
  }

  const data = await res.json();
  return data.user;
}

export async function setRoles(
  actingToken: string,
  username: string,
  roles: string[]
): Promise<User> {
  const res = await fetch(`${AUTH_SERVICE_URL}/users/${username}/roles`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${actingToken}`
    },
    body: JSON.stringify({ roles })
  });

  if (!res.ok) {
    if (isAuthenticationError(res)) {
      throw new AuthenticationError("Authentication failed", res.status);
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to set roles");
  }

  const data = await res.json();
  return data.user;
}


