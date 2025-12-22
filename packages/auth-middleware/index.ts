import { Request, Response, NextFunction } from "express";
import { TokenVerifier } from "./tokenVerifier";
import { Role, AuthenticatedRequest } from "./types";

// Export type for use in route handlers
export type AuthedRequest = Request & AuthenticatedRequest;

function bearerTokenFromHeader(headerValue?: string): string | null {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export interface AuthenticateMiddlewareOptions {
  jwtSecret: string;
  requiredRole?: Role;
}

export function createAuthenticateMiddleware(
  options: AuthenticateMiddlewareOptions
) {
  const verifier = new TokenVerifier({ jwtSecret: options.jwtSecret });
  const requiredRole = options.requiredRole;

  return (
    req: Request & Partial<AuthenticatedRequest>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const header = req.header("authorization");
      const token = bearerTokenFromHeader(header);
      if (!token) {
        return res.status(401).json({ error: "Missing bearer token" });
      }
      const payload = verifier.verifyToken(token);
      req.auth = { userId: payload.sub, roles: payload.roles };
      if (requiredRole) {
        // Admin has all permissions, so check for admin OR required role
        if (!payload.roles.includes("admin") && !payload.roles.includes(requiredRole)) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}

import { auth } from "../config";

// Convenience function that creates middleware with optional role requirement
export function authenticate(requiredRole?: Role) {
  return createAuthenticateMiddleware({ jwtSecret: auth.jwtSecret, requiredRole });
}

/**
 * Checks if the authenticated user is either the target user (self) or an admin.
 * Useful for routes that allow users to access their own resources or admins to access any resource.
 * 
 * @param req - Authenticated request
 * @param targetUserId - The user ID being accessed
 * @returns True if user is self or admin, false otherwise
 */
export function isSelfOrAdmin(req: AuthedRequest, targetUserId: string): boolean {
  if (!req.auth) {
    return false;
  }
  const isSelf = req.auth.userId === targetUserId;
  const isAdmin = req.auth.roles.includes("admin");
  return isSelf || isAdmin;
}

/**
 * Throws an error if the user is not self or admin.
 * Use this in route handlers to enforce self/admin authorization.
 * 
 * @param req - Authenticated request
 * @param targetUserId - The user ID being accessed
 * @throws Error with "Forbidden" message if not authorized
 */
export function requireSelfOrAdmin(req: AuthedRequest, targetUserId: string): void {
  if (!isSelfOrAdmin(req, targetUserId)) {
    throw new Error("Forbidden");
  }
}

