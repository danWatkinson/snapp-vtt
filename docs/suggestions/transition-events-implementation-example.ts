/**
 * Example Implementation: Transition Events
 * 
 * This file shows how to add transition events to the existing codebase.
 * Start with these high-impact events and expand from there.
 */

// ============================================================================
// 1. Event Constants (add to apps/web/lib/auth/authEvents.ts or new file)
// ============================================================================

export const MODAL_OPENED_EVENT = "snapp:modal-opened";
export const MODAL_CLOSED_EVENT = "snapp:modal-closed";
export const FORM_SUBMITTED_EVENT = "snapp:form-submitted";
export const FORM_SUBMIT_FAILED_EVENT = "snapp:form-submit-failed";
export const WORLD_SELECTED_EVENT = "snapp:world-selected";
export const WORLD_DESELECTED_EVENT = "snapp:world-deselected";
export const CAMPAIGN_SELECTED_EVENT = "snapp:campaign-selected";
export const TAB_CHANGED_EVENT = "snapp:tab-changed";
export const DATA_LOADED_EVENT = "snapp:data-loaded";

// ============================================================================
// 2. Event Dispatcher Utility (new file: apps/web/lib/utils/eventDispatcher.ts)
// ============================================================================

/**
 * Dispatches a transition event with consistent structure
 */
export function dispatchTransitionEvent(
  eventName: string,
  detail: Record<string, any>
): void {
  if (typeof window === "undefined") return;
  
  window.dispatchEvent(
    new CustomEvent(eventName, {
      detail: {
        ...detail,
        timestamp: Date.now()
      }
    })
  );
}

// ============================================================================
// 3. Update HomePageContext.tsx to dispatch events
// ============================================================================

// Example: Add modal events when modals open/close
// In useHomePageState or wherever modals are managed:

/*
import { dispatchTransitionEvent } from "../utils/eventDispatcher";
import { MODAL_OPENED_EVENT, MODAL_CLOSED_EVENT } from "../auth/authEvents";

// When opening a modal:
const openModal = (modalType: string) => {
  setModals(prev => ({ ...prev, [modalType]: true }));
  dispatchTransitionEvent(MODAL_OPENED_EVENT, { modalType });
};

// When closing a modal:
const closeModal = (modalType: string) => {
  setModals(prev => ({ ...prev, [modalType]: false }));
  dispatchTransitionEvent(MODAL_CLOSED_EVENT, { modalType });
};
*/

// Example: Add tab change events
/*
useEffect(() => {
  if (activeTab !== null) {
    dispatchTransitionEvent(TAB_CHANGED_EVENT, {
      to: activeTab,
      from: previousTab // track previous tab in state
    });
  }
}, [activeTab]);
*/

// Example: Add selection events
/*
useEffect(() => {
  if (selectedIds.worldId) {
    const world = worlds.find(w => w.id === selectedIds.worldId);
    dispatchTransitionEvent(WORLD_SELECTED_EVENT, {
      id: selectedIds.worldId,
      name: world?.name
    });
  } else {
    dispatchTransitionEvent(WORLD_DESELECTED_EVENT, {});
  }
}, [selectedIds.worldId, worlds]);
*/

// ============================================================================
// 4. Update Form Handlers to dispatch form submission events
// ============================================================================

// Example: In useHomePageHandlers.ts, update world creation handler

/*
import { dispatchTransitionEvent } from "../utils/eventDispatcher";
import { FORM_SUBMITTED_EVENT, FORM_SUBMIT_FAILED_EVENT } from "../auth/authEvents";

const handleCreateWorld = async (formData: WorldFormData) => {
  try {
    setIsLoading(true);
    setError(null);
    
    const world = await worldClient.createWorld(formData);
    
    // Success event
    dispatchTransitionEvent(FORM_SUBMITTED_EVENT, {
      formType: "world",
      success: true,
      entityId: world.id,
      entityName: world.name
    });
    
    setWorlds(prev => [...prev, world]);
    closeModal("world");
  } catch (error: any) {
    // Failure event
    dispatchTransitionEvent(FORM_SUBMIT_FAILED_EVENT, {
      formType: "world",
      success: false,
      error: error.message
    });
    
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
};
*/

// ============================================================================
// 5. Update Data Loading to dispatch data loaded events
// ============================================================================

// Example: In useHomePageData.ts, when data loads complete

/*
import { dispatchTransitionEvent } from "../utils/eventDispatcher";
import { DATA_LOADED_EVENT } from "../auth/authEvents";

// When worlds load:
useEffect(() => {
  if (!currentUser || worldsLoaded) return;
  
  worldClient
    .getWorlds()
    .then(worlds => {
      setWorlds(worlds);
      setWorldsLoaded(true);
      
      dispatchTransitionEvent(DATA_LOADED_EVENT, {
        dataType: "worlds",
        count: worlds.length
      });
    })
    .catch(error => {
      setError(error.message);
    });
}, [currentUser, worldsLoaded]);
*/

// ============================================================================
// 6. Update E2E Test Helpers (apps/web/tests/e2e/helpers.ts)
// ============================================================================

/*
import { Page } from "@playwright/test";

/**
 * Wait for a modal to open using transition events
 */
export async function waitForModalOpen(
  page: Page,
  modalType: string,
  timeout: number = 5000
): Promise<void> {
  await page.evaluate(
    ({ type, timeout }) => {
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          window.removeEventListener("snapp:modal-opened", handler);
          reject(new Error(`Timeout waiting for modal ${type} to open`));
        }, timeout);

        const handler = (e: CustomEvent) => {
          if (e.detail.modalType === type) {
            clearTimeout(timer);
            window.removeEventListener("snapp:modal-opened", handler);
            resolve();
          }
        };

        window.addEventListener("snapp:modal-opened", handler);
      });
    },
    { type: modalType, timeout }
  );
}

/**
 * Wait for a form submission to complete
 */
export async function waitForFormSubmission(
  page: Page,
  formType: string,
  timeout: number = 5000
): Promise<{ success: boolean; entityName?: string; error?: string }> {
  return page.evaluate(
    ({ type, timeout }) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          window.removeEventListener("snapp:form-submitted", handler);
          window.removeEventListener("snapp:form-submit-failed", handler);
          reject(new Error(`Timeout waiting for form ${type} submission`));
        }, timeout);

        const successHandler = (e: CustomEvent) => {
          if (e.detail.formType === type && e.detail.success) {
            clearTimeout(timer);
            window.removeEventListener("snapp:form-submitted", successHandler);
            window.removeEventListener("snapp:form-submit-failed", failureHandler);
            resolve({
              success: true,
              entityName: e.detail.entityName,
              entityId: e.detail.entityId
            });
          }
        };

        const failureHandler = (e: CustomEvent) => {
          if (e.detail.formType === type && !e.detail.success) {
            clearTimeout(timer);
            window.removeEventListener("snapp:form-submitted", successHandler);
            window.removeEventListener("snapp:form-submit-failed", failureHandler);
            resolve({
              success: false,
              error: e.detail.error
            });
          }
        };

        window.addEventListener("snapp:form-submitted", successHandler);
        window.addEventListener("snapp:form-submit-failed", failureHandler);
      });
    },
    { type: formType, timeout }
  );
}

/**
 * Wait for a world to be selected
 */
export async function waitForWorldSelection(
  page: Page,
  worldName?: string,
  timeout: number = 5000
): Promise<{ id: string; name: string }> {
  return page.evaluate(
    ({ name, timeout }) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          window.removeEventListener("snapp:world-selected", handler);
          reject(new Error(`Timeout waiting for world selection${name ? `: ${name}` : ""}`));
        }, timeout);

        const handler = (e: CustomEvent) => {
          if (!name || e.detail.name === name) {
            clearTimeout(timer);
            window.removeEventListener("snapp:world-selected", handler);
            resolve({
              id: e.detail.id,
              name: e.detail.name
            });
          }
        };

        window.addEventListener("snapp:world-selected", handler);
      });
    },
    { name: worldName, timeout }
  );
}

/**
 * Wait for data to load
 */
export async function waitForDataLoad(
  page: Page,
  dataType: string,
  options: { minCount?: number; worldId?: string; timeout?: number } = {}
): Promise<{ count: number }> {
  const { minCount = 0, worldId, timeout = 5000 } = options;
  
  return page.evaluate(
    ({ type, minCount, worldId, timeout }) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          window.removeEventListener("snapp:data-loaded", handler);
          reject(new Error(`Timeout waiting for ${type} data to load`));
        }, timeout);

        const handler = (e: CustomEvent) => {
          if (
            e.detail.dataType === type &&
            e.detail.count >= minCount &&
            (!worldId || e.detail.worldId === worldId)
          ) {
            clearTimeout(timer);
            window.removeEventListener("snapp:data-loaded", handler);
            resolve({
              count: e.detail.count
            });
          }
        };

        window.addEventListener("snapp:data-loaded", handler);
      });
    },
    { type: dataType, minCount, worldId, timeout }
  );
}
*/

// ============================================================================
// 7. Example: Updated E2E Test Using Events
// ============================================================================

/*
// Before (current approach):
When('the admin creates a world', async ({ page }) => {
  await page.getByRole("button", { name: /Snapp/i }).click();
  await page.getByRole("button", { name: "Create world" }).click();
  await page.waitForTimeout(500); // Arbitrary delay
  
  const dialog = page.getByRole("dialog", { name: /create world/i });
  await expect(dialog).toBeVisible({ timeout: 3000 });
  
  await page.getByLabel("World name").fill("Eldoria");
  await page.getByLabel("Description").fill("A high-fantasy realm.");
  await page.getByRole("button", { name: "Save world" }).click();
  
  await Promise.race([
    dialog.waitFor({ state: "hidden", timeout: 3000 }),
    page.getByTestId("error-message").waitFor({ timeout: 3000 })
  ]);
  
  await page.waitForTimeout(500);
  await expect(
    page.getByRole("tab", { name: "Eldoria" })
  ).toBeVisible({ timeout: 3000 });
});

// After (using transition events):
When('the admin creates a world', async ({ page }) => {
  await page.getByRole("button", { name: /Snapp/i }).click();
  await page.getByRole("button", { name: "Create world" }).click();
  
  // Wait for modal to open
  await waitForModalOpen(page, "world");
  
  // Fill form
  await page.getByLabel("World name").fill("Eldoria");
  await page.getByLabel("Description").fill("A high-fantasy realm.");
  await page.getByRole("button", { name: "Save world" }).click();
  
  // Wait for form submission
  const result = await waitForFormSubmission(page, "world");
  expect(result.success).toBe(true);
  expect(result.entityName).toBe("Eldoria");
  
  // Wait for world to be selected (if auto-selected)
  await waitForWorldSelection(page, "Eldoria");
});
*/

// ============================================================================
// 8. Migration Checklist
// ============================================================================

/*
Phase 1: Infrastructure
- [ ] Create eventDispatcher.ts utility
- [ ] Add event constants to authEvents.ts
- [ ] Add TypeScript types for event details

Phase 2: Modal Events (High Impact)
- [ ] Dispatch MODAL_OPENED_EVENT in openModal
- [ ] Dispatch MODAL_CLOSED_EVENT in closeModal
- [ ] Update one test to use waitForModalOpen
- [ ] Measure improvement

Phase 3: Form Submission Events (High Impact)
- [ ] Dispatch FORM_SUBMITTED_EVENT in all form handlers
- [ ] Dispatch FORM_SUBMIT_FAILED_EVENT on errors
- [ ] Update tests to use waitForFormSubmission
- [ ] Remove Promise.race patterns

Phase 4: Selection Events (Medium Impact)
- [ ] Dispatch WORLD_SELECTED_EVENT when worldId changes
- [ ] Dispatch CAMPAIGN_SELECTED_EVENT when campaignId changes
- [ ] Update selectWorldAndEnterPlanningMode helper
- [ ] Remove world selection polling

Phase 5: Navigation Events (Medium Impact)
- [ ] Dispatch TAB_CHANGED_EVENT when activeTab changes
- [ ] Dispatch MODE_CHANGED_EVENT when activeMode changes
- [ ] Update tab navigation tests

Phase 6: Data Loading Events (Lower Priority)
- [ ] Dispatch DATA_LOADED_EVENT when data fetches complete
- [ ] Update tests that wait for data availability
- [ ] Remove data polling patterns
*/
