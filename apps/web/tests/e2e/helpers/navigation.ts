/**
 * Navigation helpers - re-exported from domain-specific modules
 * 
 * This file maintains backward compatibility by re-exporting all navigation functions
 * from the refactored modules. The original monolithic file (2444 lines) has been
 * broken down into:
 * 
 * - worldNavigation.ts: World selection and planning mode functions
 * - campaignNavigation.ts: Campaign selection and view navigation
 * - screenNavigation.ts: Screen-level navigation (Users, Assets)
 * - eventWaiting.ts: Event-based waiting utilities
 * - navigationUtils.ts: Shared utility functions
 */

// World navigation functions
export {
  ensureModeSelectorVisible,
  selectWorldAndEnterPlanningModeWithWorldName,
  selectWorldAndEnterPlanningMode,
  waitForWorldSelected,
  waitForPlanningMode,
  waitForPlanningSubTab
} from "./navigation/worldNavigation";

// Campaign navigation functions
export {
  isCampaignSelected,
  isCampaignSelectedByName,
  navigateToCampaignsTab,
  ensureCampaignExists,
  waitForCampaignSelected,
  waitForCampaignView,
  navigateToCampaignView,
  isOnCampaignView
} from "./navigation/campaignNavigation";

// Screen navigation functions
export {
  navigateToUsersScreen,
  navigateToAssetsScreen
} from "./navigation/screenNavigation";

// Event waiting functions
export {
  waitForMainTab
} from "./navigation/eventWaiting";

// Navigation utilities
export {
  storeWorldName,
  getStoredWorldName
} from "./navigation/navigationUtils";
