# Transition Events Architecture - Suggestions for E2E Test Improvement

## Current State

The codebase has a basic event-driven architecture using custom DOM events:
- **Action Events**: `OPEN_LOGIN_EVENT`, `OPEN_USER_MANAGEMENT_EVENT`, `OPEN_CREATE_WORLD_EVENT`, etc.
- **State Events**: `AUTH_EVENT` (auth state changes)

E2E tests currently rely heavily on:
- `waitForTimeout()` with arbitrary delays
- Polling for element visibility (`isVisible()`, `waitFor()`)
- `Promise.race()` to wait for multiple possible outcomes
- Defensive checks and retries

This leads to:
- Flaky tests due to timing issues
- Slow tests due to conservative timeouts
- Complex test helpers with extensive retry logic

## Proposed Transition Events

### 1. Modal Transition Events

**Purpose**: Signal when modals open/close, allowing tests to wait for completion rather than polling.

```typescript
// In apps/web/lib/auth/authEvents.ts
export const MODAL_OPENED_EVENT = "snapp:modal-opened";
export const MODAL_CLOSED_EVENT = "snapp:modal-closed";

// Event detail structure
interface ModalEventDetail {
  modalType: "login" | "world" | "campaign" | "user-management" | "create-user" | "entity" | "session" | "player" | "story-arc" | "scene";
  timestamp: number;
}
```

**Implementation Points**:
- Dispatch `MODAL_OPENED_EVENT` when modal state transitions to open
- Dispatch `MODAL_CLOSED_EVENT` when modal state transitions to closed
- Include `modalType` in event detail for specificity

**E2E Benefit**: 
```typescript
// Instead of:
await page.waitForTimeout(500);
await expect(loginDialog).toBeVisible({ timeout: 5000 });

// Use:
await page.waitForEvent("snapp:modal-opened", { 
  predicate: (e) => e.detail.modalType === "login" 
});
```

### 2. Tab/Section Navigation Events

**Purpose**: Signal when navigation between tabs/sections completes.

```typescript
export const TAB_CHANGED_EVENT = "snapp:tab-changed";
export const MODE_CHANGED_EVENT = "snapp:mode-changed";
export const PLANNING_SUBTAB_CHANGED_EVENT = "snapp:planning-subtab-changed";

interface TabChangedEventDetail {
  from: string | null;
  to: string;
  timestamp: number;
}

interface ModeChangedEventDetail {
  from: string | null;
  to: string | null;
  timestamp: number;
}
```

**Implementation Points**:
- Dispatch when `activeTab` changes in `HomePageContext`
- Dispatch when `activeMode` changes (plan/view/null)
- Dispatch when `planningSubTab` changes

**E2E Benefit**:
```typescript
// Instead of:
await page.waitForSelector('[data-component="UsersTab"]', { timeout: 3000 });

// Use:
await page.waitForEvent("snapp:tab-changed", {
  predicate: (e) => e.detail.to === "Users"
});
```

### 3. Selection/Context Change Events

**Purpose**: Signal when world/campaign/entity selections change.

```typescript
export const WORLD_SELECTED_EVENT = "snapp:world-selected";
export const WORLD_DESELECTED_EVENT = "snapp:world-deselected";
export const CAMPAIGN_SELECTED_EVENT = "snapp:campaign-selected";
export const CAMPAIGN_DESELECTED_EVENT = "snapp:campaign-deselected";
export const ENTITY_SELECTED_EVENT = "snapp:entity-selected";

interface SelectionEventDetail {
  id: string;
  name?: string;
  timestamp: number;
}
```

**Implementation Points**:
- Dispatch when `selectedIds.worldId` changes
- Dispatch when `selectedIds.campaignId` changes
- Dispatch when `selectedIds.entityId` changes
- Include entity name/id in detail for verification

**E2E Benefit**:
```typescript
// Instead of:
await page.waitForTimeout(500);
await expect(page.getByRole("tablist", { name: "World planning views" })).toBeVisible();

// Use:
await page.waitForEvent("snapp:world-selected", {
  predicate: (e) => e.detail.id === expectedWorldId
});
```

### 4. Data Loading Events

**Purpose**: Signal when async data loads complete, replacing visibility polling.

```typescript
export const DATA_LOADED_EVENT = "snapp:data-loaded";
export const DATA_LOAD_FAILED_EVENT = "snapp:data-load-failed";

interface DataLoadedEventDetail {
  dataType: "worlds" | "campaigns" | "entities" | "sessions" | "players" | "storyArcs" | "scenes" | "users" | "assets" | "timeline";
  count?: number;
  worldId?: string; // For world-scoped data
  campaignId?: string; // For campaign-scoped data
  timestamp: number;
}
```

**Implementation Points**:
- Dispatch in `useHomePageData` when data fetch completes
- Dispatch when `setWorldsLoaded(true)`, `setCampaignsLoaded(true)`, etc.
- Include count and scope in detail

**E2E Benefit**:
```typescript
// Instead of:
await page.waitForTimeout(2000);
const worldTab = await page.getByRole("tab", { name: worldName }).isVisible();

// Use:
await page.waitForEvent("snapp:data-loaded", {
  predicate: (e) => e.detail.dataType === "worlds" && e.detail.count > 0
});
await page.waitForEvent("snapp:world-selected", {
  predicate: (e) => e.detail.name === worldName
});
```

### 5. Form Submission Events

**Purpose**: Signal when forms submit successfully or fail.

```typescript
export const FORM_SUBMITTED_EVENT = "snapp:form-submitted";
export const FORM_SUBMIT_FAILED_EVENT = "snapp:form-submit-failed";

interface FormSubmittedEventDetail {
  formType: "login" | "world" | "campaign" | "user" | "entity" | "session" | "player" | "story-arc" | "scene";
  success: boolean;
  entityId?: string; // For create operations
  entityName?: string;
  error?: string;
  timestamp: number;
}
```

**Implementation Points**:
- Dispatch in form handlers after API call completes
- Include success/failure status
- Include created entity info on success

**E2E Benefit**:
```typescript
// Instead of:
await page.getByRole("button", { name: "Save world" }).click();
await Promise.race([
  createWorldDialog.waitFor({ state: "hidden", timeout: 3000 }),
  page.getByTestId("error-message").waitFor({ timeout: 3000 })
]);

// Use:
await page.getByRole("button", { name: "Save world" }).click();
const event = await page.waitForEvent("snapp:form-submitted", {
  predicate: (e) => e.detail.formType === "world"
});
expect(event.detail.success).toBe(true);
expect(event.detail.entityName).toBe(worldName);
```

### 6. Authentication Flow Events

**Purpose**: More granular auth events beyond `AUTH_EVENT`.

```typescript
export const LOGIN_STARTED_EVENT = "snapp:login-started";
export const LOGIN_COMPLETED_EVENT = "snapp:login-completed";
export const LOGIN_FAILED_EVENT = "snapp:login-failed";
export const LOGOUT_COMPLETED_EVENT = "snapp:logout-completed";

interface LoginEventDetail {
  username: string;
  timestamp: number;
  error?: string; // For failed events
}
```

**Implementation Points**:
- Dispatch when login form is submitted
- Dispatch when login API call completes (success/failure)
- Dispatch when logout completes

**E2E Benefit**:
```typescript
// Instead of:
await passwordInput.press("Enter");
await Promise.race([
  loginDialog.waitFor({ state: "hidden", timeout: 5000 }),
  page.getByRole("button", { name: "Log out" }).waitFor({ state: "visible", timeout: 5000 })
]);

// Use:
await passwordInput.press("Enter");
const event = await page.waitForEvent("snapp:login-completed");
expect(event.detail.username).toBe(expectedUsername);
```

## Implementation Strategy

### Phase 1: Core Infrastructure
1. **Event Dispatcher Utility**
   ```typescript
   // apps/web/lib/utils/eventDispatcher.ts
   export function dispatchTransitionEvent(
     eventName: string,
     detail: Record<string, any>
   ) {
     if (typeof window === "undefined") return;
     window.dispatchEvent(
       new CustomEvent(eventName, {
         detail: { ...detail, timestamp: Date.now() }
       })
     );
   }
   ```

2. **Event Constants File**
   - Extend `apps/web/lib/auth/authEvents.ts` or create `apps/web/lib/events/transitionEvents.ts`
   - Export all transition event names

### Phase 2: High-Value Events (Start Here)
Focus on events that will have the biggest impact on test reliability:

1. **Form Submission Events** - Replace most `Promise.race()` patterns
2. **Modal Events** - Replace modal visibility polling
3. **Selection Events** - Replace world/campaign selection polling

### Phase 3: Navigation & Data Events
1. **Tab/Mode Change Events** - Replace tab visibility checks
2. **Data Loading Events** - Replace data availability polling

### Phase 4: Authentication Events
1. **Granular Auth Events** - Replace login/logout polling

## E2E Test Helper Updates

Create new helper functions that use events:

```typescript
// apps/web/tests/e2e/helpers.ts

/**
 * Wait for a modal to open
 */
export async function waitForModalOpen(
  page: Page,
  modalType: string
): Promise<CustomEvent> {
  return page.evaluateHandle((type) => {
    return new Promise((resolve) => {
      const handler = (e: CustomEvent) => {
        if (e.detail.modalType === type) {
          window.removeEventListener("snapp:modal-opened", handler);
          resolve(e);
        }
      };
      window.addEventListener("snapp:modal-opened", handler);
    });
  }, modalType);
}

/**
 * Wait for a form submission to complete
 */
export async function waitForFormSubmission(
  page: Page,
  formType: string
): Promise<CustomEvent> {
  return page.evaluateHandle((type) => {
    return new Promise((resolve) => {
      const handler = (e: CustomEvent) => {
        if (e.detail.formType === type) {
          window.removeEventListener("snapp:form-submitted", handler);
          resolve(e);
        }
      };
      window.addEventListener("snapp:form-submitted", handler);
    });
  }, formType);
}

/**
 * Wait for a world to be selected
 */
export async function waitForWorldSelection(
  page: Page,
  worldName?: string
): Promise<CustomEvent> {
  return page.evaluateHandle((name) => {
    return new Promise((resolve) => {
      const handler = (e: CustomEvent) => {
        if (!name || e.detail.name === name) {
          window.removeEventListener("snapp:world-selected", handler);
          resolve(e);
        }
      };
      window.addEventListener("snapp:world-selected", handler);
    });
  }, worldName);
}
```

## Migration Path

1. **Add events incrementally** - Start with one category (e.g., form submissions)
2. **Update tests gradually** - Convert one test at a time to use events
3. **Keep old patterns temporarily** - Don't remove `waitForTimeout` immediately
4. **Measure improvement** - Track test flakiness and speed before/after

## Example: Complete Flow

**Before** (current approach):
```typescript
// Click create world button
await page.getByRole("button", { name: "Create world" }).click();
await page.waitForTimeout(500); // Arbitrary delay

// Wait for modal
const dialog = page.getByRole("dialog", { name: /create world/i });
await expect(dialog).toBeVisible({ timeout: 3000 });

// Fill form
await page.getByLabel("World name").fill(worldName);
await page.getByLabel("Description").fill(description);
await page.getByRole("button", { name: "Save world" }).click();

// Wait for completion (unreliable)
await Promise.race([
  dialog.waitFor({ state: "hidden", timeout: 3000 }),
  page.getByTestId("error-message").waitFor({ timeout: 3000 })
]);

// Check if world appeared
await page.waitForTimeout(500);
const worldTab = await page.getByRole("tab", { name: worldName }).isVisible();
```

**After** (with transition events):
```typescript
// Click create world button
await page.getByRole("button", { name: "Create world" }).click();

// Wait for modal to open
await waitForModalOpen(page, "world");

// Fill form
await page.getByLabel("World name").fill(worldName);
await page.getByLabel("Description").fill(description);
await page.getByRole("button", { name: "Save world" }).click();

// Wait for form submission
const submitEvent = await waitForFormSubmission(page, "world");
expect(submitEvent.detail.success).toBe(true);
expect(submitEvent.detail.entityName).toBe(worldName);

// Wait for world to be selected (if auto-selected)
await waitForWorldSelection(page, worldName);
```

## Benefits Summary

1. **Reliability**: Tests wait for actual state changes, not arbitrary timeouts
2. **Speed**: No need for conservative timeouts - tests proceed as soon as events fire
3. **Clarity**: Test intent is clearer - "wait for login to complete" vs "wait 5 seconds"
4. **Debugging**: Event details provide context about what happened
5. **Maintainability**: Less defensive code, fewer retries, simpler test helpers

## Next Steps

1. Review and prioritize which events to implement first
2. Create the event dispatcher utility
3. Add first set of events (suggest starting with form submissions)
4. Update one test to use events as a proof of concept
5. Measure improvement and iterate
