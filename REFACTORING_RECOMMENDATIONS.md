# Refactoring & Simplification Recommendations

**Date**: 2025-01-XX  
**Repository**: Snapp Virtual Table Top (VTT) System

## Executive Summary

This document outlines opportunities for simplification and refactoring across the Snapp VTT codebase. The codebase demonstrates strong architectural discipline with shared packages, consistent patterns, and good separation of concerns. However, several areas present opportunities to reduce duplication, improve maintainability, and simplify the codebase while maintaining the existing high-quality standards.

---

## 1. Dead Code Cleanup

### Priority: High | Effort: Low | Impact: Medium

**Issue**: Several `.original.` and `.refactored.` files remain in the repository, suggesting incomplete cleanup after previous refactoring efforts.

**Files to Review/Remove**:
- `apps/web/lib/hooks/useDataFetching.original.ts`
- `apps/web/app/components/tabs/WorldTab.original.tsx`
- `apps/web/lib/hooks/useHomePageHandlers.original.ts`
- `apps/web/app/components/tabs/CampaignsTab.original.tsx`
- `apps/web/tests/e2e/helpers/navigation.original.ts`
- `apps/web/app/components/tabs/WorldTab.refactored.tsx`
- `apps/web/lib/hooks/useHomePageHandlers.refactored.ts`

**Recommendation**:
1. Verify that the current implementations (`WorldTab.tsx`, `useHomePageHandlers.ts`, etc.) are the desired versions
2. Compare against `.original.` and `.refactored.` files to ensure no critical logic was lost
3. Delete all `.original.` and `.refactored.` files once verified
4. Add a `.gitignore` entry or linting rule to prevent future `.original.`/`.refactored.` files

**Benefits**:
- Reduces confusion about which files are active
- Simplifies repository navigation
- Prevents accidental use of outdated code

---

## 2. Data-Fetching Hooks Consolidation

### Priority: Medium | Effort: Medium | Impact: High

**Issue**: The `apps/web/lib/hooks/data-fetching/` directory contains 11 very similar hooks (e.g., `useWorlds.ts`, `useCampaigns.ts`, `useCampaignSessions.ts`) that follow nearly identical patterns with only minor variations in dependencies and fetch functions.

**Current Pattern** (repeated 11 times):
```typescript
export function useXxx(
  condition1: boolean,
  condition2: boolean,
  fetchFn: () => Promise<any[]>,
  setter1: (data: any[]) => void,
  setter2: (loaded: boolean) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (!condition1 || condition2) return;
    (async () => {
      try {
        const data = await fetchFn();
        setter1(data);
        setter2(true);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [dependencies...]);
}
```

**Recommendation**:
Create a generic `useDataFetching` hook that handles the common pattern:

```typescript
// apps/web/lib/hooks/data-fetching/useDataFetching.ts
export function useDataFetching<T>({
  enabled,
  loaded,
  fetchFn,
  onSuccess,
  onError
}: {
  enabled: boolean;
  loaded: boolean;
  fetchFn: () => Promise<T>;
  onSuccess: (data: T) => void;
  onError: (error: string) => void;
}) {
  useEffect(() => {
    if (!enabled || loaded) return;
    (async () => {
      try {
        const data = await fetchFn();
        onSuccess(data);
      } catch (err) {
        onError((err as Error).message);
      }
    })();
  }, [enabled, loaded, fetchFn, onSuccess, onError]);
}
```

Then refactor existing hooks to use this generic version:

```typescript
// useWorlds.ts (simplified)
export function useWorlds(
  currentUser: any,
  worldsLoaded: boolean,
  fetchWorlds: () => Promise<any[]>,
  setWorlds: (worlds: any[]) => void,
  setWorldsLoaded: (loaded: boolean) => void,
  setError: (error: string | null) => void
) {
  useDataFetching({
    enabled: !!currentUser,
    loaded: worldsLoaded,
    fetchFn: fetchWorlds,
    onSuccess: (worlds) => {
      setWorlds(worlds);
      setWorldsLoaded(true);
    },
    onError: setError
  });
}
```

**Affected Files**:
- `apps/web/lib/hooks/data-fetching/world/useWorlds.ts`
- `apps/web/lib/hooks/data-fetching/world/useWorldEntities.ts`
- `apps/web/lib/hooks/data-fetching/world/useAllWorldEvents.ts`
- `apps/web/lib/hooks/data-fetching/campaign/useCampaigns.ts`
- `apps/web/lib/hooks/data-fetching/campaign/useCampaignSessions.ts`
- `apps/web/lib/hooks/data-fetching/campaign/useCampaignPlayers.ts`
- `apps/web/lib/hooks/data-fetching/campaign/useStoryArcs.ts`
- `apps/web/lib/hooks/data-fetching/campaign/useStoryArcEvents.ts`
- `apps/web/lib/hooks/data-fetching/campaign/useTimeline.ts`
- `apps/web/lib/hooks/data-fetching/session/useSessionScenes.ts`
- `apps/web/lib/hooks/data-fetching/user/useUsers.ts`

**Benefits**:
- Reduces code duplication by ~80%
- Centralizes data-fetching logic for easier maintenance
- Makes it easier to add features like caching, retry logic, or loading states
- Maintains existing API surface (backward compatible)

---

## 3. Client Function Pattern Standardization

### Priority: Low | Effort: Low | Impact: Medium

**Issue**: Client functions in `apps/web/lib/clients/` follow consistent patterns but have slight variations in implementation (e.g., some use `apiRequest` directly, others use `get`/`post` helpers, some handle nested properties differently).

**Observation**: The `baseClient.ts` already provides excellent utilities (`get`, `post`, `postVoid`, `patch`, `del`, `extractProperty`), and most clients use them correctly. However, some inconsistencies exist:

1. **Inconsistent response property extraction**: Some functions use the helper's `property` parameter, others use `extractProperty` manually
2. **Mixed usage of `apiRequest` vs helpers**: Some functions use `apiRequest` directly when helpers would work

**Recommendations**:
1. **Standardize on helper functions**: Prefer `get`, `post`, `patch`, `del` over direct `apiRequest` calls where possible
2. **Use `property` parameter consistently**: Use the helper's built-in property extraction instead of manual `extractProperty` calls
3. **Create a linting rule** (if possible) to enforce consistent client function patterns

**Examples of Inconsistencies**:

```typescript
// authClient.ts - Uses extractProperty manually
export async function revokeRole(...) {
  const data = await apiRequest<{ user: User }>(...);
  return extractProperty(data, "user");
}

// Should be:
export async function revokeRole(...) {
  return del(...); // or use a helper that returns the user
}
```

**Benefits**:
- More consistent codebase
- Easier to maintain and understand
- Reduces chance of errors in response handling

---

## 4. Handler Hook Parameter Reduction

### Priority: Low | Effort: Medium | Impact: Low

**Issue**: Handler hooks (e.g., `useWorldHandlers`, `useCampaignHandlers`, `useEntityHandlers`) accept many individual parameters (10-15 props) that could be grouped into logical objects.

**Current Pattern**:
```typescript
useWorldHandlers({
  worldForm,
  setIsLoading,
  setError,
  setWorlds,
  setWorldsLoaded,
  closeModal,
  currentUser,
  handleLogout
});
```

**Recommendation**:
Group related parameters into context objects:

```typescript
// Group UI state setters
interface UIState {
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  closeModal: (name: string) => void;
}

// Group auth context
interface AuthContext {
  currentUser: { token: string } | null;
  handleLogout: () => void;
}

// Then:
useWorldHandlers({
  form: worldForm,
  ui: { setIsLoading, setError, closeModal },
  auth: { currentUser, handleLogout },
  data: { setWorlds, setWorldsLoaded }
});
```

**Benefits**:
- Cleaner function signatures
- Easier to extend with new grouped parameters
- Better semantic grouping of related concerns

**Trade-offs**:
- Requires updating all call sites
- May make some simple cases slightly more verbose
- Consider if the improvement is worth the migration effort

---

## 5. Store Interface Standardization

### Priority: Low | Effort: Medium | Impact: Low

**Issue**: In-memory stores (`InMemoryUserStore`, `InMemoryWorldStore`, `InMemoryCampaignStore`, `InMemoryWorldEntityStore`) have similar patterns but slightly different method signatures and return types.

**Current State**: Stores already use `store-utils` for common functionality (ID generation, error messages, validation), which is excellent. However, method signatures vary:

- Some stores have `list*()` methods, others have `get*()` methods
- Some return arrays directly, others return maps
- Update methods use different patterns (`updateWorld` vs `setRoles` vs `assignRoles`)

**Recommendation**:
Define a base interface or type system for common store operations:

```typescript
// packages/store-utils/types.ts
export interface BaseStore<T, ID = string> {
  create(item: Omit<T, 'id'>): T;
  get(id: ID): T | undefined;
  list(): T[];
  update(id: ID, patch: Partial<T>): T;
  remove(id: ID): void;
}
```

Then have stores implement or extend this pattern where appropriate.

**Benefits**:
- More predictable API across stores
- Easier to create generic utilities for stores
- Better type safety and IDE support

**Trade-offs**:
- Some stores may need additional methods that don't fit the base interface
- May require significant refactoring of existing stores
- Consider if the standardization effort is worth it given current store complexity

---

## 6. Handler Hook Pattern Abstraction

### Priority: Low | Effort: High | Impact: Medium

**Issue**: Handler hooks (`useAuthHandlers`, `useWorldHandlers`, `useCampaignHandlers`, etc.) follow very similar patterns:
1. Accept form state and setters
2. Use `withAsyncAction` for async operations
3. Handle success/error/auth error callbacks
4. Return handler functions

**Current Pattern** (repeated across ~8 handler hooks):
```typescript
export function useXxxHandlers({ form, setIsLoading, setError, ... }) {
  async function handleCreateXxx(e: FormEvent) {
    e.preventDefault();
    try {
      await withAsyncAction(
        () => createXxx(form.form.field1, form.form.field2, token),
        {
          setIsLoading,
          setError,
          onAuthError: handleLogout,
          onSuccess: (item) => {
            setItems((prev) => [...prev, item]);
            form.resetForm(defaultValues);
            closeModal("xxx");
          }
        }
      );
    } catch (err) {
      // Error already handled
    }
  }
  return { handleCreateXxx };
}
```

**Recommendation**:
Create a generic hook factory or utility for common CRUD operations:

```typescript
// apps/web/lib/hooks/useCrudHandlers.ts
export function useCreateHandler<T>({
  form,
  createFn,
  onSuccess,
  ...commonOptions
}: {
  form: FormState;
  createFn: (data: any, token?: string) => Promise<T>;
  onSuccess: (item: T) => void;
  // ... other options
}) {
  return async (e: FormEvent) => {
    e.preventDefault();
    await withAsyncAction(
      () => createFn(form.form, token),
      {
        ...commonOptions,
        onSuccess: (item) => {
          onSuccess(item);
          form.resetForm(defaultValues);
        }
      }
    );
  };
}
```

**Benefits**:
- Reduces duplication in handler hooks
- Centralizes common error handling patterns
- Makes it easier to add new CRUD operations

**Trade-offs**:
- May be too abstract for some complex handlers
- Requires careful design to handle all variations
- Consider if the abstraction complexity is worth it

---

## 7. Route Handler Error Status Code Logic

### Priority: Low | Effort: Low | Impact: Low

**Issue**: In `packages/express-routes/index.ts`, error status code determination uses string matching on error messages:

```typescript
const statusCode = message.includes("not found") ? 404 : 500;
```

**Recommendation**:
Create custom error classes with status codes:

```typescript
// packages/store-utils/errors.ts
export class NotFoundError extends Error {
  statusCode = 404;
  constructor(entityType: string, id: string) {
    super(notFoundError(entityType, id));
  }
}

export class AlreadyExistsError extends Error {
  statusCode = 409; // Conflict
  constructor(entityType: string, id: string) {
    super(alreadyExistsError(entityType, id));
  }
}
```

Then in route handlers:
```typescript
} catch (err) {
  const statusCode = (err as any).statusCode ?? 500;
  return res.status(statusCode).json({ error: (err as Error).message });
}
```

**Benefits**:
- More robust error handling
- Better HTTP status code semantics
- Easier to extend with new error types

---

## 8. Component Organization

### Priority: Low | Effort: Low | Impact: Low

**Observation**: The component structure is well-organized with clear separation (auth/, banner/, navigation/, tabs/, ui/). However, some areas could benefit from minor improvements:

1. **Large tab components**: `WorldTab.tsx` and `CampaignsTab.tsx` are likely large files that could be split into smaller sub-components
2. **Reusable UI components**: The `ui/` directory is excellent; consider extracting more common patterns into reusable components

**Recommendation**:
- Review component sizes; if any exceed 300-400 lines, consider splitting
- Look for repeated JSX patterns that could become reusable components
- Continue the good practice of extracting UI components into the `ui/` directory

---

## 9. Type Safety Improvements

### Priority: Low | Effort: Medium | Impact: Medium

**Issue**: Many places use `any` types, particularly in:
- Handler hook parameters (`currentUser: any`, `setWorlds: React.Dispatch<React.SetStateAction<any[]>>`)
- Data fetching hooks
- Form state types

**Recommendation**:
1. Define proper types for entities (`World`, `Campaign`, `User`, etc.) - some already exist but aren't used consistently
2. Create shared type definitions in a `types/` directory or shared package
3. Replace `any` with proper types gradually

**Benefits**:
- Better IDE autocomplete
- Catch type errors at compile time
- Self-documenting code

---

## 10. Testing Utilities Consolidation

### Priority: Low | Effort: Low | Impact: Low

**Observation**: The codebase already has excellent test coverage and patterns. However, there may be opportunities to:
1. Extract common test utilities if duplication exists
2. Create test factories for common entities (users, worlds, campaigns)
3. Standardize test helper patterns

**Recommendation**:
- Review test files for duplicated setup/teardown code
- Consider creating test utilities in `apps/web/tests/helpers/` or similar
- Only do this if significant duplication exists

---

## Implementation Priority

### Immediate (High Priority, Low Effort)
1. **Dead Code Cleanup** (#1) - Quick win, removes confusion

### Short-term (High Value, Medium Effort)
2. **Data-Fetching Hooks Consolidation** (#2) - Significant code reduction, improves maintainability

### Medium-term (Nice to Have)
3. **Client Function Standardization** (#3)
4. **Type Safety Improvements** (#9)

### Long-term (If Time Permits)
5. **Handler Hook Pattern Abstraction** (#6) - High effort, evaluate carefully
6. **Store Interface Standardization** (#5)
7. **Handler Hook Parameter Reduction** (#4)

### Ongoing
- **Component Organization** (#8) - Part of normal development
- **Testing Utilities** (#10) - Part of normal development

---

## General Principles

When implementing these recommendations:

1. **Maintain 100% test coverage** - All refactoring should maintain or improve test coverage
2. **Incremental approach** - Refactor one area at a time, with tests passing at each step
3. **Backward compatibility** - Where possible, maintain existing APIs during transition
4. **Documentation** - Update ADRs if architectural changes are made
5. **Code review** - All refactoring should go through normal code review process

---

## Notes

- The codebase already demonstrates excellent architectural discipline with shared packages, consistent patterns, and comprehensive testing
- Many of these recommendations are "nice to have" improvements rather than critical issues
- Focus on high-impact, low-effort improvements first (#1, #2)
- Consider the team's capacity and priorities when planning refactoring work
- Some abstractions (#6) may add complexity rather than reduce it - evaluate carefully

---

## Appendix: Codebase Statistics

- **Services**: 4 (auth, world, campaign, assets)
- **Shared Packages**: 9 (express-app, express-routes, store-utils, auth-middleware, etc.)
- **Data-Fetching Hooks**: 11 similar hooks
- **Handler Hooks**: ~8 domain-specific handlers
- **Client Files**: 4 (auth, world, campaign, assets)
- **Store Implementations**: 4 in-memory stores
- **Dead Code Files**: 7 `.original.`/`.refactored.` files identified
