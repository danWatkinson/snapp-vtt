import {
  Request as ExpressRequest
} from "express";
import { createServiceApp } from "../../../packages/express-app";
import { authenticate, AuthedRequest, requireSelfOrAdmin } from "../../../packages/auth-middleware";
import { createGetRoute, createDeleteRoute, createPatchRoute, createPostRoute, createPutRoute, requireFields } from "../../../packages/express-routes";
import { AuthService, AuthServiceConfig } from "./authService";
import { InMemoryUserStore, Role } from "./userStore";
import { auth as authConfig } from "../../../packages/config";

export interface AppDependencies {
  userStore?: InMemoryUserStore;
  authConfig?: AuthServiceConfig;
}

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
  app.post("/bootstrap/admin", createPostRoute(
    async (req: ExpressRequest) => {
      const users = userStore.listUsers();
      if (users.length > 0) {
        throw new Error("Bootstrap only available when no users exist");
      }

      const { username = "admin", password = "admin123", roles = ["admin"] } = req.body as {
        username?: string;
        password?: string;
        roles?: Role[];
      };

      const passwordHash = await authService.hashPassword(password);
      return userStore.createUser(username, roles, passwordHash);
    },
    { responseProperty: "user" }
  ));

  // Use shared authenticate middleware from @snapp/auth-middleware
  // It handles JWT verification and role checking (including admin bypass)

  // GET /users – list all users (admin-only)
  app.get("/users", authenticate("admin"), createGetRoute(
    () => userStore.listUsers(),
    { responseProperty: "users" }
  ));

  // GET /users/:username – get user details (self or admin)
  app.get(
    "/users/:username",
    authenticate(),
    createGetRoute(
      (req: AuthedRequest) => {
        const { username } = req.params;
        requireSelfOrAdmin(req, username);
        const user = userStore.getUser(username);
        if (!user) {
          throw new Error(`User '${username}' not found`);
        }
        return user;
      },
      { responseProperty: "user" }
    )
  );

  // POST /users – create a new user (admin-only)
  app.post("/users", authenticate("admin"), createPostRoute(
    async (req: AuthedRequest) => {
      requireFields(req, ["username", "password"]);
      const { username, roles, password } = req.body as {
        username: string;
        roles?: Role[];
        password: string;
      };
      const passwordHash = await authService.hashPassword(password);
      return userStore.createUser(username, roles ?? [], passwordHash);
    },
    { responseProperty: "user" }
  ));

  // DELETE /users/:username – delete user (admin-only)
  app.delete(
    "/users/:username",
    authenticate("admin"),
    createDeleteRoute(
      (req: AuthedRequest) => {
        const { username } = req.params;
        userStore.removeUser(username);
        return { message: `User '${username}' deleted` };
      }
    )
  );

  // POST /auth/login – authenticate user and issue token
  app.post("/auth/login", createPostRoute(
    async (req: ExpressRequest) => {
      requireFields(req, ["username", "password"]);
      const { username, password } = req.body as { username: string; password: string };
      const { user, token } = await authService.login(username, password);
      return { user, token };
    },
    { statusCode: 200, responseProperty: undefined }
  ));

  // GET /users/:username/roles – get user's roles (self or admin)
  app.get(
    "/users/:username/roles",
    authenticate(),
    createGetRoute(
      (req: AuthedRequest) => {
        const { username } = req.params;
        requireSelfOrAdmin(req, username);
        const user = userStore.getUser(username);
        if (!user) {
          throw new Error(`User '${username}' not found`);
        }
        return { roles: user.roles };
      },
      { responseProperty: "roles" }
    )
  );

  // POST /users/:username/roles – assign roles to a user, admin-only
  app.post(
    "/users/:username/roles",
    authenticate("admin"),
    createPostRoute(
      (req: AuthedRequest) => {
        const { username } = req.params;
        const { roles } = req.body as { roles?: Role[] };
        if (!roles || !Array.isArray(roles) || roles.length === 0) {
          throw new Error("roles array is required");
        }
        return authService.assignRolesAsAdmin(
          req.auth!.userId,
          username,
          roles
        );
      },
      { responseProperty: "user", statusCode: 200 }
    )
  );

  // PUT /users/:username/roles – replace all roles (admin-only)
  app.put(
    "/users/:username/roles",
    authenticate("admin"),
    createPutRoute(
      (req: AuthedRequest) => {
        const { username } = req.params;
        const { roles } = req.body as { roles?: Role[] };
        if (!roles || !Array.isArray(roles)) {
          throw new Error("roles array is required");
        }
        return userStore.setRoles(username, roles);
      },
      { responseProperty: "user" }
    )
  );

  // DELETE /users/:username/roles/:role – revoke a specific role (admin-only)
  app.delete(
    "/users/:username/roles/:role",
    authenticate("admin"),
    createDeleteRoute(
      (req: AuthedRequest) => {
        const { username, role } = req.params;
        if (!role || !["admin", "gm", "player"].includes(role)) {
          throw new Error("Invalid role");
        }
        const updated = userStore.revokeRole(username, role as Role);
        return { user: updated };
      },
      { responseProperty: "user" }
    )
  );

  // GET /gm-only – GM-only protected endpoint
  app.get(
    "/gm-only",
    authenticate("gm"),
    createGetRoute(
      () => ({ message: "GM content" })
    )
  );

  // GET /admin-only – admin-only protected endpoint
  app.get(
    "/admin-only",
    authenticate("admin"),
    createGetRoute(
      () => ({ message: "Admin content" })
    )
  );

  // PATCH /users/:username/password – change password (self or admin)
  app.patch(
    "/users/:username/password",
    authenticate(),
    createPatchRoute(
      async (req: AuthedRequest) => {
        const { username } = req.params;
        requireSelfOrAdmin(req, username);
        requireFields(req, ["password"]);
        const { password } = req.body as { password: string };
        const passwordHash = await authService.hashPassword(password);
        return userStore.updatePassword(username, passwordHash);
      },
      { responseProperty: "user" }
    )
  );
    }
  });

  return app;
}


