import type { FormEvent } from "react";
import { STORY_ARC_CREATED_EVENT } from "../../auth/authEvents";
import { dispatchTransitionEvent } from "../../utils/eventDispatcher";
import { createStoryArc, addEventToStoryArc } from "../../clients/campaignClient";
import { withAsyncAction } from "../useAsyncAction";

interface UseStoryArcHandlersProps {
  storyArcForm: {
    form: { name: string; summary: string };
    resetForm: () => void;
  };
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStoryArcs: React.Dispatch<React.SetStateAction<any[]>>;
  setStoryArcEvents: React.Dispatch<React.SetStateAction<string[]>>;
  setStoryArcsLoadedFor: (key: string | null) => void;
  setStoryArcEventsLoadedFor: (key: string | null) => void;
  setSelectionField: (field: string, value: string) => void;
  closeModal: ReturnType<typeof import("../useModals").useModals>["closeModal"];
  currentUser: { token: string } | null;
  selectedIds: { campaignId?: string; storyArcId?: string; eventId?: string };
  handleLogout: () => void;
}

/**
 * Handlers for story arc operations (create story arc, add event to story arc).
 */
export function useStoryArcHandlers({
  storyArcForm,
  setIsLoading,
  setError,
  setStoryArcs,
  setStoryArcEvents,
  setStoryArcsLoadedFor,
  setStoryArcEventsLoadedFor,
  setSelectionField,
  closeModal,
  currentUser,
  selectedIds,
  handleLogout
}: UseStoryArcHandlersProps) {
  async function handleCreateStoryArc(e: FormEvent) {
    e.preventDefault();
    if (!selectedIds.campaignId) return;
    try {
      await withAsyncAction(
        () =>
          createStoryArc(
            selectedIds.campaignId!,
            storyArcForm.form.name,
            storyArcForm.form.summary,
            currentUser?.token
          ),
        {
          setIsLoading,
          setError,
          onAuthError: handleLogout,
          onSuccess: (storyArc) => {
            setStoryArcs((prev) => [...prev, storyArc]);
            storyArcForm.resetForm();
            closeModal("storyArc");
            setStoryArcsLoadedFor(null);
            // Dispatch event after React has had a chance to update the UI
            requestAnimationFrame(() => {
              setTimeout(() => {
                dispatchTransitionEvent(STORY_ARC_CREATED_EVENT, {
                  entityId: storyArc.id,
                  entityName: storyArc.name,
                  entityType: "storyArc",
                  campaignId: selectedIds.campaignId
                });
              }, 0);
            });
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      /* c8 ignore stop */
    }
  }

  async function handleAddEventToStoryArc(e: FormEvent) {
    e.preventDefault();
    if (!selectedIds.storyArcId || !selectedIds.eventId) return;
    try {
      await withAsyncAction(
        () =>
          addEventToStoryArc(
            selectedIds.storyArcId!,
            selectedIds.eventId!,
            currentUser?.token
          ),
        {
          setIsLoading,
          setError,
          onAuthError: handleLogout,
          onSuccess: () => {
            setStoryArcEvents((prev) => [...prev, selectedIds.eventId!]);
            setSelectionField("eventId", "");
            closeModal("storyArcEvent");
            setStoryArcEventsLoadedFor(null);
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      /* c8 ignore stop */
    }
  }

  return {
    handleCreateStoryArc,
    handleAddEventToStoryArc
  };
}
