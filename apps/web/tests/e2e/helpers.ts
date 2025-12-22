// Re-export from new modular helpers for backward compatibility
// This file maintains backward compatibility with existing test imports
import { MODAL_DIALOG_NAMES, DEFAULT_EVENT_TIMEOUT } from "./helpers/constants";
import { waitForSimpleEvent, getUniqueCampaignName, getUniqueUsername, getStoredCampaignName, getStoredWorldName } from "./helpers/utils";
import { waitForModalOpen, waitForModalClose, closeModalIfOpen } from "./helpers/modals";
import { loginAs, loginAsAdmin, ensureLoginDialogClosed } from "./helpers/auth";
import {
  ensureModeSelectorVisible,
  selectWorldAndEnterMode,
  waitForWorldSelected,
  waitForCampaignSelected,
  waitForMode,
  waitForSubTab,
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
  selectWorldAndEnterMode,
  waitForWorldSelected,
  waitForCampaignSelected,
  waitForMode,
  waitForSubTab,
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
