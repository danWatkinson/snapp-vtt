import type { FormEvent } from "react";
import { WORLD_CREATED_EVENT, WORLD_UPDATED_EVENT } from "../../auth/authEvents";
import { dispatchTransitionEvent } from "../../utils/eventDispatcher";
import { createWorld, updateWorldSplashImage } from "../../clients/worldClient";
import { withAsyncAction } from "../useAsyncAction";

interface UseWorldHandlersProps {
  worldForm: {
    form: { name: string; description: string };
    resetForm: (values: { name: string; description: string }) => void;
  };
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setWorlds: React.Dispatch<React.SetStateAction<any[]>>;
  setWorldsLoaded: (loaded: boolean) => void;
  closeModal: ReturnType<typeof import("../useModals").useModals>["closeModal"];
  currentUser: { token: string } | null;
  handleLogout: () => void;
}

/**
 * Handlers for world operations (create, update splash image).
 */
export function useWorldHandlers({
  worldForm,
  setIsLoading,
  setError,
  setWorlds,
  setWorldsLoaded,
  closeModal,
  currentUser,
  handleLogout
}: UseWorldHandlersProps) {
  async function handleCreateWorld(e: FormEvent) {
    e.preventDefault();
    try {
      await withAsyncAction(
        () => createWorld(worldForm.form.name, worldForm.form.description, currentUser?.token),
        {
          setIsLoading,
          setError,
          onAuthError: handleLogout,
          onSuccess: (world) => {
            setWorlds((prev) => [...prev, world]);
            worldForm.resetForm({ name: "", description: "" });
            closeModal("world");
            setWorldsLoaded(false);
            // Dispatch event after React has had a chance to update the UI
            // Use requestAnimationFrame to ensure the event fires after the next paint
            requestAnimationFrame(() => {
              setTimeout(() => {
                dispatchTransitionEvent(WORLD_CREATED_EVENT, {
                  entityId: world.id,
                  entityName: world.name,
                  entityType: "world"
                });
              }, 0);
            });
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      // Error already handled by withAsyncAction
      /* c8 ignore stop */
    }
  }

  async function handleSetWorldSplash(
    worldId: string,
    assetId: string | null
  ) {
    try {
      await withAsyncAction(
        () => updateWorldSplashImage(worldId, assetId, currentUser?.token),
        {
          setIsLoading,
          setError,
          onAuthError: handleLogout,
          onSuccess: (world) => {
            setWorlds((prev) =>
              prev.map((w) => (w.id === world.id ? world : w))
            );
            // Dispatch event after React has had a chance to update the UI
            requestAnimationFrame(() => {
              setTimeout(() => {
                dispatchTransitionEvent(WORLD_UPDATED_EVENT, {
                  worldId: world.id,
                  worldName: world.name,
                  updateType: assetId ? "splashImageSet" : "splashImageCleared",
                  splashImageAssetId: assetId
                });
              }, 0);
            });
          }
        }
      );
    } catch (err) {
      /* c8 ignore start */ // Error already handled by withAsyncAction; catch is defensive
      // Error already handled by withAsyncAction
      /* c8 ignore stop */
    }
  }

  return {
    handleCreateWorld,
    handleSetWorldSplash
  };
}
