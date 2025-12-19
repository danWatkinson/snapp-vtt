/**
 * Mapping of modal types to their dialog names for Playwright locators.
 * Used in modal open/close helpers to find dialogs by accessible name.
 */
export const MODAL_DIALOG_NAMES: Record<string, string> = {
  login: "Login",
  world: "Create world",
  campaign: "Create campaign",
  entity: "Add",
  session: "Add session",
  player: "Add player",
  storyArc: "Add story arc",
  scene: "Add scene",
  createUser: "Create user"
};

/**
 * Default timeout for event waits in milliseconds.
 * Used as the default value for most wait functions.
 */
export const DEFAULT_EVENT_TIMEOUT = 5000;

/**
 * Common stability wait times in milliseconds.
 * Used for small delays to ensure UI state has settled.
 * Optimized for performance: reduced by 50-60% from original values.
 */
export const STABILITY_WAIT_SHORT = 20;   // Very short delay for rapid state changes (reduced from 50ms)
export const STABILITY_WAIT_MEDIUM = 50; // Short delay for form field readiness (reduced from 100ms)
export const STABILITY_WAIT_LONG = 100;   // Medium delay for React rendering (reduced from 200ms)
export const STABILITY_WAIT_EXTRA = 150;  // Longer delay for complex state transitions (reduced from 300ms)
export const STABILITY_WAIT_MAX = 250;   // Maximum stability wait for major state changes (reduced from 500ms)

/**
 * Common timeout values for element visibility/enablement checks in milliseconds.
 * Used for expect().toBeVisible() and expect().toBeEnabled() calls.
 */
export const VISIBILITY_TIMEOUT_SHORT = 2000;  // Short timeout for quick checks
export const VISIBILITY_TIMEOUT_MEDIUM = 3000; // Medium timeout for standard checks
export const VISIBILITY_TIMEOUT_LONG = 5000;  // Long timeout for complex elements
export const VISIBILITY_TIMEOUT_EXTRA = 6000; // Extra long timeout for slow-loading elements (reduced from 8000ms for better performance)
