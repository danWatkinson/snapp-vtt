# Repository Refactoring & Simplification Recommendations

## Executive Summary

This document provides recommendations to simplify and refactor the Snapp VTT repository. The codebase is well-structured with clear architectural decisions, but there are opportunities to reduce duplication, standardize patterns, and simplify configuration.

## 1. Script & Build Configuration Simplification

### Issue: Repetitive ts-node commands
**Current State:**
All npm scripts use the same verbose `ts-node --compiler-options '{\"module\":\"commonjs\"}'` pattern repeated 11 times.

**Recommendation:**
Create a shared script wrapper or use a TypeScript configuration that works for both ESM and CommonJS.

**Options:**
1. **Create a wrapper script** (`scripts/run-ts.ts`):
   ```typescript
   // scripts/run-ts.ts
   import { spawn } from 'child_process';
   const [,, ...args] = process.argv;
   spawn('ts-node', ['--compiler-options', '{"module":"commonjs"}', ...args], {
     stdio: 'inherit',
     shell: true
   });
   ```

2. **Use tsx instead of ts-node** (simpler, faster):
   - Replace `ts-node` with `tsx` in devDependencies
   - Update scripts to: `tsx apps/services/auth/server.ts`
   - No compiler options needed

3. **Create a tsconfig for scripts** that extends base config with `module: "commonjs"`

**Impact:** Reduces package.json from ~25 lines of repetitive scripts to ~10 lines.

---

## 2. Service Server Bootstrap Standardization

### Issue: Inconsistent server initialization
**Current State:**
- Auth service: Has async seeding before server start
- World/Campaign/Assets: Direct server creation
- Port numbers are inconsistent (4400, 4501, 4600, 4700)

**Recommendation:**
1. **Standardize port numbering scheme:**
   - Auth: 3001 (currently 4400)
   - World: 3002 (currently 4501)
   - Campaign: 3003 (currently 4600)
   - Assets: 3004 (currently 4700)
   - Web: 3000 (already correct)

2. **Create a unified service bootstrap pattern:**
   ```typescript
   // packages/service-bootstrap/index.ts
   export async function bootstrapService(options: {
     serviceName: string;
     port: number;
     createApp: () => Express | Promise<Express>;
     seed?: (store: any) => Promise<void>;
   }) { ... }
   ```

**Impact:** Consistent ports, easier to remember, standardized initialization pattern.

---

## 3. TypeScript Configuration Consolidation

### Issue: Multiple TypeScript configs with different settings
**Current State:**
- Root `tsconfig.json`: ESNext modules, strict mode
- `apps/web/tsconfig.json`: ESNext modules, **strict: false**
- Package configs: Various settings

**Recommendation:**
1. **Enable strict mode in web app** - The web app has `strict: false`, which undermines type safety goals
2. **Create a base tsconfig** that all others extend
3. **Standardize module resolution** across all configs

**Files to update:**
- `apps/web/tsconfig.json`: Set `strict: true`
- Create `tsconfig.base.json` for shared settings

**Impact:** Better type safety, consistent compilation behavior.

---

## 4. HTTP Client Code Duplication

### Issue: Repetitive API client patterns
**Current State:**
Each client (`authClient.ts`, `worldClient.ts`, `campaignClient.ts`, `assetsClient.ts`) follows the same pattern:
- Import `apiRequest` and `extractProperty`
- Define service-specific functions
- Use `extractProperty` for nested responses

**Recommendation:**
Create a generic service client factory:
```typescript
// packages/api-client/index.ts
export function createServiceClient<T>(baseUrl: string, token?: string) {
  return {
    get: <R>(path: string) => apiRequest<{ [key: string]: R }>(`${baseUrl}${path}`, { token }),
    post: <R>(path: string, body: unknown) => apiRequest<{ [key: string]: R }>(`${baseUrl}${path}`, { method: 'POST', token, body }),
    // ... etc
  };
}
```

Or use a more sophisticated approach with typed endpoints:
```typescript
// Define API contracts as types, generate clients
type AuthEndpoints = {
  '/auth/login': { method: 'POST', body: { username: string, password: string }, response: { user: User, token: string } };
  // ...
};
```

**Impact:** Reduces client code by ~60%, easier to maintain, type-safe API contracts.

---

## 5. Store Pattern Standardization

### Issue: Similar InMemory store implementations
**Current State:**
- `InMemoryUserStore`
- `InMemoryWorldStore`
- `InMemoryWorldEntityStore`
- `InMemoryCampaignStore`
- `InMemoryAssetStore`

All follow similar patterns but have slight variations.

**Recommendation:**
1. **Create a base store interface/class** for common operations:
   ```typescript
   // packages/store-base/index.ts
   export abstract class BaseInMemoryStore<T extends { id: string }> {
     protected items: T[] = [];
     
     create(item: Omit<T, 'id'>): T { ... }
     getById(id: string): T | undefined { ... }
     list(): T[] { ... }
     // Common operations
   }
   ```

2. **Keep domain-specific logic** in subclasses but inherit common behavior

**Impact:** Reduces duplication, standardizes store behavior, easier to add new stores.

---

## 6. Service App Route Registration

### Issue: Verbose route definitions with repeated patterns
**Current State:**
Each service app has many routes with similar error handling, authentication, and response patterns.

**Recommendation:**
Create route helper utilities:
```typescript
// packages/express-routes/index.ts
export function createGetRoute<T>(
  handler: (req: Request) => T | Promise<T>,
  options?: { auth?: Role }
) { ... }

export function createPostRoute<T, B>(
  handler: (req: Request, body: B) => T | Promise<T>,
  options?: { auth?: Role }
) { ... }
```

**Example transformation:**
```typescript
// Before
app.get("/worlds", (_req: Request, res: Response) => {
  const worlds = store.listWorlds();
  res.json({ worlds });
});

// After
app.get("/worlds", createGetRoute(() => ({ worlds: store.listWorlds() })));
```

**Impact:** Reduces route code by ~40%, standardizes error handling, less boilerplate.

---

## 7. Logging Middleware Duplication

### Issue: Web app has custom logging that duplicates express-middleware
**Current State:**
- `packages/express-middleware` has `createResponseLoggingMiddleware`
- `apps/web/next-https-dev.ts` has inline logging code (lines 34-55) that duplicates this functionality

**Recommendation:**
Extract logging to a shared utility and use it in both places, or create a Next.js-specific wrapper that uses the same logging logic.

**Impact:** Single source of truth for logging format, easier to maintain.

---

## 8. CLI Pattern Enhancement

### Issue: CLI utilities are good but could be more flexible
**Current State:**
`packages/cli-utils` provides good structure, but:
- Campaign CLI has no seed commands (inconsistent)
- Each service manually imports and calls `createServiceCli`

**Recommendation:**
1. **Make seed commands optional but consistent** - Campaign service could have a placeholder seed command
2. **Auto-discover seed commands** if a `seeder.ts` file exists in the service directory
3. **Standardize CLI entry points** - All services use the same pattern

**Impact:** More consistent developer experience, less manual wiring.

---

## 9. Environment Variable Management

### Issue: Environment variables scattered and inconsistent
**Current State:**
- Port variables: `AUTH_PORT`, `WORLD_PORT`, `CAMPAIGN_PORT`, `ASSET_PORT`, `WEB_PORT`
- Certificate paths: `HTTPS_CERT_DIR`, `HTTPS_KEY_PATH`, `HTTPS_CERT_PATH`
- Service URLs: `NEXT_PUBLIC_AUTH_SERVICE_URL`, etc.
- Seeding files: `AUTH_USERS_FILE`, `WORLD_WORLDS_FILE`

**Recommendation:**
1. **Create a centralized config module:**
   ```typescript
   // packages/config/index.ts
   export const config = {
     ports: {
       auth: Number(process.env.AUTH_PORT ?? 3001),
       world: Number(process.env.WORLD_PORT ?? 3002),
       // ...
     },
     https: {
       certDir: process.env.HTTPS_CERT_DIR ?? defaultPath,
       // ...
     },
     services: {
       auth: process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ?? 'https://localhost:3001',
       // ...
     }
   };
   ```

2. **Document all environment variables** in a single `.env.example` file

**Impact:** Easier configuration management, better documentation, type-safe config access.

---

## 10. Package Structure Optimization

### Issue: Some packages are very small (single file)
**Current State:**
- `packages/express-middleware`: Single file, could be merged
- `packages/cli-utils`: Single file, could be merged
- `packages/https-config`: Single file, could be merged

**Recommendation:**
Consider consolidating small utility packages:
- Merge `express-middleware` and `https-config` into `express-app` (they're all Express-related)
- Keep `cli-utils` separate (it's a distinct concern)
- Or create a `packages/common` for small shared utilities

**Impact:** Fewer packages to manage, simpler dependency graph, but slightly less modular.

---

## 11. Test Configuration Simplification

### Issue: Vitest config has many exclusions
**Current State:**
`vitest.config.mts` has 15+ exclusion patterns, some of which might be unnecessary.

**Recommendation:**
1. **Review exclusions** - Some like `**/*.test.*` might be redundant (Vitest should ignore these by default)
2. **Group related exclusions** with comments
3. **Consider using coverage thresholds** instead of 100% requirement for some files (e.g., wiring/glue files)

**Impact:** Cleaner config, potentially better coverage reporting.

---

## 12. Service Dependencies Pattern

### Issue: Inconsistent dependency injection
**Current State:**
- Some services use `AppDependencies` interfaces
- Some create stores inline in server files
- Some pass stores, some don't

**Recommendation:**
Standardize on dependency injection pattern:
```typescript
// All services should follow this pattern
export interface ServiceDependencies {
  store: StoreType;
  // other deps
}

export function createServiceApp(deps: ServiceDependencies) { ... }

// In server.ts
const deps = {
  store: new InMemoryStore(),
  // ...
};
const app = createServiceApp(deps);
```

**Impact:** Consistent pattern, easier to test, easier to swap implementations.

---

## 13. Next.js Dev Server Simplification

### Issue: Custom HTTPS wrapper duplicates functionality
**Current State:**
`apps/web/next-https-dev.ts` manually creates HTTPS server and handles logging.

**Recommendation:**
1. **Use Next.js built-in HTTPS support** (if available in Next.js 15)
2. **Or extract to a reusable utility** that both services and web can use
3. **Consider using a reverse proxy** (like Caddy or nginx) for local dev to handle HTTPS termination

**Impact:** Less custom code, easier to maintain, potentially better performance.

---

## Priority Recommendations

### High Priority (Quick Wins)
1. ✅ **Script simplification** (#1) - Easy, immediate benefit
2. ✅ **Port standardization** (#2) - Simple change, better UX
3. ✅ **TypeScript strict mode** (#3) - Important for type safety
4. ✅ **Logging consolidation** (#7) - Remove duplication

### Medium Priority (Significant Impact)
5. ⚠️ **HTTP client refactoring** (#4) - Reduces code significantly
6. ⚠️ **Store pattern standardization** (#5) - Reduces duplication
7. ⚠️ **Route helper utilities** (#6) - Reduces boilerplate
8. ⚠️ **Environment variable centralization** (#9) - Better DX

### Low Priority (Nice to Have)
9. ℹ️ **Package consolidation** (#10) - Minor simplification
10. ℹ️ **CLI enhancements** (#8) - Incremental improvement
11. ℹ️ **Test config cleanup** (#11) - Minor cleanup

---

## Implementation Strategy

1. **Start with High Priority items** - These provide immediate value with low risk
2. **Create ADRs for significant changes** - Per your rules of engagement
3. **Refactor incrementally** - One service at a time, maintain tests
4. **Update documentation** - Keep README and ADRs in sync

---

## Notes

- The codebase is already well-structured with good separation of concerns
- These recommendations focus on reducing duplication and standardizing patterns
- All changes should maintain 100% test coverage (as per ADR 0002)
- Consider creating a refactoring ADR to document these improvements
