## Review of 0003 – Authentication, Roles, and Token-Based Authorisation

**Date**: 2025-12-17  
**Scope**: Codebase at `main` compared against `docs/adr/0003-auth-and-roles.md`.

---

### 1. Identity model

- **ADR rule**:
  - Each user has:
    - A stable unique identifier (e.g. `userId`).
    - A username (e.g. `"alice"`, `"admin"`).
    - Zero or more roles (e.g. `["admin"]`, `["gm"]`).
- **Status**: Compliant
- **Evidence**:
  - Auth service user model is defined in `InMemoryUserStore`:
    - `User` shape:
      - `id: string`
      - `username: string`
      - `roles: Role[]`
      - `passwordHash?: string`
    - `Role` is a string union: `"admin" | "gm | "player"` (covers current roles as simple strings).
    - `id` is currently set equal to `username` on creation:
      - `id: username` (stable and unique within this service).
  - User store operations:
    - `createUser(username, roles, passwordHash)`:
      - Enforces uniqueness by username.
      - Copies roles into the `roles` array.
    - `getUser(username)`, `listUsers()`, `removeUser(username)`, `setRoles(username, roles)`, `revokeRole(username, role)`, `updatePassword(username, passwordHash)`:
      - All operate on the `User` model and maintain `id`, `username`, and `roles` together.
  - The UI and E2E tests consistently refer to users by `username` (e.g. `"admin"`, `"alice"`, `"bob"`), matching the ADR’s identity model.
- **Notes / trade-offs**:
  - Using `username` as the `id` is acceptable for this phase; if/when a separate immutable `userId` is introduced, it will be straightforward to extend the model while still complying with the ADR.
- **Actions**:
  - [ ] If/when a separate `userId` is needed (e.g. for username changes), extend the `User` model to generate/track a distinct `id`, and update token `sub` accordingly.

---

### 2. Roles and role management

- **ADR rules**:
  - Roles are represented as simple strings.
  - Role assignments are stored server-side in a dedicated user/role service.
  - Only users with the `"admin"` role may assign or revoke roles for other users.
- **Status**: Compliant
- **Evidence**:
  - **Role representation**:
    - `Role` is defined as a string union: `"admin" | "gm" | "player"`.
    - The system uses simple string roles everywhere (AuthService, user store, HTTP API, E2E tests).
  - **Server-side storage of role assignments**:
    - Roles are persisted in the auth service’s `InMemoryUserStore`:
      - `roles: Role[]` is stored for each user.
      - `assignRoles`, `setRoles`, and `revokeRole` mutate roles on the server-side store.
    - Role assignments are not cached in other services; world and campaign services rely on the token’s `roles` for authorisation.
  - **Admin-only role changes**:
    - `AuthService.assignRolesAsAdmin(actingUsername, targetUsername, roles)`:
      - Fetches acting user from `userStore`.
      - Throws `"Only admins can assign roles"` if `acting.roles` does not include `"admin"`.
      - Delegates to `userStore.assignRoles` for the target user.
    - HTTP API:
      - `POST /users/:username/roles` (admin-only):
        - Protected by `authenticate("admin")` middleware.
        - Uses `authService.assignRolesAsAdmin(req.auth!.userId, username, roles)`.
      - `PUT /users/:username/roles` (replace all roles, admin-only):
        - Protected by `authenticate("admin")`.
        - Uses `userStore.setRoles(username, roles)`.
      - `DELETE /users/:username/roles/:role` (revoke a specific role, admin-only):
        - Protected by `authenticate("admin")`.
        - Validates `role` against `"admin" | "gm" | "player"`.
        - Uses `userStore.revokeRole(username, role)`.
    - E2E tests:
      - `auth-roles.feature` + `auth-roles.steps.ts`:
        - Drive the UI to ensure that:
          - Admin assigns `gm` to `"alice"`.
          - JWTs and protected endpoints (`/gm-only`, `/admin-only`) behave as expected.
      - `users-revoke-role.feature` + steps:
        - Drive revoking `gm` from `"alice"` through the UI and assert updated roles.
- **Notes / trade-offs**:
  - The role set is currently hard-coded; this is acceptable for early-stage ADRs but may need to be made extensible later.
  - The `"admin"` role is consistently enforced both at the HTTP layer and in service logic.
- **Actions**:
  - [ ] If/when new roles are introduced, document them in ADR 0003 (or a follow-up ADR) to avoid ad-hoc names.
  - [ ] Consider centralising role constants (e.g. a shared `roles.ts`) if the set grows.

---

### 3. Token-based authentication (JWT)

- **ADR rules**:
  - The system issues **access tokens** to authenticated users.
  - Tokens contain, at minimum:
    - `sub`: the user identifier.
    - `roles`: the list of roles effective at the time of token issuance.
  - Tokens are signed (e.g. using JWT with a shared secret) so that services can validate them without central coordination.
- **Status**: Compliant
- **Evidence**:
  - **Token contents and issuance**:
    - `AuthService.login(username, password)`:
      - Validates credentials by comparing the provided password with the stored `passwordHash` via `bcrypt.compare`.
      - Builds token payload:
        - `sub: existing.id` (currently the username).
        - `roles: existing.roles` (current list of roles).
      - Signs a JWT:
        - `jwt.sign(payload, this.config.jwtSecret, { expiresIn: this.config.tokenExpiresInSeconds })`.
      - Returns `{ user, token }` to callers.
  - **Token verification**:
    - `AuthService.verifyToken(token)`:
      - Uses `jwt.verify(token, this.config.jwtSecret)`.
      - Extracts and returns `{ sub, roles }` from the decoded payload.
    - `authenticate(requiredRole?)` Express middleware in `app.ts`:
      - Reads `Authorization: Bearer <token>`.
      - Invokes `authService.verifyToken`.
      - Populates `req.auth = { userId: payload.sub, roles: payload.roles }`.
      - If `requiredRole` is provided and not in `payload.roles`, responds with `403 Forbidden`.
  - **UI and E2E validation**:
    - `auth-roles.feature` and its steps:
      - Decode the JWT using `jsonwebtoken` in the tests to assert that:
        - `sub` is the expected username (e.g. `"alice"`).
        - `roles` reflects the updated role set after assignment.
      - Use tokens to call GM-only and admin-only endpoints to validate server-side enforcement.
- **Notes / trade-offs**:
  - The secret (`AUTH_JWT_SECRET`) is configurable via environment; default `"dev-secret"` is appropriate for local development but should be overridden in production.
  - Tokens currently contain only `sub` and `roles`, in line with ADR requirements; additional fields (e.g. `iat`, `exp`) are implicitly handled by `jsonwebtoken`.
- **Actions**:
  - [ ] For production, ensure `AUTH_JWT_SECRET` is managed via secure configuration (e.g. environment secrets) and never checked into source control.

---

### 4. Updating permissions in (near) realtime

- **ADR rules**:
  - When an admin changes a user's roles:
    - The change is persisted in the user/role store.
    - Newly issued tokens will immediately reflect the updated role set.
  - To avoid stale permissions:
    - Either tokens are short-lived and refreshed regularly, or
    - Sensitive operations re-check current roles from the user/role service.
- **Status**: Partially compliant (short-lived tokens in place; no cross-service role re-checks yet)
- **Evidence**:
  - **Persisting role changes**:
    - Role updates are applied to `InMemoryUserStore` via `assignRoles`, `setRoles`, and `revokeRole`.
    - E2E flows (`auth-roles.feature`, `users-revoke-role.feature`) demonstrate that role changes are visible via both UI and API calls.
  - **New tokens reflect updated roles**:
    - Because tokens embed `roles` from the user at login, any new login (or token issuance) after a role change will reflect the updated set.
    - E2E tests explicitly:
      - Assign `gm` to `"alice"`, then log in as `alice` and inspect the decoded JWT to confirm `roles` includes `"gm"`.
      - Revoke `gm` from `"alice"` and verify the UI no longer shows the `gm` role, and GM-only endpoints no longer accept `alice`’s token.
  - **Token lifetime / refresh**:
    - `AuthServiceConfig` includes `tokenExpiresInSeconds`, defaulted to `60 * 10` (10 minutes).
    - This is a reasonable “short-lived token” stance for early development.
    - There is currently no explicit token refresh flow implemented in the UI (no refresh endpoint or silent refresh logic).
  - **Cross-service role re-checks**:
    - World and campaign services rely solely on the roles embedded in tokens for authorisation.
    - There is no implementation yet where other services query the auth/user service to re-check current roles for especially sensitive operations.
- **Notes / trade-offs**:
  - For this ADR’s scope and early-stage system, short-lived tokens plus explicit re-login in the UI provide “near realtime” permission updates in practice.
  - If tighter guarantees are required (e.g. immediate revocation across long-lived sessions), the system will need either:
    - A refresh token flow with explicit rotation, or
    - Role re-checks from other services on critical operations.
- **Actions**:
  - [ ] Decide (in a follow-up ADR) on a concrete token refresh strategy (e.g. refresh tokens, sliding sessions, or explicit re-login prompts).
  - [ ] If more stringent security is needed, implement role re-checks for especially sensitive endpoints in world/campaign services (consulting the auth service for up-to-date roles).

---

### 5. Authorisation checks in services

- **ADR rules**:
  - Services receiving a request:
    - Validate token signature and expiry.
    - Extract `sub` and `roles`.
    - Enforce access rules based on required roles (e.g. `"gm"` for GM-only, `"admin"` for admin-only).
  - Where necessary, services may query the user/role service to confirm current roles.
- **Status**: Compliant (for current services and scope)
- **Evidence**:
  - **Auth service endpoints**:
    - `authenticate(requiredRole?: Role)` middleware:
      - Validates tokens via `AuthService.verifyToken`.
      - Stores `userId` and `roles` on `req.auth`.
      - Enforces `requiredRole` when provided, returning `403` if the role is absent.
    - Endpoints and role requirements:
      - `/users` (GET) – admin-only (`authenticate("admin")`).
      - `/users/:username` (GET) – self or admin.
      - `/users/:username/roles` (GET) – self or admin.
      - `/users` (POST), `/users/:username` (DELETE) – admin-only.
      - `/users/:username/roles` (POST/PUT), `/users/:username/roles/:role` (DELETE) – admin-only.
      - `/gm-only` – GM-only (`authenticate("gm")`).
      - `/admin-only` – admin-only (`authenticate("admin")`).
      - `/users/:username/password` – self or admin.
  - **Downstream services and UI**:
    - E2E tests exercise:
      - GM-only endpoints: verifying that tokens with `"gm"` can access `/gm-only` while others are rejected.
      - Admin-only endpoints: verifying that only `"admin"` tokens can access `/admin-only` and user/role management endpoints.
    - The Next.js UI relies on successful login + token issuance plus UI-level role checks (via calls to auth APIs) to gate sensitive operations.
- **Actions**:
  - [ ] As world/campaign services grow, ensure any future cross-service HTTP endpoints perform equivalent token validation and role checks (or delegate to a shared middleware layer).

---

### 6. Overall assessment and recommendations

- **Overall status vs ADR 0003**:  
  - **Identity model**: Compliant. Users have stable IDs (currently equal to username), usernames, and role arrays; roles are simple strings.
  - **Roles and storage**: Compliant. Roles are stored server-side in the auth/user service and only admins can assign/revoke roles.
  - **Token-based auth**: Compliant. JWTs carry `sub` and `roles`, are signed with a shared secret, and are verified by services.
  - **Near‑realtime permission updates**: Partially compliant but acceptable for this phase. Role changes are immediately reflected in new tokens; short-lived tokens are in place, but no explicit refresh or cross-service re-check strategy yet.
  - **Authorisation enforcement**: Compliant. Auth service enforces role checks consistently; world/campaign services rely on these semantics and E2E tests validate role-gated behaviour.

#### Recommended follow-ups

1. **Token refresh & revocation strategy**  
   - Capture a concrete approach in a new ADR:
     - Either short‑lived access tokens + refresh tokens, or
     - Explicit re-login and/or role re-checks for highly sensitive operations.

2. **Role taxonomy hardening**  
   - As additional roles are introduced, keep them documented (e.g. in ADR 0003 or a follow-up “Roles catalogue” ADR) to avoid ad‑hoc naming.

3. **Production hardening**  
   - Ensure `AUTH_JWT_SECRET` and any future secrets are configured via secure environment management, not defaults.
   - If/when a persistent user store is introduced, migrate `InMemoryUserStore` semantics to that store while preserving the ADR’s guarantees.

