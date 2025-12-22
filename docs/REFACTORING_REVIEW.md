# Refactoring & Simplification Opportunities

**Date**: 2025-01-XX  
**Reviewer**: Code Review  
**Scope**: Full repository review for refactoring opportunities

## Executive Summary

This review identifies opportunities to simplify and standardize code patterns across the codebase. The main areas for improvement are:

1. **Inconsistent route handler patterns** - Some routes use helper utilities, others use manual error handling
2. **Duplicate validation logic** - Field validation is repeated across services
3. **Inconsistent error handling** - Multiple patterns for handling errors in routes
4. **Server bootstrap duplication** - Similar patterns across all services with minor variations
5. **Assets service inconsistency** - Doesn't use route helper utilities at all

## 1. Route Handler Inconsistencies

### Problem
The codebase has route helper utilities (`createGetRoute`, `createPostRoute`, `createPostVoidRoute`, `createPatchRoute`, `createDeleteRoute`) in `packages/express-routes`, but they're not consistently used across all services.

### Current State

**✅ Good examples (using helpers):**
- `apps/services/campaign/app.ts` - Consistently uses route helpers
- `apps/services/world/app.ts` - Partially uses helpers (lines 24-117)

**❌ Inconsistent examples:**
- `apps/services/world/app.ts` - Lines 119-214 use manual try-catch blocks instead of helpers
- `apps/services/assets/app.ts` - All routes use manual error handling
- `apps/services/auth/app.ts` - All routes use manual error handling

### Specific Issues

#### 1.1 World Service - Manual Route Handlers
**Location**: `apps/services/world/app.ts:119-214`

Several routes use manual try-catch instead of `createPostVoidRoute` or `createGetRoute`:

```typescript
// Lines 119-139: Event relationships
app.post("/worlds/:worldId/events/:sourceEventId/relationships", authenticate("gm"), (req: Request, res: Response) => {
  // Manual validation and error handling
  if (!targetEventId) {
    res.status(400).json({ error: "targetEventId is required" });
    return;
  }
  // ... manual try-catch
});

// Lines 142-150: Get sub-events
app.get("/worlds/:worldId/events/:eventId/sub-events", (req: Request, res: Response) => {
  // Manual try-catch instead of createGetRoute
});

// Similar patterns for factions (lines 153-184) and members (lines 187-214)
```

**Refactoring opportunity**: Convert these to use `createPostVoidRoute` and `createGetRoute` with `requireFields` for validation.

#### 1.2 Assets Service - No Route Helpers
**Location**: `apps/services/assets/app.ts`

All three routes (POST `/assets`, GET `/assets`, GET `/assets/:assetId`) use manual error handling:

```typescript
// Lines 109-167: POST /assets
app.post("/assets", authenticate("gm"), (req: Request, res: Response) => {
  // Manual auth check, validation, error handling
  if (!auth?.userId) {
    return res.status(401).json({ error: "Unauthenticated" });
  }
  if (!originalFileName) {
    return res.status(400).json({ error: "originalFileName is required..." });
  }
  // ... more manual checks
});

// Lines 171-188: GET /assets
// Lines 192-205: GET /assets/:assetId
```

**Refactoring opportunity**: 
- Use `createPostRoute` for POST `/assets`
- Use `createGetRoute` for GET routes
- Move validation logic to handler functions
- Use `requireFields` utility for field validation

#### 1.3 Auth Service - Complex Manual Handlers
**Location**: `apps/services/auth/app.ts`

The auth service has many routes with complex manual error handling. While some routes have special logic (like self/admin checks), many could still benefit from route helpers.

**Refactoring opportunity**: 
- Routes like `GET /users/:username/roles` (lines 156-179) could use `createGetRoute`
- Routes like `DELETE /users/:username` (lines 120-136) could use `createDeleteRoute`
- Extract common patterns (self/admin checks) into reusable middleware or utilities

## 2. Validation Pattern Duplication

### Problem
Field validation is repeated across services with similar patterns but slightly different implementations.

### Current State

**Pattern 1 - Manual checks:**
```typescript
// apps/services/assets/app.ts
if (!originalFileName) {
  return res.status(400).json({ error: "originalFileName is required..." });
}
```

**Pattern 2 - Using requireFields:**
```typescript
// apps/services/campaign/app.ts:41
requireFields(req, ["worldId"]);
```

**Pattern 3 - Manual checks with early returns:**
```typescript
// apps/services/world/app.ts:126-133
if (!targetEventId) {
  res.status(400).json({ error: "targetEventId is required" });
  return;
}
```

### Refactoring Opportunity

**Standardize on `requireFields` utility** which already exists in `packages/express-routes/index.ts:135-146`.

**Benefits:**
- Consistent error messages
- Less code duplication
- Centralized validation logic
- Better error handling (throws errors that route helpers can catch)

**Action items:**
1. Replace all manual field validation with `requireFields` calls
2. Update `requireFields` to support optional fields if needed
3. Consider adding type-safe validation helpers (e.g., `requireString`, `requireNumber`)

## 3. Error Handling Inconsistencies

### Problem
Multiple patterns for error handling across services:

1. **Route helpers** (automatic): `createGetRoute`, `createPostRoute` handle errors automatically
2. **Manual try-catch**: Direct error handling in route handlers
3. **Early returns**: Validation errors return immediately without try-catch

### Current State

**Pattern 1 - Route helpers (preferred):**
```typescript
app.get("/worlds", createGetRoute(
  () => store.listWorlds(),
  { responseProperty: "worlds" }
));
// Errors automatically handled, status codes inferred
```

**Pattern 2 - Manual try-catch:**
```typescript
app.get("/worlds/:worldId/events/:eventId/sub-events", (req: Request, res: Response) => {
  try {
    const subEvents = entityStore.getSubEventsForEvent(eventId);
    res.json({ subEvents });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});
```

**Pattern 3 - Early returns (no try-catch):**
```typescript
app.post("/assets", authenticate("gm"), (req: Request, res: Response) => {
  if (!auth?.userId) {
    return res.status(401).json({ error: "Unauthenticated" });
  }
  // ... no try-catch for business logic errors
});
```

### Refactoring Opportunity

**Standardize on route helpers** where possible. The route helpers already provide:
- Automatic error handling
- Consistent error response format
- Status code inference (404 for "not found", 400 for validation, etc.)

**Action items:**
1. Convert all manual route handlers to use route helpers
2. For routes with complex logic, extract business logic into handler functions
3. Update route helpers if needed to support edge cases (e.g., custom status codes)

## 4. Server Bootstrap Duplication

### Problem
All service `server.ts` files follow very similar patterns with minor variations.

### Current State

**Auth service** (`apps/services/auth/server.ts`):
```typescript
const seededStore = new InMemoryUserStore();

async function bootstrap() {
  try {
    await seedUsers(seededStore);
  } catch (err) {
    console.error("Failed to seed users for auth service:", err);
  }
  const app = createApp({ userStore: seededStore });
  createHttpsServer({ app, serviceName: "Auth", port: ports.auth, portEnvVar: "AUTH_PORT" });
}
```

**World service** (`apps/services/world/server.ts`):
```typescript
const store = new InMemoryWorldStore();
const entityStore = new InMemoryWorldEntityStore();
const app = createWorldApp({ store, entityStore });
createHttpsServer({ app, serviceName: "World", port: ports.world, portEnvVar: "WORLD_PORT" });
```

**Campaign service** (`apps/services/campaign/server.ts`):
```typescript
const store = new InMemoryCampaignStore();
const app = createCampaignApp({ store });
createHttpsServer({ app, serviceName: "Campaign", port: ports.campaign, portEnvVar: "CAMPAIGN_PORT" });
```

**Assets service** (`apps/services/assets/server.ts`):
```typescript
const store = new InMemoryAssetStore();
const app = createAssetApp({ store });
createHttpsServer({ app, serviceName: "Asset", port: ports.assets, portEnvVar: "ASSET_PORT" });
```

### Refactoring Opportunity

**Create a generic server bootstrap utility** that handles common patterns:

```typescript
// packages/server-bootstrap/createServiceServer.ts
export function createServiceServer<T>(options: {
  serviceName: string;
  port: number;
  portEnvVar: string;
  createApp: (deps: T) => Express;
  createStores: () => T;
  seedStores?: (stores: T) => Promise<void>;
}): void {
  const stores = options.createStores();
  
  async function bootstrap() {
    if (options.seedStores) {
      try {
        await options.seedStores(stores);
      } catch (err) {
        console.error(`Failed to seed ${options.serviceName} service:`, err);
      }
    }
    
    const app = options.createApp(stores);
    createHttpsServer({
      app,
      serviceName: options.serviceName,
      port: options.port,
      portEnvVar: options.portEnvVar
    });
  }
  
  bootstrap().catch((err) => {
    console.error(`Unexpected error during ${options.serviceName} service bootstrap:`, err);
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  });
}
```

**Benefits:**
- Eliminates duplication
- Consistent error handling
- Easier to add cross-cutting concerns (logging, metrics, etc.)

**Action items:**
1. Create `createServiceServer` utility
2. Refactor all services to use it
3. Update tests to work with new pattern

## 5. Assets Service Route Refactoring

### Problem
The assets service doesn't use any route helpers and has repetitive validation logic.

### Current Issues

1. **Manual auth checks** - Lines 110-113, 172-175, 193-196 all check `auth?.userId`
2. **Repetitive validation** - Multiple `if (!field) return res.status(400)...` patterns
3. **Inconsistent error handling** - Some errors return early, others might throw

### Refactoring Plan

```typescript
// Before (current)
app.post("/assets", authenticate("gm"), (req: Request, res: Response) => {
  const auth = (req as any).auth as { userId: string } | undefined;
  if (!auth?.userId) {
    return res.status(401).json({ error: "Unauthenticated" });
  }
  const { originalFileName, mimeType, ... } = req.body;
  if (!originalFileName) {
    return res.status(400).json({ error: "originalFileName is required..." });
  }
  // ... more validation
  const asset = store.create({ ... });
  return res.status(201).json({ asset });
});

// After (refactored)
app.post("/assets", authenticate("gm"), createPostRoute(
  (req: Request) => {
    const auth = (req as any).auth as { userId: string } | undefined;
    if (!auth?.userId) {
      throw new Error("Unauthenticated"); // Route helper will handle 401
    }
    requireFields(req, ["originalFileName", "mimeType"]);
    const { originalFileName, mimeType, ... } = req.body;
    const mediaType = inferMediaType(mimeType);
    if (!mediaType) {
      throw new Error("Unsupported file type...");
    }
    // ... validation
    return store.create({ ... });
  },
  { responseProperty: "asset" }
));
```

**Action items:**
1. Refactor POST `/assets` to use `createPostRoute`
2. Refactor GET `/assets` to use `createGetRoute`
3. Refactor GET `/assets/:assetId` to use `createGetRoute`
4. Extract validation logic into helper functions
5. Consider creating `requireAuth` utility to standardize auth checks

## 6. Store Pattern Consistency

### Observation
All stores follow similar patterns but there's no base class or shared implementation. This is actually fine for now, but worth noting for future consideration.

### Current State
- `InMemoryUserStore` - Uses `Map<string, User>`
- `InMemoryWorldStore` - Uses `World[]`
- `InMemoryCampaignStore` - Uses arrays and maps
- `InMemoryWorldEntityStore` - Uses arrays and maps
- `InMemoryAssetStore` - Uses `DigitalAsset[]`

### Future Consideration
If stores grow more complex, consider:
- Base store interface/class for common operations (CRUD)
- Shared utilities for common patterns (find, update, delete)
- Type-safe store builders

**Note**: This is not a priority refactoring - the current approach is fine for in-memory stores.

## 7. CLI Pattern Consistency

### Current State
All CLI files use `createServiceCli` utility, which is good. However:

- **Auth CLI** (`apps/services/auth/cli.ts`) - Has seed command
- **World CLI** (`apps/services/world/cli.ts`) - Has seed command
- **Campaign CLI** (`apps/services/campaign/cli.ts`) - No seed command (but has seeder file)

### Observation
The pattern is consistent. No refactoring needed here.

## 8. Type Safety Improvements

### Opportunities

1. **Request type extensions** - The `AuthedRequest` type in `apps/services/auth/app.ts` could be shared:
   ```typescript
   // Current: Defined in auth/app.ts
   type AuthedRequest = ExpressRequest & {
     auth?: { userId: string; roles: Role[]; };
   };
   
   // Could be: packages/auth-middleware/types.ts
   export type AuthedRequest = ExpressRequest & AuthenticatedRequest;
   ```

2. **Asset service auth type** - Uses `(req as any).auth` instead of proper typing:
   ```typescript
   // Current
   const auth = (req as any).auth as { userId: string } | undefined;
   
   // Better
   const auth = (req as AuthedRequest).auth;
   ```

## Priority Recommendations

### High Priority
1. ✅ **Refactor world service routes** (lines 119-214) to use route helpers
2. ✅ **Refactor assets service** to use route helpers throughout
3. ✅ **Standardize validation** - Use `requireFields` everywhere

### Medium Priority
4. ✅ **Create server bootstrap utility** to eliminate duplication
5. ✅ **Extract common auth patterns** into utilities
6. ✅ **Improve type safety** for authenticated requests

### Low Priority
7. ⚠️ **Store base classes** - Only if stores become more complex
8. ⚠️ **Enhanced validation utilities** - Type-safe validators

## Implementation Notes

### Testing Considerations
- All refactorings should maintain 100% test coverage
- Route helper changes should be tested across all services
- Server bootstrap utility should have comprehensive tests

### Backward Compatibility
- Route helper changes should maintain existing API contracts
- Error response formats should remain consistent
- Status codes should match current behavior

### Migration Strategy
1. Start with one service (e.g., assets) as a proof of concept
2. Update tests to ensure behavior is preserved
3. Apply pattern to other services incrementally
4. Remove old patterns once all services are migrated

## Conclusion

The codebase is generally well-structured with good separation of concerns. The main opportunities are:

1. **Consistency** - Standardize on route helpers and validation utilities
2. **DRY** - Eliminate duplication in server bootstrap and error handling
3. **Type safety** - Improve TypeScript usage, especially for authenticated requests

These refactorings will make the codebase easier to maintain, test, and extend while preserving all existing functionality.
