# Web App Refactoring Plan

## Files Requiring Breakdown

### 1. WorldTab.tsx (1298 lines) - CRITICAL
**Current Issues:**
- Massive component handling too many responsibilities
- Complex entity rendering logic mixed with form logic
- Hard to test and maintain

**Breakdown Strategy:**
1. **WorldSelection.tsx** - World selection UI (~50 lines)
2. **EntityTypeFilter.tsx** - Entity type filter tabs (~40 lines)
3. **EntityList.tsx** - Main entity list rendering (~200 lines)
4. **LocationHierarchy.tsx** - Hierarchical location rendering (~150 lines)
5. **EntityListItem.tsx** - Individual entity item with relationships (~200 lines)
6. **EntityRelationshipDisplay.tsx** - Relationship display logic (~150 lines)
7. **EntityFormModal.tsx** - Entity creation form (~300 lines)
8. **EntityFormFields.tsx** - Entity-specific form fields (~200 lines)
9. **useEntityCrossReferences.ts** - Cross-reference loading hook (~150 lines)
10. **WorldTab.tsx** - Main orchestrator (~100 lines)

**Expected Result:** 10 focused files instead of 1 monolithic file

---

### 2. useHomePageHandlers.ts (1112 lines) - CRITICAL
**Current Issues:**
- All handlers in one file
- Repetitive patterns across handlers
- Hard to find specific handlers

**Breakdown Strategy:**
1. **useAuthHandlers.ts** - Login, logout (~100 lines)
2. **useUserHandlers.ts** - Create, delete, assign role, revoke role (~150 lines)
3. **useWorldHandlers.ts** - Create world, update splash (~100 lines)
4. **useEntityHandlers.ts** - Create entity with relationships (~250 lines)
5. **useCampaignHandlers.ts** - Create campaign, session, add player (~150 lines)
6. **useStoryArcHandlers.ts** - Create story arc, add event (~100 lines)
7. **useSceneHandlers.ts** - Create scene (~50 lines)
8. **useTimelineHandlers.ts** - Advance timeline (~50 lines)
9. **useHomePageHandlers.ts** - Main hook that combines all handlers (~100 lines)

**Expected Result:** 9 focused files instead of 1 monolithic file

---

### 3. navigation.ts (2444 lines) - Test Helper
**Current Issues:**
- Massive test helper file
- Likely contains many helper functions

**Breakdown Strategy:**
- Review structure first
- Break into domain-specific helpers:
  - `worldNavigation.ts`
  - `campaignNavigation.ts`
  - `userNavigation.ts`
  - `entityNavigation.ts`
  - etc.

**Expected Result:** Multiple focused test helper files

---

## Implementation Priority

1. **WorldTab.tsx** - Highest priority (user-facing, most complex)
2. **useHomePageHandlers.ts** - High priority (affects all tabs)
3. **navigation.ts** - Medium priority (test helpers, less critical)

---

## Benefits

- **Maintainability:** Easier to find and modify specific functionality
- **Testability:** Smaller units are easier to test
- **Readability:** Clear separation of concerns
- **Reusability:** Components can be reused in other contexts
- **Performance:** Better code splitting opportunities
