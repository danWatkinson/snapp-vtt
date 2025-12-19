# E2E Test Performance Optimization Recommendations

## Executive Summary

Current test suite runs 37 tests in 37.0s with 11 workers. The slowest tests take 8-9 seconds, with most campaign/world creation tests taking 7.5-8.5 seconds. This document outlines recommendations to reduce test execution time by 30-50%.

**Target:** Reduce slowest tests from 8-9s to 4-5s, overall suite from 37s to 20-25s.

## Performance Analysis

### Slowest Tests (8+ seconds)
1. **world-splash-image.feature** - 9.0s (asset upload + world creation + navigation)
2. **world-view-all-entities.feature** - 8.8s (world creation + navigation)
3. **Campaign tests** - 7.5-8.4s (campaign creation + entity creation)
4. **assets-upload-and-reference.feature** - 8.5s (asset upload + entity reference)

### Common Bottlenecks Identified
1. **Excessive stability waits** - Multiple `safeWait()` calls with 50-500ms delays
2. **Redundant retry loops** - Up to 3 retry attempts with waits between each
3. **Long event timeouts** - 8000ms timeouts for world/campaign selection
4. **Sequential operations** - Operations that could run in parallel
5. **Redundant DOM checks** - Waiting for both events AND DOM state

## Recommendations

### Priority 1: Reduce Stability Waits (High Impact, Low Risk)

**Problem:** Multiple `safeWait()` calls add up to 1-2 seconds per test
- `STABILITY_WAIT_EXTRA` (300ms) used after clicks
- `STABILITY_WAIT_LONG * 2` (400ms) in retry loops
- Multiple waits in retry loops (up to 3 iterations × 200ms = 600ms)

**Solution:**
1. **Reduce stability wait values** by 50-70%:
   ```typescript
   // Current
   STABILITY_WAIT_SHORT = 50;
   STABILITY_WAIT_MEDIUM = 100;
   STABILITY_WAIT_LONG = 200;
   STABILITY_WAIT_EXTRA = 300;
   STABILITY_WAIT_MAX = 500;
   
   // Recommended
   STABILITY_WAIT_SHORT = 20;   // 60% reduction
   STABILITY_WAIT_MEDIUM = 50;  // 50% reduction
   STABILITY_WAIT_LONG = 100;   // 50% reduction
   STABILITY_WAIT_EXTRA = 150;  // 50% reduction
   STABILITY_WAIT_MAX = 250;    // 50% reduction
   ```

2. **Remove redundant waits** - If an event has fired, don't wait for stability
3. **Use event-driven waits instead of timeouts** - Replace `safeWait()` with event listeners where possible

**Expected Impact:** 0.5-1.5s reduction per test (15-30% improvement)

**Risk:** Low - These are defensive waits. Test with reduced values first.

---

### Priority 2: Optimize Navigation Retry Logic (High Impact, Medium Risk)

**Problem:** `selectWorldAndEnterPlanningMode` has up to 3 retry loops with waits:
- Initial click verification: 3 attempts × 200ms = 600ms
- Retry click: 3 attempts × 200ms = 600ms  
- Final mouse click: 1 attempt × 400ms = 400ms
- Total: Up to 1.6 seconds of waiting even when things work

**Solution:**
1. **Reduce retry attempts** from 3 to 2
2. **Use exponential backoff** instead of fixed waits
3. **Early exit on success** - Don't wait if event already fired
4. **Combine checks** - Check event status AND tab selection in parallel

**Example optimization:**
```typescript
// Instead of 3 retries with fixed waits:
for (let i = 0; i < 3; i++) {
  clickedSelected = await checkSelection();
  if (clickedSelected) break;
  await safeWait(page, STABILITY_WAIT_LONG); // 200ms × 3 = 600ms
}

// Use 2 retries with exponential backoff:
for (let i = 0; i < 2; i++) {
  clickedSelected = await checkSelection();
  if (clickedSelected) break;
  await safeWait(page, STABILITY_WAIT_SHORT * (i + 1)); // 20ms, 40ms = 60ms
}
```

**Expected Impact:** 0.5-1.0s reduction per navigation operation

**Risk:** Medium - Need to ensure tests still pass with fewer retries

---

### Priority 3: Reduce Event Timeout Values (Medium Impact, Low Risk)

**Problem:** Long timeouts (8000ms) for world/campaign selection even when events fire quickly

**Solution:**
1. **Reduce default event timeout** from 8000ms to 5000ms for world/campaign selection
2. **Use shorter timeouts for fast operations** - 3000ms for tab clicks, 5000ms for creation
3. **Implement adaptive timeouts** - Start with short timeout, extend if needed

**Example:**
```typescript
// Current
const worldSelectedPromise = waitForWorldSelected(page, worldName, 8000);
const planningModePromise = waitForPlanningMode(page, 8000);

// Recommended
const worldSelectedPromise = waitForWorldSelected(page, worldName, 5000);
const planningModePromise = waitForPlanningMode(page, 5000);
```

**Expected Impact:** 0.2-0.5s reduction per test (when events fire quickly)

**Risk:** Low - Events typically fire within 1-2 seconds

---

### Priority 4: Optimize Asset Upload Tests (High Impact, Low Risk)

**Problem:** Asset upload tests are slow due to:
- File upload operations (network I/O)
- Waiting for upload completion
- Multiple asset uploads in same test

**Solution:**
1. **Use smaller test files** - Reduce image/audio file sizes for test assets
2. **Mock asset uploads** where possible - Use test fixtures instead of real uploads
3. **Parallelize asset uploads** - If test needs multiple assets, upload in parallel
4. **Cache uploaded assets** - Reuse assets across tests instead of re-uploading

**Example:**
```typescript
// Instead of uploading same asset multiple times:
// Test 1: Upload "approaching-nuln.jpg"
// Test 2: Upload "approaching-nuln.jpg" again

// Use shared test setup:
// Before all: Upload "approaching-nuln.jpg" once
// Tests: Reference existing asset
```

**Expected Impact:** 1-2s reduction for asset upload tests

**Risk:** Low - Can use test fixtures or smaller files

---

### Priority 5: Parallelize Independent Operations (Medium Impact, Medium Risk)

**Problem:** Some operations wait sequentially when they could run in parallel

**Solution:**
1. **Parallel event waits** - Already doing this with `Promise.allSettled`, but can optimize
2. **Parallel DOM checks** - Check multiple conditions simultaneously
3. **Batch operations** - Group related operations together

**Example:**
```typescript
// Current: Sequential
await waitForWorldSelected(page, worldName, 8000);
await waitForPlanningMode(page, 8000);
await checkPlanningTabsVisible(page);

// Optimized: Parallel with early exit
const [worldSelected, planningMode, tabsVisible] = await Promise.allSettled([
  waitForWorldSelected(page, worldName, 5000),
  waitForPlanningMode(page, 5000),
  checkPlanningTabsVisible(page, 5000)
]);
// Use first successful result
```

**Expected Impact:** 0.3-0.7s reduction per test

**Risk:** Medium - Need to ensure parallel operations don't interfere

---

### Priority 6: Remove Redundant DOM Checks (Low Impact, Low Risk)

**Problem:** Some code waits for both events AND DOM state, which is redundant

**Solution:**
1. **Prefer events over DOM checks** - Events fire faster than DOM updates
2. **Use DOM checks only as fallback** - If event doesn't fire, then check DOM
3. **Remove duplicate waits** - Don't wait for same condition twice

**Example:**
```typescript
// Current: Wait for both
await planningModePromise; // Event
await expect(planningTabs).toBeVisible(); // DOM check

// Optimized: Event first, DOM as fallback
try {
  await planningModePromise;
} catch {
  await expect(planningTabs).toBeVisible(); // Only if event fails
}
```

**Expected Impact:** 0.1-0.3s reduction per test

**Risk:** Low - DOM checks are already fallbacks

---

### Priority 7: Optimize Test Setup/Teardown (Medium Impact, Low Risk)

**Problem:** Each test may be doing redundant setup (login, navigation)

**Solution:**
1. **Use Playwright fixtures** for shared setup (login, world/campaign creation)
2. **Reuse test data** - Create worlds/campaigns once, reuse across tests
3. **Optimize Background steps** - Ensure Background steps are efficient

**Example:**
```typescript
// Use Playwright fixtures
test.use({
  loggedInPage: async ({ page }, use) => {
    await loginAs(page, "admin", "admin");
    await use(page);
  }
});
```

**Expected Impact:** 0.5-1.0s reduction per test (if setup is optimized)

**Risk:** Low - Fixtures are standard Playwright practice

---

## Implementation Plan

### Phase 1: Quick Wins (1-2 hours)
1. ✅ Reduce stability wait values by 50%
2. ✅ Reduce event timeouts from 8000ms to 5000ms
3. ✅ Remove redundant DOM checks where events are used

**Expected Result:** 20-30% improvement (37s → 26-30s)

### Phase 2: Navigation Optimization (2-3 hours)
1. ✅ Optimize retry logic in `selectWorldAndEnterPlanningMode`
2. ✅ Reduce retry attempts from 3 to 2
3. ✅ Implement exponential backoff

**Expected Result:** Additional 10-15% improvement (26-30s → 22-26s)

### Phase 3: Asset Upload Optimization (2-3 hours)
1. ✅ Use smaller test asset files
2. ✅ Implement asset caching/reuse
3. ✅ Parallelize asset uploads where possible

**Expected Result:** Additional 5-10% improvement for asset tests (22-26s → 20-24s)

### Phase 4: Advanced Optimizations (3-4 hours)
1. ✅ Further parallelize operations
2. ✅ Optimize test fixtures
3. ✅ Profile and optimize specific slow operations

**Expected Result:** Additional 5-10% improvement (20-24s → 18-22s)

## Metrics to Track

1. **Individual test times** - Track before/after for each test
2. **Total suite time** - Overall execution time
3. **Flakiness rate** - Ensure optimizations don't increase failures
4. **Worker utilization** - Ensure workers are being used efficiently

## Risk Mitigation

1. **Gradual rollout** - Implement changes incrementally
2. **Monitor flakiness** - Watch for increased test failures
3. **Keep fallbacks** - Maintain DOM checks as fallbacks for events
4. **Test in CI** - Verify changes work in CI environment

## Expected Final Results

**Before:** 37 tests in 37.0s (average 1.0s/test, slowest 9.0s)
**After:** 37 tests in 18-22s (average 0.5-0.6s/test, slowest 4-5s)

**Improvement:** 40-50% faster test execution

## Notes

- These optimizations focus on reducing wait times and redundant operations
- The actual application performance is not being changed
- All optimizations maintain test reliability and accuracy
- Some optimizations may require testing to find optimal values
