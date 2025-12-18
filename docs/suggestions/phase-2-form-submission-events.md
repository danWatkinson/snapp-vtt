# Phase 2: Form Submission & Entity Creation Events

## Current State

We've successfully implemented:
- ✅ Modal transition events (open/close)
- ✅ Selection events (world/campaign selected, planning mode entered)

The next logical step is to add events for **form submission completion** and **entity creation**, which are currently handled by waiting for DOM updates.

## Problem Statement

Currently, after submitting a form (e.g., creating a world, entity, campaign), tests:
1. Wait for the modal to close
2. Poll for the new entity to appear in a list
3. Use arbitrary timeouts or retry logic
4. Check for error messages manually

This is fragile because:
- **Timing issues**: DOM may update before or after we check
- **Race conditions**: Entity might be created but not yet visible in the list
- **Brittle selectors**: Tests break when list structure changes
- **No clear completion signal**: Hard to know when submission is "done"

## Proposed Events

### Form Submission Events

```typescript
// Form submission completion
export const FORM_SUBMITTED_EVENT = "snapp:form-submitted";
export const FORM_SUBMISSION_FAILED_EVENT = "snapp:form-submission-failed";

// Entity creation (more specific)
export const ENTITY_CREATED_EVENT = "snapp:entity-created";
export const ENTITY_CREATION_FAILED_EVENT = "snapp:entity-creation-failed";
```

### Entity Type-Specific Events

```typescript
// World creation
export const WORLD_CREATED_EVENT = "snapp:world-created";
export const WORLD_CREATION_FAILED_EVENT = "snapp:world-creation-failed";

// Campaign creation
export const CAMPAIGN_CREATED_EVENT = "snapp:campaign-created";
export const CAMPAIGN_CREATION_FAILED_EVENT = "snapp:campaign-creation-failed";

// Entity creation (creatures, factions, locations, events)
export const CREATURE_CREATED_EVENT = "snapp:creature-created";
export const FACTION_CREATED_EVENT = "snapp:faction-created";
export const LOCATION_CREATED_EVENT = "snapp:location-created";
export const EVENT_CREATED_EVENT = "snapp:event-created";

// Session/Scene creation
export const SESSION_CREATED_EVENT = "snapp:session-created";
export const SCENE_CREATED_EVENT = "snapp:scene-created";
export const PLAYER_ADDED_EVENT = "snapp:player-added";
export const STORY_ARC_CREATED_EVENT = "snapp:story-arc-created";
```

## Event Payload Structure

All creation events should include:
- **Entity ID**: The ID of the created entity
- **Entity Name**: Human-readable name
- **Entity Type**: Type of entity (world, campaign, creature, etc.)
- **Timestamp**: When the event occurred
- **Context**: Additional context (e.g., worldId for entities, campaignId for sessions)

Example:
```typescript
{
  entityId: "world-123",
  entityName: "Eldoria",
  entityType: "world",
  timestamp: 1234567890,
  // For entities created within a world:
  worldId: "world-123"
}
```

## Implementation Strategy

### Step 1: Add Event Constants

Add to `apps/web/lib/auth/authEvents.ts`:
```typescript
// Form submission events
export const FORM_SUBMITTED_EVENT = "snapp:form-submitted";
export const FORM_SUBMISSION_FAILED_EVENT = "snapp:form-submission-failed";

// Entity creation events
export const WORLD_CREATED_EVENT = "snapp:world-created";
export const CAMPAIGN_CREATED_EVENT = "snapp:campaign-created";
export const CREATURE_CREATED_EVENT = "snapp:creature-created";
export const FACTION_CREATED_EVENT = "snapp:faction-created";
export const LOCATION_CREATED_EVENT = "snapp:location-created";
export const EVENT_CREATED_EVENT = "snapp:event-created";
export const SESSION_CREATED_EVENT = "snapp:session-created";
export const SCENE_CREATED_EVENT = "snapp:scene-created";
export const PLAYER_ADDED_EVENT = "snapp:player-added";
export const STORY_ARC_CREATED_EVENT = "snapp:story-arc-created";
```

### Step 2: Dispatch Events After Successful API Calls

In form submission handlers (likely in `useHomePageHandlers.ts` or form components):
- After successful API response, dispatch creation event
- After failed API response, dispatch failure event
- Include entity details in event payload

### Step 3: Create E2E Helpers

```typescript
// Wait for entity to be created
waitForEntityCreated(page, entityType, entityName, timeout)
waitForWorldCreated(page, worldName, timeout)
waitForCampaignCreated(page, campaignName, timeout)

// Wait for form submission to complete
waitForFormSubmission(page, formType, timeout)
```

### Step 4: Refactor Tests

Replace patterns like:
```typescript
// Before
await page.getByRole("button", { name: "Save world" }).click();
await waitForModalClose(page, "world", 5000);
await expect(worldContextTablist.getByRole("tab", { name: worldName })).toBeVisible();
```

With:
```typescript
// After
const worldCreated = waitForWorldCreated(page, worldName, 5000);
await page.getByRole("button", { name: "Save world" }).click();
await worldCreated; // Wait for actual creation, not just modal close
```

## Benefits

### For E2E Tests

1. **More Reliable**: Events fire when entity is actually created, not when DOM updates
2. **Faster**: No need to wait for modal close + list update separately
3. **Clearer Intent**: "Wait for world to be created" vs "Wait for modal to close then check list"
4. **Better Error Handling**: Failure events provide immediate feedback

### For Development

1. **Observable Operations**: Can debug entity creation in browser console
2. **Integration Points**: Other parts of app can react to entity creation
3. **Analytics Ready**: Events can be logged for user behavior
4. **Undo/Redo Foundation**: Events provide history of operations

## Example: Before vs After

### Before (DOM-based)
```typescript
// Submit form
await page.getByRole("button", { name: "Save creature" }).click();

// Wait for modal to close
await expect(page.getByRole("dialog", { name: "Add creature" })).toBeHidden({ timeout: 3000 });

// Wait for creature to appear in list
await expect(
  page.getByRole("listitem").filter({ hasText: "Dragon" }).first()
).toBeVisible({ timeout: 3000 });
```

### After (Event-based)
```typescript
// Set up listener before action
const creatureCreated = waitForEntityCreated(page, "creature", "Dragon", 5000);

// Submit form
await page.getByRole("button", { name: "Save creature" }).click();

// Wait for actual creation (event fires after API success and data update)
await creatureCreated;
// Creature is now guaranteed to exist in the list
```

## Migration Path

1. **Add events alongside existing checks** (non-breaking)
2. **Update helpers to use events with DOM fallback**
3. **Gradually migrate tests** to use event-based helpers
4. **Remove DOM fallbacks** once stable

## Considerations

1. **Event Timing**: Dispatch after API response AND after state update (use `useEffect`)
2. **Error Handling**: Dispatch failure events with error details
3. **Idempotency**: Handle cases where entity already exists
4. **Performance**: Events are lightweight, but avoid excessive listeners

## Next Steps

1. ✅ Review and approve this proposal
2. Implement form submission events for world creation (highest impact)
3. Extend to other entity types (campaigns, creatures, etc.)
4. Update e2e tests to use new events
5. Measure improvement in test reliability and speed
