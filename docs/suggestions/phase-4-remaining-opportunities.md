# Phase 4: Remaining Event-Driven Refactoring Opportunities

## Current State

We've successfully implemented:
- ✅ Modal transitions (open/close)
- ✅ Selection events (world/campaign selected, planning mode)
- ✅ Form submission & entity creation events
- ✅ View transition events (planning sub-tab, campaign view)
- ✅ Data loaded events

## Remaining Opportunities

### 1. Error Events (High Impact)

**Problem**: Tests poll for error messages using `getByTestId("error-message")` with timeouts.

**Current Pattern**:
```typescript
const errorVisible = await page.getByTestId("error-message").isVisible().catch(() => false);
if (errorVisible) {
  const errorText = await page.getByTestId("error-message").textContent();
}
```

**Proposed Events**:
- `ERROR_OCCURRED_EVENT` - Fires when `setError()` is called with a non-null value
- `ERROR_CLEARED_EVENT` - Fires when error is cleared

**Benefits**:
- Tests can wait for errors explicitly instead of polling
- More reliable error detection
- Better error context in event payload

**Implementation**:
- Dispatch in `useHomePageState.ts` when `error` state changes
- Create `waitForError(page, expectedMessage?, timeout)` helper

---

### 2. Delete/Update Events (Medium Impact)

**Problem**: Delete operations (users, potentially entities) don't dispatch events. Tests use timeouts and DOM checks.

**Current Pattern** (user deletion):
```typescript
await deleteButton.click();
await page.waitForTimeout(300);
await expect(userItem).not.toBeVisible({ timeout: 3000 });
```

**Proposed Events**:
- `USER_DELETED_EVENT` - Fires when user is successfully deleted
- `ENTITY_DELETED_EVENT` - For future entity deletion
- `ENTITY_UPDATED_EVENT` - For future entity updates

**Benefits**:
- Explicit confirmation of deletion
- No need for arbitrary timeouts
- Can include deleted entity details in event

**Implementation**:
- Dispatch in `handleDeleteUser` `onSuccess` callback
- Create `waitForUserDeleted(page, username, timeout)` helper

---

### 3. User Management Events (Medium Impact)

**Problem**: User creation and role assignment don't dispatch events.

**Current Pattern**:
```typescript
await createButton.click();
await page.waitForTimeout(1000);
await expect(userItem).toBeVisible();
```

**Proposed Events**:
- `USER_CREATED_EVENT` - Fires when user is created
- `ROLE_ASSIGNED_EVENT` - Fires when role is assigned
- `ROLE_REVOKED_EVENT` - Fires when role is revoked

**Benefits**:
- Consistent with other creation events
- More reliable than waiting for DOM updates
- Better test stability

**Implementation**:
- Dispatch in `handleCreateUser`, `handleAssignRole`, `handleRevokeRole` `onSuccess` callbacks
- Create corresponding wait helpers

---

### 4. Main Tab Navigation Events (Low-Medium Impact)

**Problem**: Tests navigate between main tabs (World, Campaigns, Sessions, Assets, Users) but don't have events.

**Current Pattern**:
```typescript
await page.getByRole("tab", { name: "Users" }).click();
await page.waitForTimeout(500);
```

**Proposed Events**:
- `MAIN_TAB_CHANGED_EVENT` - Fires when `activeTab` changes

**Benefits**:
- Consistent with planning sub-tab events
- Can wait for tab content to be ready
- Better navigation tracking

**Implementation**:
- Dispatch in `useHomePageState.ts` when `activeTab` changes
- Create `waitForMainTab(page, tabName, timeout)` helper

---

### 5. Replace Arbitrary Timeouts (Low Impact, High Volume)

**Problem**: Many `waitForTimeout()` calls throughout tests that could be replaced with events or more specific waits.

**Examples**:
- `await page.waitForTimeout(300);` - Often used after clicks
- `await page.waitForTimeout(500);` - Waiting for UI to "settle"
- `await page.waitForTimeout(1000);` - Waiting for data to load

**Strategy**:
- Replace with appropriate event waits where events exist
- Replace with `waitForLoadState` or other Playwright waits where appropriate
- Keep only when truly needed for animation/transition timing

**Benefits**:
- Faster tests (no unnecessary waiting)
- More reliable (wait for actual state, not time)
- Clearer intent (what are we waiting for?)

---

## Recommended Priority

1. **Error Events** (High) - Most tests check for errors, high impact
2. **User Management Events** (Medium) - User creation/role assignment are common operations
3. **Delete Events** (Medium) - Important for test reliability
4. **Main Tab Navigation** (Low-Medium) - Nice to have, less critical
5. **Replace Timeouts** (Low) - Incremental improvement, can be done gradually

## Implementation Notes

- All events should follow the same pattern as existing events
- Use `dispatchTransitionEvent` utility for consistency
- Include relevant context in event payload (entity IDs, names, etc.)
- Create corresponding e2e helpers with DOM fallbacks
- Update tests incrementally, starting with most flaky ones

## Example: Error Events Implementation

```typescript
// In useHomePageState.ts
useEffect(() => {
  const prevError = prevErrorRef.current;
  
  if (error && !prevError) {
    // Error occurred
    dispatchTransitionEvent(ERROR_OCCURRED_EVENT, {
      message: error,
      timestamp: Date.now()
    });
  } else if (!error && prevError) {
    // Error cleared
    dispatchTransitionEvent(ERROR_CLEARED_EVENT, {
      previousMessage: prevError
    });
  }
  
  prevErrorRef.current = error;
}, [error]);

// In helpers.ts
export async function waitForError(
  page: Page,
  expectedMessage?: string,
  timeout: number = 5000
): Promise<string> {
  const eventPromise = page.evaluate(
    ({ timeout, eventName, expectedMessage }) => {
      return new Promise<string>((resolve, reject) => {
        const handler = (e: CustomEvent) => {
          const message = e.detail?.message || "";
          if (!expectedMessage || message.includes(expectedMessage)) {
            window.removeEventListener(eventName, handler);
            clearTimeout(timer);
            resolve(message);
          }
        };
        window.addEventListener(eventName, handler);
        // ... timeout logic
      });
    },
    { timeout, eventName: ERROR_OCCURRED_EVENT, expectedMessage }
  );
  
  // DOM fallback
  const domPromise = (async () => {
    const errorElement = page.getByTestId("error-message");
    await expect(errorElement).toBeVisible({ timeout });
    return await errorElement.textContent() || "";
  })();
  
  return await Promise.race([eventPromise, domPromise]);
}
```
