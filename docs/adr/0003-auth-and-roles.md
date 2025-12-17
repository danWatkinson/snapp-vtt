## 0003 – Authentication, Roles, and Token-Based Authorisation

- **Status**: Accepted  
- **Date**: 2025-12-15  
  _For ADR lifecycle and conventions, see ADR 0001 – Rules of Engagement for the VTT System._

### Context

We need to support the following behaviours:

- Admin users can assign one or more roles to other users, to control what they can do.
- Users must identify themselves so that API features can be gated by user role.
- The system should use token-based authentication so that changes to user permissions are reflected in near real time.

The initial stories focus on:

- An admin assigning a `gm` role to another user.
- Users authenticating to obtain tokens.
- API access being authorised based on the roles embedded in (or derived from) those tokens.

### Decision

- **Identity model**
  - Each user has:
    - A stable unique identifier (e.g. `userId`).
    - A username (e.g. `"alice"`, `"admin"`).
    - Zero or more roles (e.g. `["admin"]`, `["gm"]`).

- **Roles**
  - Roles are represented as simple strings (e.g. `"admin"`, `"gm"`, `"player"`).
  - Role assignments are stored server-side in a dedicated user/role service.
  - Only users with the `"admin"` role may assign or revoke roles for other users.
  - The initial role catalogue is:

    | Role    | Who can assign | Intended use                                              |
    |---------|----------------|-----------------------------------------------------------|
    | `admin` | `admin`        | Full management of users, roles, and admin-only actions  |
    | `gm`    | `admin`        | Game master; can manage worlds, campaigns, sessions, etc.|
    | `player`| `admin`        | Regular player accounts                                   |


- **Token-based authentication**
  - The system issues **access tokens** to authenticated users.
  - Tokens contain, at minimum:
    - `sub`: the user identifier.
    - `roles`: the list of roles effective at the time of token issuance.
  - Tokens are signed (e.g. using JWT with a shared secret) so that services can validate them without central coordination.

- **Updating permissions in (near) realtime**
  - **Current approach (MVP)**
    - When an admin changes a user's roles:
      - The change is persisted in the user/role store.
      - Newly issued tokens (e.g. after the user signs in again) will immediately reflect the updated role set.
    - Access tokens are short-lived (on the order of minutes), so explicit re-login or token renewal will pick up role changes in near real time.
  - **Future strategy (to be decided in a follow-up ADR)**
    - We have NOT yet chosen a long-term token refresh / revocation strategy. Options include:
      - Short-lived access tokens with refresh tokens.
      - Explicit re-login prompts when critical role changes occur.
      - Sensitive operations re-checking current roles from the user/role service.
    - The precise expiry/refresh strategy will be captured in a later ADR once concrete UX and security requirements emerge.

- **Authorisation checks**
  - Services receiving a request:
    - Validate the token signature and expiry.
    - Extract `sub` and `roles`.
    - Enforce access rules based on required roles (e.g. `"gm"` for GM-only, `"admin"` for admin-only).
  - Where necessary, services may query the user/role service to confirm current roles.

### Consequences

- Token-based auth with embedded roles allows services to make authorisation decisions locally, reducing coupling.
- Short-lived tokens and/or on-demand role lookups enable permissions to be updated in near real time, at the cost of added complexity for token refresh or role caching.
- A dedicated user/role service centralises role management and simplifies the admin's mental model, but introduces a dependency that other services may need to call.
- Representing roles as simple strings keeps the model flexible, but will require discipline and documentation to avoid ad-hoc or conflicting role names.


