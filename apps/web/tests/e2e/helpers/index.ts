// Re-export all helpers from modules for backward compatibility
// This allows existing imports from "../helpers" to continue working

// Constants and utilities - export these first
export * from "./constants";
export * from "./utils";
// Explicitly export utility helpers
export { navigateAndWaitForReady, clearAllStorage } from "./utils";

// Explicitly re-export safeWait to ensure it's available when importing from "../helpers"
// This is needed because some test files import from "../helpers" instead of "../helpers/utils"
export { safeWait } from "./utils";

// Modal helpers
export * from "./modals";

// Auth helpers
export * from "./auth";

// Navigation helpers
export * from "./navigation";
// Explicitly export navigation functions to ensure they're available
export { 
  selectWorldAndEnterModeWithWorldName,
  navigateToUsersScreen,
  navigateToAssetsScreen,
  navigateToCampaignView,
  isOnCampaignView
} from "./navigation";
// Tab navigation helpers
export * from "./tabs";
// Verification helpers
export * from "./verification";

// Entity helpers
export * from "./entities";
// Entity creation helpers
export * from "./entityCreation";
// Explicitly export entity creation helpers
export { createStoryArc, createPlayer, createScene } from "./entityCreation";

// User helpers
export * from "./users";
// Explicitly export user creation helpers
export { ensureTestUser, getStoredTestUsername } from "./users";

// Error helpers - export these after navigation to avoid conflicts
export * from "./errors";
// Re-export error helpers explicitly to ensure they're available
export { waitForError, waitForErrorCleared, handleAlreadyExistsError, hasErrorMessage, getErrorMessage, checkForErrorAndThrow } from "./errors";

// Asset helpers
export * from "./assets";

// API helpers - import first to avoid circular dependencies
import { createApiClient, TestApiClient, type ServiceName, type ApiCallOptions } from "./api";
export { createApiClient, TestApiClient, type ServiceName, type ApiCallOptions };
export * from "./api";
