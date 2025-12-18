/**
 * Custom error class for authentication errors (401/403)
 * This allows us to detect and handle auth errors specially
 */
export class AuthenticationError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Check if a fetch Response indicates an authentication error
 */
export function isAuthenticationError(response: Response): boolean {
  return response.status === 401 || response.status === 403;
}

/**
 * Check if an Error is an AuthenticationError
 */
export function isAuthError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError || 
    (error instanceof Error && error.name === "AuthenticationError");
}
