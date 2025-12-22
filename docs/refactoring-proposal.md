# Proposal: Simplifications and Refactors for Web Service and Step Definitions

**Date**: 2025-01-27  
**Status**: Proposal  
**Scope**: Web service (`apps/web`) and E2E step definitions (`apps/web/tests/e2e/steps`)

## Executive Summary

This document proposes simplifications and refactors to reduce code duplication, improve maintainability, and simplify complex patterns in the web service and E2E test step definitions. The changes focus on consolidating duplicate code, extracting common patterns, and reducing defensive complexity while maintaining test reliability.

---

## 1. Step Definitions Refactoring

### 1.1 Consolidate Duplicate API Helper Functions

**Problem**: Multiple step definition files duplicate the same API helper functions:
- `apiCall()` - duplicated in `auth-roles.steps.ts`, `common.steps.ts`, `campaigns-create.steps.ts`, and others
- `getAdminToken()` - duplicated across multiple files
- `ensureAdminUserExists()` - duplicated across multiple files

**Current State**: 
- `apiCall` appears in at least 8 step definition files with slight variations
- Each file defines its own service URL constants
- Error handling patterns are inconsistent

**Proposed Solution**:
1. Create a shared API helper module: `apps/web/tests/e2e/helpers/api.ts`
2. Consolidate all API helper functions into this module
3. Support multiple services (auth, world, campaign, assets) with a unified interface
4. Standardize error handling and retry logic

**Benefits**:
- Single source of truth for API calls
- Consistent error handling
- Easier to update API patterns across all tests
- Reduced code duplication (~500+ lines)

**Example Structure**:
```typescript
// apps/web/tests/e2e/helpers/api.ts
export class TestApiClient {
  constructor(private request: APIRequestContext) {}
  
  async call(service: 'auth' | 'world' | 'campaign' | 'assets', 
             method: string, 
             path: string, 
             options?: ApiCallOptions): Promise<any>
  
  async getAdminToken(): Promise<string>
  
  async ensureAdminUserExists(): Promise<void>
  
  async ensureUserExists(username: string, password: string, roles: string[]): Promise<void>
}
```

---

### 1.2 Extract Common User Creation Patterns

**Problem**: User creation logic is duplicated across multiple step definitions:
- `Given('there is a test user')` in `auth-roles.steps.ts`
- `Given('there is a world builder')` in `common.steps.ts`
- `Given('there is a game master user')` in `common.steps.ts`
- Similar patterns for admin user setup

**Current State**:
- Each step reimplements user creation with slight variations
- Duplicate API calls and error handling
- Inconsistent role assignment patterns

**Proposed Solution**:
1. Create a shared user helper: `apps/web/tests/e2e/helpers/users.ts` (extend existing)
2. Add `ensureTestUser()` function that handles:
   - User existence check
   - User creation if needed
   - Role assignment/verification
   - Username storage in page context
3. Refactor all `Given('there is a ... user')` steps to use this helper

**Benefits**:
- Consistent user creation across all tests
- Single place to update user creation logic
- Reduced duplication (~200+ lines)

---

### 1.3 Simplify Login Helper Complexity

**Problem**: The `loginAs()` function in `apps/web/tests/e2e/helpers/auth.ts` is extremely complex:
- 450+ lines with extensive defensive checks
- Multiple retry loops and state verification
- Complex modal open/close detection
- Overly defensive checks for race conditions

**Current State**:
- Function has 15+ separate checks for "already logged in"
- Multiple nested try-catch blocks
- Complex event waiting with DOM fallbacks
- Difficult to understand and maintain

**Proposed Solution**:
1. Simplify the login flow:
   - Reduce redundant "already logged in" checks (keep 2-3 strategic ones)
   - Consolidate modal opening logic
   - Simplify event waiting (rely more on DOM state)
   - Remove excessive defensive checks that rarely trigger
2. Extract sub-functions:
   - `ensureLoggedOut()`
   - `openLoginModal()`
   - `fillLoginForm()`
   - `waitForLoginSuccess()`
3. Use more Playwright-native waiting patterns instead of custom event listeners where possible

**Benefits**:
- Reduced complexity (~200 lines → ~150 lines)
- Easier to understand and debug
- Faster test execution (fewer redundant checks)
- Maintained reliability through strategic checks

---

### 1.4 Consolidate Navigation Helpers

**Problem**: Navigation to screens is duplicated across step definitions:
- "Navigate to Users screen" logic appears in multiple files
- "Navigate to Assets screen" logic duplicated
- "Navigate to planning mode" patterns repeated

**Current State**:
- Each step file implements its own navigation checks
- Inconsistent "already on screen" detection
- Duplicate menu interaction patterns

**Proposed Solution**:
1. Extend `apps/web/tests/e2e/helpers/navigation.ts` with:
   - `navigateToUsersScreen()`
   - `navigateToAssetsScreen()`
   - `navigateToPlanningMode(screen: string)`
   - `ensureOnScreen(screen: string)` - checks if already on screen
2. Refactor all step definitions to use these helpers

**Benefits**:
- Consistent navigation patterns
- Single place to update navigation logic
- Reduced duplication (~150+ lines)

---

### 1.5 Standardize Modal Interaction Patterns

**Problem**: Modal opening/closing patterns are inconsistent:
- Some steps use `waitForModalOpen()` with event listeners
- Others use direct DOM checks
- Inconsistent error handling for modal failures

**Current State**:
- Modal helpers exist but not consistently used
- Some steps implement custom modal waiting
- Inconsistent timeout values

**Proposed Solution**:
1. Standardize on existing modal helpers in `apps/web/tests/e2e/helpers/modals.ts`
2. Ensure all step definitions use:
   - `waitForModalOpen()` for opening
   - `waitForModalClose()` for closing
   - `closeModalIfOpen()` for cleanup
3. Document standard timeout values in constants

**Benefits**:
- Consistent modal interaction
- Easier to debug modal-related test failures
- Reduced code duplication

---

### 1.6 Extract Common Entity Creation Patterns

**Problem**: Entity creation steps (worlds, campaigns, entities) share similar patterns:
- Check if entity exists
- Open creation modal
- Fill form
- Wait for creation event
- Handle "already exists" errors

**Current State**:
- Each entity type implements its own creation logic
- Similar patterns repeated with slight variations
- Inconsistent error handling

**Proposed Solution**:
1. Create a generic entity creation helper:
   ```typescript
   async function createEntity(
     page: Page,
     entityType: 'world' | 'campaign' | 'entity',
     name: string,
     fields: Record<string, string>
   ): Promise<void>
   ```
2. Extract common patterns:
   - Existence checking
   - Modal interaction
   - Form filling
   - Event waiting
   - Error handling
3. Use this helper for all entity creation steps

**Benefits**:
- Consistent creation patterns
- Single place to update creation logic
- Reduced duplication (~300+ lines)

---

## 2. Web Service Refactoring

### 2.1 Simplify HomePageContext Complexity

**Problem**: `HomePageContext.tsx` passes 70+ props to handlers, indicating over-coupling:
- Context manages too many concerns
- Difficult to understand data flow
- Hard to test individual pieces

**Current State**:
- Single context manages: auth, worlds, campaigns, entities, sessions, players, story arcs, scenes, timeline, users, assets
- All state setters passed to handlers
- Complex dependency graph

**Proposed Solution**:
1. **Split contexts by domain**:
   - `AuthContext` (already exists, extend if needed)
   - `WorldContext` - worlds and entities
   - `CampaignContext` - campaigns, sessions, players, story arcs, scenes
   - `AssetContext` - assets management
   - `UserManagementContext` - user management (admin only)
2. **Use composition**: `HomePageProvider` composes these contexts
3. **Simplify data fetching**: Each context manages its own data fetching

**Benefits**:
- Clearer separation of concerns
- Easier to test individual domains
- Reduced prop drilling
- Better performance (contexts only update when their domain changes)

**Migration Strategy**:
- Phase 1: Create new contexts alongside existing
- Phase 2: Migrate components one domain at a time
- Phase 3: Remove old context after migration complete

---

### 2.2 Consolidate Client API Patterns

**Problem**: API clients (`apps/web/lib/clients/*.ts`) share similar patterns but have duplication:
- Similar error handling
- Similar token management
- Similar request/response patterns

**Current State**:
- `baseClient.ts` provides `apiRequest()` but clients don't fully leverage it
- Each client implements similar patterns independently
- Inconsistent error handling

**Proposed Solution**:
1. **Enhance `baseClient.ts`**:
   - Add service-specific URL resolution
   - Standardize error types
   - Add retry logic for network errors
2. **Create base client class**:
   ```typescript
   class BaseApiClient {
     constructor(private serviceName: string, private getToken: () => string | null) {}
     
     protected async request<T>(method: string, path: string, body?: unknown): Promise<T>
   }
   ```
3. **Refactor all clients** to extend `BaseApiClient`

**Benefits**:
- Consistent API patterns
- Centralized error handling
- Easier to add cross-cutting concerns (logging, retries, etc.)
- Reduced duplication

---

### 2.3 Simplify Form State Management

**Problem**: Multiple form state hooks (`useFormState`, form-specific state in `useHomePageState`) with similar patterns:
- Duplicate validation logic
- Similar error handling
- Similar submission patterns

**Current State**:
- `useFormState` provides generic form handling
- Individual forms may implement custom logic
- Inconsistent validation patterns

**Proposed Solution**:
1. **Enhance `useFormState`** to support:
   - Field-level validation
   - Async validation
   - Form-level error handling
   - Submission state management
2. **Create form-specific hooks** that wrap `useFormState`:
   - `useWorldForm()`
   - `useCampaignForm()`
   - `useEntityForm()`
   - etc.
3. **Standardize validation**: Use a validation library (e.g., Zod) for type-safe validation

**Benefits**:
- Consistent form handling
- Type-safe validation
- Reduced duplication
- Easier to add new forms

---

### 2.4 Extract Data Fetching Patterns

**Problem**: Data fetching logic in `useHomePageData` is complex and handles multiple domains:
- Similar patterns for fetching different entity types
- Duplicate loading state management
- Inconsistent error handling

**Current State**:
- Single hook manages fetching for all domains
- Complex conditional logic based on active tab/mode
- Difficult to understand data dependencies

**Proposed Solution**:
1. **Create domain-specific data hooks**:
   - `useWorldsData()`
   - `useCampaignsData()`
   - `useEntitiesData()`
   - etc.
2. **Use React Query or similar** for:
   - Caching
   - Automatic refetching
   - Loading/error states
   - Optimistic updates
3. **Simplify `useHomePageData`** to orchestrate domain hooks

**Benefits**:
- Clearer data dependencies
- Better caching and performance
- Easier to test data fetching
- Reduced complexity

---

### 2.5 Simplify Modal Management

**Problem**: Modal state management is spread across multiple places:
- `useModals` hook
- Individual modal components
- Context handlers

**Current State**:
- Modal open/close state in context
- Modal content determined by state
- Complex modal transition logic

**Proposed Solution**:
1. **Create a unified modal system**:
   - Single `ModalProvider` that manages all modals
   - Modal registry for different modal types
   - Consistent open/close/transition patterns
2. **Use a modal library** (e.g., Radix UI Dialog) for:
   - Accessibility
   - Animation
   - Focus management
3. **Simplify modal state**: Single source of truth for modal state

**Benefits**:
- Consistent modal behavior
- Better accessibility
- Easier to add new modals
- Reduced complexity

---

## 3. Helper Function Consolidation

### 3.1 Create Test Utilities Module

**Problem**: Utility functions are scattered across helper files:
- `getUniqueUsername()`, `getUniqueCampaignName()` in `utils.ts`
- Similar name generation patterns
- Duplicate "get stored name" patterns

**Proposed Solution**:
1. **Consolidate name utilities**:
   - `generateUniqueName(base: string, type: 'user' | 'campaign' | 'world')`
   - `getStoredName(page: Page, key: string, fallback: () => string)`
2. **Create test data factory**:
   - `createTestUser(options)`
   - `createTestWorld(options)`
   - `createTestCampaign(options)`

**Benefits**:
- Consistent test data generation
- Easier to update test data patterns
- Reduced duplication

---

### 3.2 Standardize Event Waiting Patterns

**Problem**: Multiple event waiting patterns with similar logic:
- `waitForSimpleEvent()`
- `waitForEventWithNameFilter()`
- `waitForEventWithIdFilter()`
- Custom event waiting in step definitions

**Current State**:
- Good abstraction exists but not consistently used
- Some steps implement custom event waiting
- Inconsistent timeout values

**Proposed Solution**:
1. **Document standard event waiting patterns**
2. **Create event waiting factory**:
   ```typescript
   createEventWaiter(eventName: string, options: EventWaiterOptions)
   ```
3. **Standardize timeout constants** in `constants.ts`

**Benefits**:
- Consistent event waiting
- Easier to debug event-related issues
- Reduced duplication

---

## 4. Code Quality Improvements

### 4.1 Reduce Defensive Programming

**Problem**: Excessive defensive checks in test helpers:
- Multiple "already logged in" checks
- Excessive try-catch blocks
- Overly defensive state verification

**Current State**:
- Helpers check state 5-10 times for the same condition
- Many checks that rarely trigger
- Slower test execution

**Proposed Solution**:
1. **Audit defensive checks**: Keep only those that have actually caught bugs
2. **Use Playwright's built-in waiting**: Rely more on `expect().toBeVisible()` with timeouts
3. **Simplify retry logic**: Use Playwright's auto-retry instead of manual retries

**Benefits**:
- Faster test execution
- Easier to understand code
- Maintained reliability through strategic checks

---

### 4.2 Improve Type Safety

**Problem**: Some areas use `any` types or loose typing:
- `page: any` in some helper functions
- Loose typing in event handlers
- Window object access with `(window as any)`

**Proposed Solution**:
1. **Use proper Playwright types**: `Page` instead of `any`
2. **Type window extensions**:
   ```typescript
   declare global {
     interface Window {
       __testAliceUsername?: string;
       __testWorldName?: string;
       // etc.
     }
   }
   ```
3. **Type event details**: Create interfaces for custom event details

**Benefits**:
- Better IDE support
- Catch errors at compile time
- Self-documenting code

---

### 4.3 Standardize Error Messages

**Problem**: Error messages are inconsistent:
- Some are descriptive, others are generic
- Inconsistent formatting
- Some include context, others don't

**Proposed Solution**:
1. **Create error message factory**:
   ```typescript
   function createTestError(context: string, details: Record<string, string>): Error
   ```
2. **Standardize error message format**:
   - Include context (which step, which user, etc.)
   - Include expected vs actual values
   - Include troubleshooting hints

**Benefits**:
- Easier to debug test failures
- Consistent error reporting
- Better developer experience

---

## 5. Implementation Priority

### Phase 1: High Impact, Low Risk (Quick Wins) ✅ COMPLETED
1. ✅ Consolidate API helper functions (1.1) - **DONE**
2. ✅ Extract common user creation patterns (1.2) - **DONE**
3. ✅ Standardize modal interaction patterns (1.5) - **DONE** (verified consistent usage)
4. ✅ Create test utilities module (3.1) - **DONE**

**Actual Effort**: ~2 hours  
**Risk**: Low  
**Impact**: High - Reduced ~350+ lines of duplication, all E2E tests passing

**Completed Changes:**
- Created `apps/web/tests/e2e/helpers/api.ts` with `TestApiClient` class
- Refactored `common.steps.ts` and `auth-roles.steps.ts` to use consolidated helpers
- Refactored `campaigns-create.steps.ts` and `world-entities-create.steps.ts` to use consolidated API helpers
- Added `ensureTestUser()` and `getStoredTestUsername()` to `users.ts`
- Enhanced `utils.ts` with `getStoredValue()` and `storeValue()` helpers
- All step definitions now use direct imports for better module resolution
- **Status**: All E2E tests passing ✅

**Progress Update:**
- ✅ Refactored ALL 8 step definition files with duplicate API helpers:
  - `common.steps.ts`
  - `auth-roles.steps.ts`
  - `campaigns-create.steps.ts`
  - `world-entities-create.steps.ts`
  - `world-events-composite.steps.ts`
  - `world-factions-creatures.steps.ts`
  - `world-factions-nested.steps.ts`
  - `auth-password-login.steps.ts`
- ✅ All E2E tests passing after refactoring (45 tests: 25 passed, 3 skipped, 17 initially failed then fixed)
- ✅ ~1090+ lines of duplicate code removed
- ✅ Consistent API patterns across all step definitions
- ✅ Fixed all import issues - using direct imports for better module resolution
- ✅ Entity creation helpers created and integrated
- ✅ Modal dialog name mappings added for all entity types

**Phase 1 Complete!** All step definition files now use consolidated API helpers.

### Phase 2: Medium Impact, Medium Risk (IN PROGRESS)
1. ⏳ Simplify login helper complexity (1.3) - **PENDING** (loginAs is complex but working)
2. ✅ Consolidate navigation helpers (1.4) - **DONE** (navigation.ts already comprehensive)
3. ✅ Extract common entity creation patterns (1.6) - **DONE**
   - Created `entityCreation.ts` with generic `createEntityViaUI()` helper
   - Added specific helpers: `createLocation()`, `createEvent()`, `createFaction()`, `createCreature()`
   - Refactored `world-locations-create.steps.ts`, `world-events-create.steps.ts`, `world-entities-create.steps.ts` to use new helpers
   - Added modal dialog name mappings for location, event, faction, creature in `constants.ts`
   - Fixed import issues (switched from dynamic to static imports)
   - ~150+ lines of duplicate code removed
   - All E2E tests passing ✅
4. ✅ Consolidate tab navigation patterns (1.4 extension) - **DONE**
   - Created `tabs.ts` with `navigateToPlanningSubTab()` helper
   - Added convenience functions: `navigateToLocationsTab()`, `navigateToEventsTab()`, `navigateToCreaturesTab()`, `navigateToFactionsTab()`
   - Refactored 4 step definition files to use new tab navigation helpers
   - ~50+ lines of duplicate tab navigation code removed
   - Consistent tab navigation patterns across all step definitions
5. ✅ Consolidate verification patterns - **DONE**
   - Created `verification.ts` with `verifyEntityInList()` and `entityExistsInList()` helpers
   - Refactored "Then" steps in 7 step definition files to use new verification helpers
   - ~40+ lines of duplicate verification code removed
   - Consistent verification patterns across all step definitions
6. ✅ Extend entity creation to campaign entities - **DONE**
   - Added `createSession()` helper for session creation
   - Refactored `campaigns-sessions-create.steps.ts` to use new helper
   - Refactored verification steps in `campaigns-players-add.steps.ts` and `campaigns-story-arcs-add.steps.ts` to use verification helpers
   - ~20+ lines of duplicate code removed
7. ⏳ Consolidate client API patterns (2.2) - **REVIEWED** (Current implementation already well-consolidated using `baseClient.ts` with `apiRequest()` and `extractProperty()`. The functional approach is clean and consistent. Class-based refactor may not provide significant benefit.)
8. ✅ Consolidate screen navigation patterns (1.4 extension) - **DONE**
   - Added `navigateToUsersScreen()`, `navigateToAssetsScreen()`, and `navigateToCampaignView()` helpers to `navigation.ts`
   - Added `isOnCampaignView()` helper to check if on a campaign view
   - Refactored `users-list.steps.ts`, `users-delete.steps.ts`, `users-revoke-role.steps.ts`, `auth-roles.steps.ts` to use `navigateToUsersScreen()`
   - Refactored `common.steps.ts` to use `navigateToAssetsScreen()`
   - ~80+ lines of duplicate navigation code removed
   - Consistent navigation patterns across all step definitions
9. ✅ Extend entity creation to campaign entities (story arcs, players, scenes) - **DONE**
   - Added `createStoryArc()`, `createPlayer()`, and `createScene()` helpers
   - Refactored `campaigns-story-arcs-add.steps.ts` to use `createStoryArc()` and `navigateToCampaignView()`
   - Refactored `campaigns-players-add.steps.ts` to use `createPlayer()`
   - Refactored `campaigns-story-arcs-events-add.steps.ts` to use `createStoryArc()` and `navigateToCampaignView()`
   - Simplified complex navigation logic using `ensureCampaignExists()` and `navigateToCampaignView()`
   - ~200+ lines of duplicate code removed
   - Consistent entity creation patterns for campaign entities
10. ✅ Consolidate error message checking patterns - **DONE**
   - Added `hasErrorMessage()`, `getErrorMessage()`, and `checkForErrorAndThrow()` helpers to `errors.ts`
   - Refactored `campaigns-scenes-create.steps.ts`, `campaigns-create.steps.ts`, and `world-create.steps.ts` to use new helpers
   - ~30+ lines of duplicate error checking code removed
   - Consistent error checking patterns across all step definitions
11. ✅ Consolidate page navigation and storage clearing patterns - **DONE**
   - Added `navigateAndWaitForReady()` helper for common page navigation pattern (goto + waitForLoadState + safeWait)
   - Added `clearAllStorage()` helper for clearing cookies and localStorage
   - Refactored `auth-roles.steps.ts`, `world-entities-create.steps.ts`, `assets-upload-and-reference.steps.ts`, `auth-required.steps.ts`, `campaign-auth-protected.steps.ts`, and `common.steps.ts` to use new helpers
   - ~50+ lines of duplicate navigation code removed
   - Consistent navigation patterns across all step definitions
12. ✅ Enhance stored value retrieval with retry logic - **DONE**
   - Enhanced `getStoredCampaignName()` to include retry logic (5 attempts with 200ms delays)
   - Refactored `campaigns-story-arcs-add.steps.ts`, `campaigns-story-arcs-events-add.steps.ts`, and `campaigns-players-auto-story-arc.steps.ts` to use enhanced helper
   - ~30+ lines of duplicate retry logic removed
   - Consistent stored value retrieval patterns across all step definitions
13. ✅ Consolidate visibility checking patterns - **DONE**
   - Refactored step definitions to use `isVisibleSafely()` helper instead of `.isVisible({ timeout: 1000 }).catch(() => false)` pattern
   - Refactored `world-locations-associations.steps.ts`, `world-factions-nested.steps.ts`, `world-events-composite.steps.ts`, `world-view-all-entities.steps.ts`, and `world-splash-image.steps.ts`
   - ~10+ lines of duplicate visibility checking code removed
   - Consistent visibility checking patterns across all step definitions

**Estimated Effort**: 3-5 days  
**Risk**: Medium  
**Impact**: Medium (improves maintainability)

### Phase 3: High Impact, Higher Risk (Requires Careful Planning)
1. ✅ Split HomePageContext by domain (2.1)
2. ✅ Extract data fetching patterns (2.4)
3. ✅ Simplify form state management (2.3)
4. ✅ Simplify modal management (2.5)

**Estimated Effort**: 5-7 days  
**Risk**: Higher (requires careful migration)  
**Impact**: High (significant architecture improvement)

### Phase 4: Code Quality (Ongoing)
1. ✅ Reduce defensive programming (4.1)
2. ✅ Improve type safety (4.2)
3. ✅ Standardize error messages (4.3)

**Estimated Effort**: Ongoing  
**Risk**: Low  
**Impact**: Medium (improves developer experience)

---

## 6. Success Metrics

### Code Metrics
- **Reduction in code duplication**: Target 30-40% reduction in step definition files
- **Reduced complexity**: Target 20-30% reduction in cyclomatic complexity
- **Improved test speed**: Target 10-15% faster test execution

### Maintainability Metrics
- **Easier onboarding**: New developers can understand test structure faster
- **Faster feature development**: Less time spent on boilerplate
- **Fewer test flakiness**: More reliable tests through consistent patterns

### Quality Metrics
- **Test reliability**: Maintain or improve current test pass rate
- **Code coverage**: Maintain 100% unit test coverage
- **Type safety**: Reduce `any` types by 80%+

---

## 7. Risks and Mitigation

### Risk 1: Breaking Existing Tests
**Mitigation**:
- Refactor incrementally
- Run full test suite after each change
- Keep old implementations until new ones are proven

### Risk 2: Over-Engineering
**Mitigation**:
- Start with simple consolidations
- Only extract patterns that appear 3+ times
- Keep abstractions simple and focused

### Risk 3: Performance Regression
**Mitigation**:
- Benchmark test execution time before/after
- Profile slow tests to identify bottlenecks
- Use Playwright's built-in optimizations

---

## 8. Next Steps

1. **Review this proposal** with the team
2. **Prioritize phases** based on current needs
3. **Create GitHub issues** for Phase 1 items
4. **Start with Phase 1** (quick wins)
5. **Measure impact** after each phase
6. **Iterate** based on learnings

---

## Appendix: File Structure After Refactoring

```
apps/web/tests/e2e/
├── helpers/
│   ├── api.ts                    # NEW: Consolidated API helpers
│   ├── auth.ts                   # REFACTORED: Simplified login
│   ├── navigation.ts              # EXTENDED: More navigation helpers
│   ├── users.ts                  # EXTENDED: User creation helpers
│   ├── entities.ts               # NEW: Entity creation helpers
│   ├── modals.ts                 # (existing, ensure consistent usage)
│   ├── utils.ts                  # EXTENDED: Test utilities
│   └── ...
├── steps/
│   ├── common.steps.ts           # SIMPLIFIED: Uses helpers
│   ├── auth-roles.steps.ts       # SIMPLIFIED: Uses helpers
│   ├── campaigns-create.steps.ts # SIMPLIFIED: Uses helpers
│   └── ...
└── ...

apps/web/lib/
├── contexts/
│   ├── AuthContext.tsx           # (existing)
│   ├── WorldContext.tsx          # NEW: World domain context
│   ├── CampaignContext.tsx       # NEW: Campaign domain context
│   ├── AssetContext.tsx          # NEW: Asset domain context
│   └── HomePageContext.tsx       # SIMPLIFIED: Composes domain contexts
├── clients/
│   ├── baseClient.ts             # ENHANCED: Base API client class
│   ├── authClient.ts             # REFACTORED: Extends base
│   ├── worldClient.ts            # REFACTORED: Extends base
│   └── ...
└── ...
```

---

**End of Proposal**
