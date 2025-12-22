import { apiRequest, get, post, postVoid, patch, put, del, delWithResponse } from "./baseClient";
import { serviceUrls } from "../config/services";

export interface LoginResponse {
  user: { username: string; roles: string[] };
  token: string;
}

export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  // Login returns response directly, not nested
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
  return get<User[]>(`${serviceUrls.auth}/users`, "users", { token });
}

export async function getUser(
  token: string,
  username: string
): Promise<User> {
  return get<User>(`${serviceUrls.auth}/users/${username}`, "user", { token });
}

export async function createUser(
  token: string,
  username: string,
  password: string,
  roles: string[] = []
): Promise<User> {
  return post<User>(
    `${serviceUrls.auth}/users`,
    "user",
    { username, password, roles },
    { token }
  );
}

export async function deleteUser(
  token: string,
  username: string
): Promise<void> {
  await del(`${serviceUrls.auth}/users/${username}`, { token });
}

export async function assignRoles(
  actingToken: string,
  username: string,
  roles: string[]
): Promise<void> {
  await postVoid(
    `${serviceUrls.auth}/users/${username}/roles`,
    { roles },
    { token: actingToken }
  );
}

export async function revokeRole(
  actingToken: string,
  username: string,
  role: string
): Promise<User> {
  return delWithResponse<User>(
    `${serviceUrls.auth}/users/${username}/roles/${role}`,
    "user",
    { token: actingToken }
  );
}

export async function setRoles(
  actingToken: string,
  username: string,
  roles: string[]
): Promise<User> {
  return put<User>(
    `${serviceUrls.auth}/users/${username}/roles`,
    "user",
    { roles },
    { token: actingToken }
  );
}


