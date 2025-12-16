# Proposal: User Management, Authentication, Authorization, and Role Assignment

## Current State Analysis

### What Works
- ✅ Basic JWT token-based authentication
- ✅ Role-based authorization (admin, gm, player)
- ✅ Admin can assign roles to users
- ✅ Token contains user ID and roles
- ✅ Auth service has proper REST endpoints

### Critical Gaps

1. **User Management**
   - ❌ User creation is open (no auth required)
   - ❌ No way to list/view all users
   - ❌ No way to revoke roles (only add)
   - ❌ No way to delete users
   - ❌ No user profile management
   - ❌ No way to see who has what roles

2. **Authentication**
   - ❌ No password authentication (username-only is insecure)
   - ❌ No token refresh mechanism
   - ❌ Tokens expire but no refresh endpoint
   - ❌ No logout mechanism (tokens remain valid until expiry)

3. **Authorization**
   - ❌ World and Campaign services don't enforce authentication
   - ❌ No authorization checks in other services
   - ❌ No way to restrict actions by role in other services

4. **Data Persistence**
   - ❌ In-memory store loses data on restart
   - ❌ No user data persistence

5. **User Experience**
   - ❌ Limited UI for user management
   - ❌ No user listing view
   - ❌ No role management UI (can't see/revoke roles)

## Proposed Solution

### Phase 1: Core User Management (High Priority)

#### 1.1 User CRUD Operations
- **GET /users** - List all users (admin-only)
- **GET /users/:username** - Get user details (self or admin)
- **POST /users** - Create user (admin-only, or open registration with approval)
- **DELETE /users/:username** - Delete user (admin-only)
- **PATCH /users/:username** - Update user (self for profile, admin for roles)

#### 1.2 Role Management
- **GET /users/:username/roles** - Get user's roles (self or admin)
- **POST /users/:username/roles** - Assign roles (admin-only) - *already exists*
- **DELETE /users/:username/roles/:role** - Revoke a specific role (admin-only)
- **PUT /users/:username/roles** - Replace all roles (admin-only)

#### 1.3 User Store Improvements
- Add `listUsers()` method
- Add `removeUser()` method
- Add `revokeRole()` method
- Add `setRoles()` method (replace all roles)

### Phase 2: Authentication Enhancements (High Priority)

#### 2.1 Password Authentication
- Add password field to User model
- Hash passwords (bcrypt or similar)
- Update login to require password
- Add password change endpoint (self or admin)

#### 2.2 Token Management
- **POST /auth/refresh** - Refresh access token
- **POST /auth/logout** - Invalidate token (optional: token blacklist)
- Add refresh token mechanism (optional, for better security)

#### 2.3 Security Improvements
- Rate limiting on login endpoint
- Account lockout after failed attempts
- Password strength requirements

### Phase 3: Service Authorization (Medium Priority)

#### 3.1 Shared Auth Middleware
- Create shared auth middleware package
- Extract token verification logic
- Make it reusable across services

#### 3.2 World Service Authorization
- Protect world creation (gm or admin)
- Protect entity creation (gm or admin)
- Allow world builders to manage their own worlds

#### 3.3 Campaign Service Authorization
- Protect campaign creation (gm or admin)
- Protect session/scene creation (campaign owner or gm)
- Allow players to view campaigns they're in

### Phase 4: UI Enhancements (Medium Priority)

#### 4.1 User Management UI
- User list view (admin-only)
- User detail view with roles
- Role assignment/revocation UI
- User creation form (admin-only)

#### 4.2 Authentication UI
- Password login form
- Token refresh handling (automatic)
- Logout button
- Current user profile view

### Phase 5: Data Persistence (Lower Priority, but Important)

#### 5.1 Persistent User Store
- Replace InMemoryUserStore with database-backed store
- Add user data migration
- Maintain backward compatibility

## Recommended Implementation Order

1. **Immediate (Week 1)**
   - User listing (GET /users)
   - Role revocation (DELETE /users/:username/roles/:role)
   - User deletion (DELETE /users/:username)
   - UI for user management

2. **Short-term (Week 2-3)**
   - Password authentication
   - Token refresh mechanism
   - Shared auth middleware
   - Basic authorization in World service

3. **Medium-term (Month 2)**
   - Full authorization in all services
   - Enhanced UI for user management
   - Security improvements (rate limiting, etc.)

4. **Long-term (Month 3+)**
   - Persistent user store
   - Advanced features (password reset, email verification, etc.)

## Technical Decisions Needed

1. **Password Storage**: bcrypt with what cost factor?
2. **Token Refresh**: Short-lived access tokens + refresh tokens, or just extend expiry?
3. **User Registration**: Open registration or admin-only?
4. **Role Hierarchy**: Should roles have implicit permissions (e.g., admin > gm > player)?
5. **Service Auth**: Should each service validate tokens independently, or use a shared auth service?
6. **Data Persistence**: What database? SQLite for dev, PostgreSQL for prod?

## Questions for Discussion

1. Should we implement password auth now, or keep username-only for MVP?
2. Do we need role revocation, or is "assign new roles" sufficient?
3. Should users be able to see other users' roles, or only admins?
4. How should we handle token expiry in the UI? Auto-refresh or prompt re-login?
5. Should world/campaign services require auth, or remain open for now?

## Next Steps

1. Review and discuss this proposal
2. Prioritize features based on needs
3. Create ADR for any major architectural decisions
4. Start with Phase 1, Week 1 items
5. Create E2E tests for new features (following TDD approach)

