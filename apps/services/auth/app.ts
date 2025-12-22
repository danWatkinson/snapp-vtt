import {
  Request as ExpressRequest,
  Response
} from "express";
import { createServiceApp } from "../../../packages/express-app";
import { authenticate } from "../../../packages/auth-middleware";
import { AuthService, AuthServiceConfig } from "./authService";
import { InMemoryUserStore, Role } from "./userStore";
import { auth as authConfig } from "../../../packages/config";

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

export function createApp(deps: AppDependencies = {}) {
  const userStore = deps.userStore ?? new InMemoryUserStore();
  const serviceConfig: AuthServiceConfig = deps.authConfig ?? {
    jwtSecret: authConfig.jwtSecret,
    tokenExpiresInSeconds: authConfig.tokenExpiresInSeconds
  };

  const authService = new AuthService(userStore, serviceConfig);

  const app = createServiceApp({
    serviceName: "auth",
    routes: (app) => {
      // Bootstrap endpoint for tests - allows creating first admin user without auth
      // Only available when no users exist (for test/bootstrap scenarios)
      app.post("/bootstrap/admin", async (req: ExpressRequest, res: Response) => {
    const users = userStore.listUsers();
    if (users.length > 0) {
      return res.status(403).json({ error: "Bootstrap only available when no users exist" });
    }

    const { username = "admin", password = "admin123", roles = ["admin"] } = req.body as {
      username?: string;
      password?: string;
      roles?: Role[];
    };

    try {
      const passwordHash = await authService.hashPassword(password);
      const user = userStore.createUser(username, roles, passwordHash);
      return res.status(201).json({ user });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  });

  // Use shared authenticate middleware from @snapp/auth-middleware
  // It handles JWT verification and role checking (including admin bypass)

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
        /* c8 ignore next */ // defensive 500 fallback; business logic paths covered in tests
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
        /* c8 ignore next */ // defensive 500 fallback; primary error paths tested via overrides
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
        /* c8 ignore next */ // generic 400 fallback; specific admin/not-found paths covered
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
        /* c8 ignore next */ // generic 400 fallback; not-found path explicitly tested
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
        /* c8 ignore next */ // generic 400 fallback; invalid-role and not-found paths tested
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
        /* c8 ignore next */ // generic 400 fallback for unexpected store errors
        return res.status(400).json({ error: message });
      }
    }
  );
    }
  });

  return app;
}


