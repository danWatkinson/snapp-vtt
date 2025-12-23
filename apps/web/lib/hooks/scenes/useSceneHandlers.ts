import type { FormEvent } from "react";
import { SCENE_CREATED_EVENT } from "../../auth/authEvents";
import { dispatchTransitionEvent } from "../../utils/eventDispatcher";
import { createScene } from "../../clients/campaignClient";
import { withAsyncAction } from "../useAsyncAction";

interface UseSceneHandlersProps {
  sceneForm: {
    form: { name: string; summary: string; worldId: string };
    resetForm: () => void;
  };
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setScenes: React.Dispatch<React.SetStateAction<any[]>>;
  setScenesLoadedFor: (key: string | null) => void;
  closeModal: ReturnType<typeof import("../useModals").useModals>["closeModal"];
  currentUser: { token: string } | null;
  selectedIds: { sessionId?: string };
  handleLogout: () => void;
}

/**
 * Handlers for scene operations (create scene).
 */
export function useSceneHandlers({
  sceneForm,
  setIsLoading,
  setError,
  setScenes,
  setScenesLoadedFor,
  closeModal,
  currentUser,
  selectedIds,
  handleLogout
}: UseSceneHandlersProps) {
  async function handleCreateScene(e: FormEvent) {
    e.preventDefault();
    if (!selectedIds.sessionId || !sceneForm.form.worldId) {
      setError("Session and World are required");
      return;
    }
    try {
      await withAsyncAction(
        () =>
          createScene(
            selectedIds.sessionId!,
            sceneForm.form.name,
            sceneForm.form.summary,
            sceneForm.form.worldId,
            [],
            currentUser?.token
          ),
        {
          setIsLoading,
          setError,
          onAuthError: handleLogout,
          onSuccess: (scene) => {
            setScenes((prev) => [...prev, scene]);
            sceneForm.resetForm();
            closeModal("scene");
            setScenesLoadedFor(null);
            // Dispatch event after React has had a chance to update the UI
            requestAnimationFrame(() => {
              setTimeout(() => {
                dispatchTransitionEvent(SCENE_CREATED_EVENT, {
                  entityId: scene.id,
                  entityName: scene.name,
                  entityType: "scene",
                  sessionId: selectedIds.sessionId,
                  worldId: sceneForm.form.worldId
                });
              }, 0);
            });
          }
        }
      );
    } catch (err) {
      /* c8 ignore next */ // Error already handled by withAsyncAction; catch is defensive
    }
  }

  return {
    handleCreateScene
  };
}
