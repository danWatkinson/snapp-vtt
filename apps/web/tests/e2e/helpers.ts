import { Page, expect } from "@playwright/test";
import {
  WORLD_SELECTED_EVENT,
  WORLD_DESELECTED_EVENT,
  CAMPAIGN_SELECTED_EVENT,
  CAMPAIGN_DESELECTED_EVENT,
  PLANNING_MODE_ENTERED_EVENT,
  PLANNING_MODE_EXITED_EVENT,
  PLANNING_SUBTAB_CHANGED_EVENT,
  CAMPAIGN_VIEW_CHANGED_EVENT,
  WORLD_CREATED_EVENT,
  CAMPAIGN_CREATED_EVENT,
  CREATURE_CREATED_EVENT,
  FACTION_CREATED_EVENT,
  LOCATION_CREATED_EVENT,
  EVENT_CREATED_EVENT,
  SESSION_CREATED_EVENT,
  SCENE_CREATED_EVENT,
  PLAYER_ADDED_EVENT,
  STORY_ARC_CREATED_EVENT,
  WORLDS_LOADED_EVENT,
  CAMPAIGNS_LOADED_EVENT,
  ENTITIES_LOADED_EVENT,
  SESSIONS_LOADED_EVENT,
  PLAYERS_LOADED_EVENT,
  STORY_ARCS_LOADED_EVENT,
  SCENES_LOADED_EVENT,
  TIMELINE_LOADED_EVENT,
  USERS_LOADED_EVENT,
  ASSETS_LOADED_EVENT,
  ASSET_UPLOADED_EVENT,
  ERROR_OCCURRED_EVENT,
  ERROR_CLEARED_EVENT,
  USER_CREATED_EVENT,
  USER_DELETED_EVENT,
  ROLE_ASSIGNED_EVENT,
  ROLE_REVOKED_EVENT,
  MAIN_TAB_CHANGED_EVENT,
  WORLD_UPDATED_EVENT
} from "../../lib/auth/authEvents";

// Import from new modular helpers
import { MODAL_DIALOG_NAMES, DEFAULT_EVENT_TIMEOUT } from "./helpers/constants";
import { waitForSimpleEvent, getUniqueCampaignName, getUniqueUsername, getStoredCampaignName, getStoredWorldName } from "./helpers/utils";
import { waitForModalOpen, waitForModalClose, closeModalIfOpen } from "./helpers/modals";
import { loginAs, loginAsAdmin, ensureLoginDialogClosed } from "./helpers/auth";
import {
  ensureModeSelectorVisible,
  selectWorldAndEnterPlanningMode,
  waitForWorldSelected,
  waitForCampaignSelected,
  waitForPlanningMode,
  waitForPlanningSubTab,
  waitForCampaignView,
  waitForMainTab,
  ensureCampaignExists
} from "./helpers/navigation";
import {
  waitForWorldCreated,
  waitForCampaignCreated,
  waitForWorldsLoaded,
  waitForCampaignsLoaded,
  waitForEntitiesLoaded,
  waitForEntityCreated,
  waitForWorldUpdated
} from "./helpers/entities";

// Re-export from modules for backward compatibility
export { MODAL_DIALOG_NAMES, DEFAULT_EVENT_TIMEOUT } from "./helpers/constants";
export { getUniqueCampaignName, getUniqueUsername, getStoredCampaignName, getStoredWorldName } from "./helpers/utils";
export { waitForModalOpen, waitForModalClose, closeModalIfOpen } from "./helpers/modals";
export { loginAs, loginAsAdmin, ensureLoginDialogClosed } from "./helpers/auth";
export {
  ensureModeSelectorVisible,
  selectWorldAndEnterPlanningMode,
  waitForWorldSelected,
  waitForCampaignSelected,
  waitForPlanningMode,
  waitForPlanningSubTab,
  waitForCampaignView,
  waitForMainTab,
  ensureCampaignExists
} from "./helpers/navigation";
export {
  waitForWorldCreated,
  waitForCampaignCreated,
  waitForWorldsLoaded,
  waitForCampaignsLoaded,
  waitForEntitiesLoaded,
  waitForEntityCreated,
  waitForWorldUpdated
} from "./helpers/entities";
export {
  waitForUserCreated,
  waitForUserDeleted,
  waitForRoleAssigned,
  waitForRoleRevoked
} from "./helpers/users";
export {
  waitForError,
  waitForErrorCleared,
  handleAlreadyExistsError
} from "./helpers/errors";
export {
  waitForAssetUploaded
} from "./helpers/assets";
