import { apiRequest, extractProperty } from "./baseClient";
import { serviceUrls } from "../config/services";

export interface LoginResponse {
  user: { username: string; roles: string[] };
  token: string;
}

export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(`${serviceUrls.auth}/auth/login`, {
    method: "POST",
    body: { username, password }
  });
}

export interface User {
  id: string;
  username: string;
  roles: string[];
}

export async function listUsers(token: string): Promise<User[]> {
  const data = await apiRequest<{ users: User[] }>(`${serviceUrls.auth}/users`, {
    method: "GET",
    token
  });
  return extractProperty(data, "users");
}

export async function getUser(
  token: string,
  username: string
): Promise<User> {
  const data = await apiRequest<{ user: User }>(
    `${serviceUrls.auth}/users/${username}`,
    {
      method: "GET",
      token
    }
  );
  return extractProperty(data, "user");
}

export async function createUser(
  token: string,
  username: string,
  password: string,
  roles: string[] = []
): Promise<User> {
  const data = await apiRequest<{ user: User }>(`${serviceUrls.auth}/users`, {
    method: "POST",
    token,
    body: { username, password, roles }
  });
  return extractProperty(data, "user");
}

export async function deleteUser(
  token: string,
  username: string
): Promise<void> {
  await apiRequest(`${serviceUrls.auth}/users/${username}`, {
    method: "DELETE",
    token
  });
}

export async function assignRoles(
  actingToken: string,
  username: string,
  roles: string[]
) {
  return apiRequest(`${serviceUrls.auth}/users/${username}/roles`, {
    method: "POST",
    token: actingToken,
    body: { roles }
  });
}

export async function revokeRole(
  actingToken: string,
  username: string,
  role: string
): Promise<User> {
  const data = await apiRequest<{ user: User }>(
    `${serviceUrls.auth}/users/${username}/roles/${role}`,
    {
      method: "DELETE",
      token: actingToken
    }
  );
  return extractProperty(data, "user");
}

export async function setRoles(
  actingToken: string,
  username: string,
  roles: string[]
): Promise<User> {
  const data = await apiRequest<{ user: User }>(
    `${serviceUrls.auth}/users/${username}/roles`,
    {
      method: "PUT",
      token: actingToken,
      body: { roles }
    }
  );
  return extractProperty(data, "user");
}


