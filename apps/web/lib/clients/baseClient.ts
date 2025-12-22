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
