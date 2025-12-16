import { Request, Response, NextFunction } from "express";
import { TokenVerifier } from "./tokenVerifier";
import { Role, AuthenticatedRequest } from "./types";

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

// Convenience function that creates middleware with optional role requirement
export function authenticate(requiredRole?: Role) {
  const jwtSecret =
    process.env.AUTH_JWT_SECRET ?? process.env.JWT_SECRET ?? "dev-secret";
  return createAuthenticateMiddleware({ jwtSecret, requiredRole });
}

