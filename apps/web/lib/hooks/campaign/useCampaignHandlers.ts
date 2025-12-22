import type { FormEvent } from "react";
import {
  CAMPAIGN_CREATED_EVENT,
  SESSION_CREATED_EVENT,
  PLAYER_ADDED_EVENT
} from "../../auth/authEvents";
import { dispatchTransitionEvent } from "../../utils/eventDispatcher";
import {
  createCampaign,
  createSession,
  addPlayerToCampaign
} from "../../clients/campaignClient";
import { withAsyncAction } from "../useAsyncAction";

interface UseCampaignHandlersProps {
  campaignForm: {
    form: { name: string; summary: string };
    resetForm: () => void;
  };
  sessionForm: {
    form: { name: string };
    resetForm: () => void;
  };
  playerForm: {
    form: { username: string };
    resetForm: () => void;
  };
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCampaigns: React.Dispatch<React.SetStateAction<any[]>>;
  setSessions: React.Dispatch<React.SetStateAction<any[]>>;
  setPlayers: React.Dispatch<React.SetStateAction<string[]>>;
  setSessionsLoadedFor: (key: string | null) => void;
  setPlayersLoadedFor: (key: string | null) => void;
  setStoryArcsLoadedFor: (key: string | null) => void;
  closeModal: (name: string) => void;
  currentUser: { token: string } | null;
  selectedIds: { campaignId?: string; worldId?: string };
  handleLogout: () => void;
}

/**
 * Handlers for campaign operations (create campaign, create session, add player).
 */
export function useCampaignHandlers({
  campaignForm,
  sessionForm,
  playerForm,
  setIsLoading,
  setError,
  setCampaigns,
  setSessions,
  setPlayers,
  setSessionsLoadedFor,
  setPlayersLoadedFor,
  setStoryArcsLoadedFor,
  closeModal,
  currentUser,
  selectedIds,
  handleLogout
}: UseCampaignHandlersProps) {
  async function handleCreateCampaign(e: FormEvent) {
    e.preventDefault();
    if (!selectedIds.worldId) {
      setError("Please select a world before creating a campaign");
      return;
    }
    try {
      await withAsyncAction(
        () =>
          createCampaign(
            campaignForm.form.name,
            campaignForm.form.summary,
            selectedIds.worldId!,
            currentUser?.token
          ),
        {
          setIsLoading,
          setError,
          onAuthError: handleLogout,
          onSuccess: (camp) => {
            setCampaigns((prev) => [...prev, camp]);
            campaignForm.resetForm();
            closeModal("campaign");
            Promise.resolve().then(() => {
              dispatchTransitionEvent(CAMPAIGN_CREATED_EVENT, {
                entityId: camp.id,
                entityName: camp.name,
                entityType: "campaign"
              });
            });
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      /* c8 ignore stop */
    }
  }

  async function handleCreateSession(e: FormEvent) {
    e.preventDefault();
    if (!selectedIds.campaignId) return;
    try {
      await withAsyncAction(
        () =>
          createSession(selectedIds.campaignId!, sessionForm.form.name, currentUser?.token),
        {
          setIsLoading,
          setError,
          onAuthError: handleLogout,
          onSuccess: (session) => {
            setSessions((prev) => [...prev, session]);
            sessionForm.resetForm();
            closeModal("session");
            setSessionsLoadedFor(null);
            dispatchTransitionEvent(SESSION_CREATED_EVENT, {
              entityId: session.id,
              entityName: session.name,
              entityType: "session",
              campaignId: selectedIds.campaignId
            });
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      /* c8 ignore stop */
    }
  }

  async function handleAddPlayer(e: FormEvent) {
    e.preventDefault();
    if (!selectedIds.campaignId) return;
    try {
      await withAsyncAction(
        () =>
          addPlayerToCampaign(
            selectedIds.campaignId!,
            playerForm.form.username,
            currentUser?.token
          ),
        {
          setIsLoading,
          setError,
          onAuthError: handleLogout,
          onSuccess: () => {
            setPlayers((prev) => [...prev, playerForm.form.username]);
            playerForm.resetForm();
            closeModal("player");
            setPlayersLoadedFor(null);
            setStoryArcsLoadedFor(null);
            dispatchTransitionEvent(PLAYER_ADDED_EVENT, {
              username: playerForm.form.username,
              campaignId: selectedIds.campaignId
            });
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      /* c8 ignore stop */
    }
  }

  return {
    handleCreateCampaign,
    handleCreateSession,
    handleAddPlayer
  };
}
