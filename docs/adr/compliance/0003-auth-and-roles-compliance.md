## ADR 0003 – Authentication, Roles, and Token-Based Authorisation: Compliance Statement

### Summary

Overall status: **Compliant (MVP), with clearly defined future enhancements**

The implemented auth service and consuming services follow ADR 0003’s identity, roles, and token‑based auth model. Tokens embed user identity and roles, role assignment flows exist, and services enforce access based on token roles. The longer‑term token refresh/revocation strategy is explicitly deferred, matching the ADR’s “future strategy” section.

### Evidence of compliance

- **Identity and roles**
  - Users are represented with stable identifiers and usernames (e.g. `admin`, `alice`) in the auth service’s user store.
  - Roles are simple strings (e.g. `"admin"`, `"gm"`, `"player"`) assigned to users and persisted in the auth user store.
  - Admin flows for assigning/revoking roles are implemented and covered by E2E tests (e.g. `auth-roles` and user management features).

- **Token-based authentication**
  - The auth service issues JWT access tokens containing user identity and role information (`sub`, `roles`).
  - Backend services validate tokens and extract roles to make authorisation decisions.

- **Authorisation in services**
  - Protected routes in auth, world, and campaign services check for valid tokens and enforce role requirements (e.g. admin‑only management endpoints, GM/player‑specific actions).
  - Frontend clients (e.g. `authClient.ts`, `worldClient.ts`, `campaignClient.ts`) attach tokens to requests as expected.

- **Near-realtime permission updates (MVP)**
  - When roles change, new tokens immediately reflect the updated role set.
  - Tokens are configured to be short‑lived, so signing in again or refreshing tokens picks up role changes in practice.

### Gaps and deviations

- A full refresh‑token or revocation strategy is **not yet implemented**, but this is explicitly acknowledged in ADR 0003 as a future ADR concern.
- Some services rely on the token’s embedded roles without re‑checking the auth service for particularly sensitive operations (acceptable for the current threat model but a known possible enhancement).

### Recommended follow‑ups

- Create a follow‑up ADR to decide on a **concrete token lifecycle strategy** (refresh tokens vs sliding sessions vs re‑login prompts).
- If requirements tighten, add explicit **re‑checks for roles** on the most sensitive operations, potentially via shared middleware.
- Consider centralising role constants (e.g. `roles.ts`) as the role catalogue grows.
