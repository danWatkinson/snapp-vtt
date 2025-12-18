# Transition Events Architecture - Implementation Guide

## Overview

This directory contains suggestions for enhancing the event-driven architecture in the UI to improve E2E test reliability and speed.

## Documents

1. **[transition-events-architecture.md](./transition-events-architecture.md)** - Comprehensive guide covering:
   - Current state analysis
   - Proposed transition events
   - Implementation strategy
   - E2E test helper updates
   - Migration path

2. **[transition-events-implementation-example.ts](./transition-events-implementation-example.ts)** - Practical code examples showing:
   - Event constants
   - Event dispatcher utility
   - How to add events to existing code
   - Updated E2E test helpers
   - Before/after test examples

## Quick Start: Recommended Implementation Order

### Step 1: Infrastructure (1-2 hours)
Create the foundation:
- `apps/web/lib/utils/eventDispatcher.ts` - Event dispatcher utility
- Add event constants to `apps/web/lib/auth/authEvents.ts`

### Step 2: Form Submission Events (2-3 hours) - **START HERE**
Highest impact on test reliability:
- Add `FORM_SUBMITTED_EVENT` and `FORM_SUBMIT_FAILED_EVENT` to form handlers
- Update one test (e.g., world creation) to use events
- Measure improvement in test speed and reliability

### Step 3: Modal Events (1-2 hours)
Replace modal visibility polling:
- Add `MODAL_OPENED_EVENT` and `MODAL_CLOSED_EVENT`
- Update modal open/close logic
- Update tests that interact with modals

### Step 4: Selection Events (2-3 hours)
Replace world/campaign selection polling:
- Add `WORLD_SELECTED_EVENT`, `CAMPAIGN_SELECTED_EVENT`
- Update selection logic in `HomePageContext`
- Update `selectWorldAndEnterPlanningMode` helper

### Step 5: Navigation Events (1-2 hours)
Replace tab visibility checks:
- Add `TAB_CHANGED_EVENT`, `MODE_CHANGED_EVENT`
- Update tab/mode change logic
- Update navigation tests

### Step 6: Data Loading Events (2-3 hours)
Replace data availability polling:
- Add `DATA_LOADED_EVENT`
- Update data loading logic
- Update tests that wait for data

## Expected Benefits

### Before (Current State)
- Tests use `waitForTimeout()` with arbitrary delays (500ms, 1000ms, 2000ms)
- Tests poll for element visibility with `waitFor()` and `isVisible()`
- Tests use `Promise.race()` to wait for multiple outcomes
- Complex retry logic in helpers
- Flaky tests due to timing issues
- Slow tests due to conservative timeouts

### After (With Transition Events)
- Tests wait for actual state changes via events
- No arbitrary timeouts - tests proceed as soon as events fire
- Clearer test intent - "wait for login to complete" vs "wait 5 seconds"
- Simpler test helpers - less defensive code
- More reliable tests - events fire when state actually changes
- Faster tests - no need for conservative timeouts

## Key Principles

1. **Events fire when state changes complete** - Not when they start
2. **Events include relevant context** - Entity IDs, names, counts, etc.
3. **Events are typed** - TypeScript interfaces for event details
4. **Events are testable** - E2E tests can wait for them
5. **Events are optional** - Don't break existing code that doesn't use them

## Example Impact

### Test Speed Improvement
- **Before**: World creation test ~8-12 seconds (with timeouts and retries)
- **After**: World creation test ~3-5 seconds (waiting for events)

### Test Reliability Improvement
- **Before**: ~5-10% flakiness rate (timing-dependent failures)
- **After**: <1% flakiness rate (events fire when state actually changes)

### Code Complexity Reduction
- **Before**: `selectWorldAndEnterPlanningMode` helper ~600 lines with extensive retry logic
- **After**: Helper ~200 lines, using events for state transitions

## Next Steps

1. Review the architecture document
2. Review the implementation examples
3. Start with Step 1 (Infrastructure)
4. Implement Step 2 (Form Submission Events) as proof of concept
5. Measure improvement and iterate

## Questions or Concerns?

Consider:
- **Performance**: Event dispatching is negligible overhead (native DOM events)
- **Compatibility**: Events don't break existing code - they're additive
- **Maintenance**: Events make code more maintainable by making state changes explicit
- **Testing**: Events make tests more reliable and faster
