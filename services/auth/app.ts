import express, {
  Request as ExpressRequest,
  Response,
  NextFunction
} from "express";
import cors from "cors";
import { AuthService, AuthServiceConfig } from "./authService";
import { InMemoryUserStore, Role } from "./userStore";

export interface AppDependencies {
  userStore?: InMemoryUserStore;
  authConfig?: AuthServiceConfig;
}

type AuthedRequest = ExpressRequest & {
  auth?: {
    userId: string;
    roles: Role[];
  };
};

function bearerTokenFromHeader(headerValue?: string): string | null {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export function createApp(deps: AppDependencies = {}) {
  const userStore = deps.userStore ?? new InMemoryUserStore();
  const authConfig: AuthServiceConfig = deps.authConfig ?? {
    jwtSecret: process.env.AUTH_JWT_SECRET ?? "dev-secret",
    tokenExpiresInSeconds: 60 * 10
  };

  const authService = new AuthService(userStore, authConfig);

  const app = express();
  app.use(
    cors({
      origin: "https://localhost:3000"
    })
  );
  app.use(express.json());

  // Response logging middleware
  app.use((req: ExpressRequest, res: Response, next: NextFunction) => {
    const startTime = process.hrtime.bigint();
    const originalSend = res.send;
    const originalJson = res.json;
    
    const logResponse = () => {
      const service = "auth";
      const operation = req.method;
      const responseCode = res.statusCode;
      const requestedUrl = req.originalUrl || req.url;
      const endTime = process.hrtime.bigint();
      const responseTimeMs = Number(endTime - startTime) / 1_000_000; // Convert nanoseconds to milliseconds
      // Service color: cyan for auth
      const serviceColor = '\x1b[36m';
      // Response code color: green for 2xx (success), red for others
      const responseColor = responseCode >= 200 && responseCode < 300 ? '\x1b[32m' : '\x1b[31m';
      const resetCode = '\x1b[0m';
      // eslint-disable-next-line no-console
      console.log(`${serviceColor}${service}${resetCode} [${operation}] ${responseColor}${responseCode}${resetCode} [${requestedUrl}] [${responseTimeMs.toFixed(2)}ms]`);
    };
    
    res.send = function (body) {
      logResponse();
      return originalSend.call(this, body);
    };
    
    res.json = function (body) {
      logResponse();
      return originalJson.call(this, body);
    };
    
    next();
  });

  const authenticate =
    (requiredRole?: Role) =>
    (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const header = req.header("authorization");
        const token = bearerTokenFromHeader(header);
        if (!token) {
          return res.status(401).json({ error: "Missing bearer token" });
        }
        const payload = authService.verifyToken(token);
        req.auth = { userId: payload.sub, roles: payload.roles };
        if (requiredRole && !payload.roles.includes(requiredRole)) {
          return res.status(403).json({ error: "Forbidden" });
        }
        next();
      } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
      }
    };

  // authenticate() without requiredRole allows any authenticated user

  // GET /users – list all users (admin-only)
  app.get("/users", authenticate("admin"), (req: AuthedRequest, res: Response) => {
    try {
      const users = userStore.listUsers();
      return res.status(200).json({ users });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  });

  // GET /users/:username – get user details (self or admin)
  app.get(
    "/users/:username",
    authenticate(),
    (req: AuthedRequest, res: Response) => {
      const { username } = req.params;
      const isSelf = req.auth!.userId === username;
      const isAdmin = req.auth!.roles.includes("admin");

      if (!isSelf && !isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      try {
        const user = userStore.getUser(username);
        if (!user) {
          return res.status(404).json({ error: `User '${username}' not found` });
        }
        return res.status(200).json({ user });
      } catch (err) {
        return res.status(500).json({ error: (err as Error).message });
      }
    }
  );

  // POST /users – create a new user (admin-only)
  app.post("/users", authenticate("admin"), async (req: AuthedRequest, res: Response) => {
    const { username, roles, password } = req.body as {
      username?: string;
      roles?: Role[];
      password?: string;
    };
    if (!username) {
      return res.status(400).json({ error: "username is required" });
    }
    if (!password) {
      return res.status(400).json({ error: "password is required" });
    }
    try {
      const passwordHash = await authService.hashPassword(password);
      const user = userStore.createUser(username, roles ?? [], passwordHash);
      return res.status(201).json({ user });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  });

  // DELETE /users/:username – delete user (admin-only)
  app.delete(
    "/users/:username",
    authenticate("admin"),
    (req: AuthedRequest, res: Response) => {
      const { username } = req.params;
      try {
        userStore.removeUser(username);
        return res.status(200).json({ message: `User '${username}' deleted` });
      } catch (err) {
        const message = (err as Error).message;
        if (message.includes("not found")) {
          return res.status(404).json({ error: message });
        }
        return res.status(500).json({ error: message });
      }
    }
  );

  // POST /auth/login – authenticate user and issue token
  app.post("/auth/login", async (req: ExpressRequest, res: Response) => {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username) {
      return res.status(400).json({ error: "username is required" });
    }
    if (!password) {
      return res.status(400).json({ error: "password is required" });
    }
    try {
      const { user, token } = await authService.login(username, password);
      return res.status(200).json({ user, token });
    } catch (err) {
      return res.status(401).json({ error: (err as Error).message });
    }
  });

  // GET /users/:username/roles – get user's roles (self or admin)
  app.get(
    "/users/:username/roles",
    authenticate(),
    (req: AuthedRequest, res: Response) => {
      const { username } = req.params;
      const isSelf = req.auth!.userId === username;
      const isAdmin = req.auth!.roles.includes("admin");

      if (!isSelf && !isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      try {
        const user = userStore.getUser(username);
        if (!user) {
          return res.status(404).json({ error: `User '${username}' not found` });
        }
        return res.status(200).json({ roles: user.roles });
      } catch (err) {
        return res.status(500).json({ error: (err as Error).message });
      }
    }
  );

  // POST /users/:username/roles – assign roles to a user, admin-only
  app.post(
    "/users/:username/roles",
    authenticate("admin"),
    (req: AuthedRequest, res: Response) => {
      const { username } = req.params;
      const { roles } = req.body as { roles?: Role[] };
      if (!roles || !Array.isArray(roles) || roles.length === 0) {
        return res.status(400).json({ error: "roles array is required" });
      }
      try {
        const updated = authService.assignRolesAsAdmin(
          req.auth!.userId,
          username,
          roles
        );
        return res.status(200).json({ user: updated });
      } catch (err) {
        const message = (err as Error).message;
        if (message === "Only admins can assign roles") {
          return res.status(403).json({ error: message });
        }
        if (message.includes("not found")) {
          return res.status(404).json({ error: message });
        }
        return res.status(400).json({ error: message });
      }
    }
  );

  // PUT /users/:username/roles – replace all roles (admin-only)
  app.put(
    "/users/:username/roles",
    authenticate("admin"),
    (req: AuthedRequest, res: Response) => {
      const { username } = req.params;
      const { roles } = req.body as { roles?: Role[] };
      if (!roles || !Array.isArray(roles)) {
        return res.status(400).json({ error: "roles array is required" });
      }
      try {
        const updated = userStore.setRoles(username, roles);
        return res.status(200).json({ user: updated });
      } catch (err) {
        const message = (err as Error).message;
        if (message.includes("not found")) {
          return res.status(404).json({ error: message });
        }
        return res.status(400).json({ error: message });
      }
    }
  );

  // DELETE /users/:username/roles/:role – revoke a specific role (admin-only)
  app.delete(
    "/users/:username/roles/:role",
    authenticate("admin"),
    (req: AuthedRequest, res: Response) => {
      const { username, role } = req.params;
      if (!role || !["admin", "gm", "player"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      try {
        const updated = userStore.revokeRole(username, role as Role);
        return res.status(200).json({ user: updated });
      } catch (err) {
        const message = (err as Error).message;
        if (message.includes("not found")) {
          return res.status(404).json({ error: message });
        }
        return res.status(400).json({ error: message });
      }
    }
  );

  // GET /gm-only – GM-only protected endpoint
  app.get(
    "/gm-only",
    authenticate("gm"),
    (req: AuthedRequest, res: Response) => {
      return res.status(200).json({ message: "GM content" });
    }
  );

  // GET /admin-only – admin-only protected endpoint
  app.get(
    "/admin-only",
    authenticate("admin"),
    (req: AuthedRequest, res: Response) => {
      return res.status(200).json({ message: "Admin content" });
    }
  );

  // PATCH /users/:username/password – change password (self or admin)
  app.patch(
    "/users/:username/password",
    authenticate(),
    async (req: AuthedRequest, res: Response) => {
      const { username } = req.params;
      const { password } = req.body as { password?: string };
      const isSelf = req.auth!.userId === username;
      const isAdmin = req.auth!.roles.includes("admin");

      if (!isSelf && !isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (!password) {
        return res.status(400).json({ error: "password is required" });
      }

      try {
        const passwordHash = await authService.hashPassword(password);
        const updated = userStore.updatePassword(username, passwordHash);
        return res.status(200).json({ user: updated });
      } catch (err) {
        const message = (err as Error).message;
        if (message.includes("not found")) {
          return res.status(404).json({ error: message });
        }
        return res.status(400).json({ error: message });
      }
    }
  );

  return app;
}


