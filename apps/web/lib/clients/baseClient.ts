import { AuthenticationError, isAuthenticationError } from "../auth/authErrors";

export interface ApiRequestOptions {
  method?: string;
  token?: string;
  body?: unknown;
  headers?: HeadersInit;
}

/**
 * Base API request function that handles:
 * - Token authentication
 * - Error handling (authentication vs regular errors)
 * - Response parsing
 * - Network error handling
 * 
 * @param url - Full URL to request
 * @param options - Request options
 * @returns Parsed JSON response
 * @throws AuthenticationError for 401/403 responses
 * @throws Error for other failures
 */
export async function apiRequest<T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = "GET", token, body, headers: additionalHeaders = {} } = options;

  const headers: HeadersInit = {
    ...additionalHeaders
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (err) {
    // Network error - fetch failed completely (CORS, certificate, network unreachable)
    const error = err as Error;
    const networkError = new Error(`Network error: ${error.message}`);
    (networkError as any).isNetworkError = true;
    throw networkError;
  }

  if (!res.ok) {
    if (isAuthenticationError(res)) {
      throw new AuthenticationError("Authentication failed", res.status);
    }
    const responseBody = await res.json().catch(() => ({}));
    throw new Error((responseBody as { error?: string }).error ?? "Request failed");
  }

  return (await res.json()) as T;
}

/**
 * Helper to extract a nested property from API response
 * Useful for responses like { users: [...] } or { world: {...} }
 */
export function extractProperty<T>(
  data: Record<string, unknown>,
  property: string
): T {
  if (!(property in data)) {
    throw new Error(`Expected property '${property}' in response`);
  }
  return data[property] as T;
}

/**
 * Helper to make a GET request and extract a nested property from the response.
 * Reduces boilerplate for common GET operations.
 */
export async function get<T>(
  url: string,
  property: string,
  options: Omit<ApiRequestOptions, "method"> = {}
): Promise<T> {
  const data = await apiRequest<Record<string, unknown>>(url, {
    ...options,
    method: "GET"
  });
  return extractProperty<T>(data, property);
}

/**
 * Helper to make a POST request and extract a nested property from the response.
 * Reduces boilerplate for common POST operations.
 */
export async function post<T>(
  url: string,
  property: string,
  body: unknown,
  options: Omit<ApiRequestOptions, "method" | "body"> = {}
): Promise<T> {
  const data = await apiRequest<Record<string, unknown>>(url, {
    ...options,
    method: "POST",
    body
  });
  return extractProperty<T>(data, property);
}

/**
 * Helper to make a POST request that doesn't return a nested property.
 * Useful for operations that return the response directly or have no body.
 */
export async function postVoid(
  url: string,
  body: unknown,
  options: Omit<ApiRequestOptions, "method" | "body"> = {}
): Promise<void> {
  await apiRequest(url, {
    ...options,
    method: "POST",
    body
  });
}

/**
 * Helper to make a PATCH request and extract a nested property from the response.
 */
export async function patch<T>(
  url: string,
  property: string,
  body: unknown,
  options: Omit<ApiRequestOptions, "method" | "body"> = {}
): Promise<T> {
  const data = await apiRequest<Record<string, unknown>>(url, {
    ...options,
    method: "PATCH",
    body
  });
  return extractProperty<T>(data, property);
}

/**
 * Helper to make a PUT request and extract a nested property from the response.
 */
export async function put<T>(
  url: string,
  property: string,
  body: unknown,
  options: Omit<ApiRequestOptions, "method" | "body"> = {}
): Promise<T> {
  const data = await apiRequest<Record<string, unknown>>(url, {
    ...options,
    method: "PUT",
    body
  });
  return extractProperty<T>(data, property);
}

/**
 * Helper to make a DELETE request.
 * Returns void by default (for operations that don't return data).
 */
export async function del(
  url: string,
  options: Omit<ApiRequestOptions, "method"> = {}
): Promise<void> {
  await apiRequest(url, {
    ...options,
    method: "DELETE"
  });
}

/**
 * Helper to make a DELETE request and extract a nested property from the response.
 * Useful for DELETE operations that return the deleted or updated resource.
 */
export async function delWithResponse<T>(
  url: string,
  property: string,
  options: Omit<ApiRequestOptions, "method"> = {}
): Promise<T> {
  const data = await apiRequest<Record<string, unknown>>(url, {
    ...options,
    method: "DELETE"
  });
  return extractProperty<T>(data, property);
}
