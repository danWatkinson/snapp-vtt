# Next Phase: Selection & View Transition Events

## Current State

We've successfully implemented modal transition events (`MODAL_OPENED_EVENT`, `MODAL_CLOSED_EVENT`), which has significantly improved e2e test reliability. The next logical step is to add events for **selection state changes** and **view transitions**.

## Problem Statement

Currently, e2e tests check for DOM elements to determine state:
- Checking if "World context" tablist is visible
- Checking if planning tabs are visible
- Checking if specific tabs (Creatures, Events, etc.) are visible
- Polling for text content to verify selections

This is fragile because:
1. **Timing issues**: DOM may not be updated when we check
2. **Race conditions**: Concurrent test execution can cause state mismatches
3. **Brittle selectors**: Tests break when UI structure changes
4. **No clear state**: Hard to know when a selection is "complete" vs "in progress"

## Proposed Events

### Selection Events

```typescript
// World selection
export const WORLD_SELECTED_EVENT = "snapp:world-selected";
export const WORLD_DESELECTED_EVENT = "snapp:world-deselected";

// Campaign selection  
export const CAMPAIGN_SELECTED_EVENT = "snapp:campaign-selected";
export const CAMPAIGN_DESELECTED_EVENT = "snapp:campaign-deselected";

// Entity selection (for future use)
export const ENTITY_SELECTED_EVENT = "snapp:entity-selected";
```

### View/Planning Mode Events

```typescript
// Planning mode transitions
export const PLANNING_MODE_ENTERED_EVENT = "snapp:planning-mode-entered";
export const PLANNING_MODE_EXITED_EVENT = "snapp:planning-mode-exited";

// Sub-tab navigation within planning mode
export const PLANNING_SUBTAB_CHANGED_EVENT = "snapp:planning-subtab-changed";

// Campaign view changes (sessions vs story-arcs)
export const CAMPAIGN_VIEW_CHANGED_EVENT = "snapp:campaign-view-changed";
```

### Data Loaded Events

```typescript
// Data loading completion
export const WORLDS_LOADED_EVENT = "snapp:worlds-loaded";
export const CAMPAIGNS_LOADED_EVENT = "snapp:campaigns-loaded";
export const ENTITIES_LOADED_EVENT = "snapp:entities-loaded";
export const SESSIONS_LOADED_EVENT = "snapp:sessions-loaded";
export const PLAYERS_LOADED_EVENT = "snapp:players-loaded";
export const STORY_ARCS_LOADED_EVENT = "snapp:story-arcs-loaded";
```

## Event Payload Structure

All events should include:
- **Entity ID**: The ID of the selected/loaded entity
- **Entity Name**: Human-readable name (for debugging)
- **Timestamp**: When the event occurred
- **Context**: Additional context (e.g., worldId for campaign selection)

Example:
```typescript
{
  worldId: "world-123",
  worldName: "Eldoria",
  timestamp: 1234567890,
  previousWorldId: "world-456" // for deselection events
}
```

## Implementation Strategy

### Phase 1: Selection Events (Highest Priority)

1. **Add event constants** to `apps/web/lib/auth/authEvents.ts`
2. **Dispatch events in state setters**:
   - In `useHomePageState.ts`: Dispatch when `selectedIds.worldId` changes
   - In `useHomePageState.ts`: Dispatch when `selectedIds.campaignId` changes
   - Use `useEffect` to watch for state changes (similar to modal events)

3. **Update e2e helpers**:
   - `waitForWorldSelected(page, worldName, timeout)`
   - `waitForCampaignSelected(page, campaignName, timeout)`
   - `waitForPlanningMode(page, timeout)`

4. **Refactor existing tests**:
   - Replace `selectWorldAndEnterPlanningMode` to use events
   - Replace DOM checks with event listeners

### Phase 2: View Transition Events

1. **Add event constants**
2. **Dispatch when**:
   - `activeMode` changes to/from "plan"
   - `planningSubTab` changes
   - `campaignView` changes

3. **Update e2e helpers**:
   - `waitForPlanningSubTab(page, subTab, timeout)`
   - `waitForCampaignView(page, view, timeout)`

### Phase 3: Data Loaded Events

1. **Add event constants**
2. **Dispatch when**:
   - Data fetch completes (in `useHomePageData.ts`)
   - `worldsLoaded`, `campaignsLoaded`, etc. become `true`

3. **Update e2e helpers**:
   - `waitForWorldsLoaded(page, timeout)`
   - `waitForCampaignsLoaded(page, timeout)`

## Benefits

### For E2E Tests

1. **More Reliable**: Events fire when state actually changes, not when DOM updates
2. **Faster**: No need to poll or wait for arbitrary timeouts
3. **Clearer Intent**: Tests express "wait for world to be selected" not "wait for tab to appear"
4. **Better Debugging**: Event timestamps help diagnose timing issues

### For Development

1. **Observable State**: Can debug state changes in browser console
2. **Integration Points**: Other parts of the app can react to selections
3. **Analytics Ready**: Events can be logged for user behavior analysis
4. **Future-Proof**: Foundation for more advanced features (undo/redo, state persistence)

## Example: Before vs After

### Before (DOM-based)
```typescript
// Wait for world tab to appear
await expect(page.getByRole("tab", { name: "Eldoria" })).toBeVisible();
await page.getByRole("tab", { name: "Eldoria" }).click();
// Wait for planning tabs to appear (hoping DOM updates)
await expect(page.getByRole("tablist", { name: "World planning views" })).toBeVisible();
// Still might not be ready - need arbitrary wait
await page.waitForTimeout(500);
```

### After (Event-based)
```typescript
// Set up listener before action
const worldSelected = waitForWorldSelected(page, "Eldoria", 5000);
await page.getByRole("tab", { name: "Eldoria" }).click();
await worldSelected; // Wait for actual state change
// Planning mode entered automatically when world selected
await waitForPlanningMode(page, 3000);
```

## Migration Path

1. **Add events alongside existing checks** (non-breaking)
2. **Update helpers to use events with DOM fallback**
3. **Gradually migrate tests** to use event-based helpers
4. **Remove DOM fallbacks** once stable

## Considerations

1. **Event Timing**: Use `useEffect` to dispatch after React render (like modals)
2. **Event Ordering**: Ensure events fire in logical order (world selected → planning mode entered)
3. **Error Handling**: What if event doesn't fire? Keep DOM fallback initially
4. **Performance**: Events are lightweight, but avoid excessive listeners

## Next Steps

1. ✅ Review and approve this proposal
2. Implement Phase 1 (Selection Events)
3. Update `selectWorldAndEnterPlanningMode` to use events
4. Migrate failing tests to event-based approach
5. Measure improvement in test reliability
