import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { dispatchTransitionEvent } from "../utils/eventDispatcher";
import { MODAL_OPENED_EVENT, MODAL_CLOSED_EVENT } from "../auth/authEvents";

type ModalKeys = 
  | "login"
  | "createUser"
  | "world"
  | "entity"
  | "campaign"
  | "session"
  | "player"
  | "storyArc"
  | "storyArcEvent"
  | "scene";

type ModalState = Record<ModalKeys, boolean>;

/**
 * Hook to manage multiple modal states in one place.
 * Provides convenient methods to open/close modals and check their state.
 */
export function useModals(initialState: Partial<ModalState> = {}) {
  const defaultState: ModalState = {
    login: false,
    createUser: false,
    world: false,
    entity: false,
    campaign: false,
    session: false,
    player: false,
    storyArc: false,
    storyArcEvent: false,
    scene: false,
    ...initialState
  };

  const [modals, setModals] = useState<ModalState>(defaultState);
  const prevModalsRef = useRef<ModalState>(defaultState);

  // Dispatch events when modal state actually changes
  useEffect(() => {
    const prevModals = prevModalsRef.current;
    for (const key of Object.keys(modals) as ModalKeys[]) {
      if (modals[key] && !prevModals[key]) {
        // Modal opened
        dispatchTransitionEvent(MODAL_OPENED_EVENT, { modalType: key });
      } else if (!modals[key] && prevModals[key]) {
        // Modal closed
        dispatchTransitionEvent(MODAL_CLOSED_EVENT, { modalType: key });
      }
    }
    prevModalsRef.current = modals;
  }, [modals]);

  const openModal = useCallback((key: ModalKeys) => {
    setModals((prev) => ({ ...prev, [key]: true }));
  }, []);

  const closeModal = useCallback((key: ModalKeys) => {
    setModals((prev) => ({ ...prev, [key]: false }));
  }, []);

  const toggleModal = useCallback((key: ModalKeys) => {
    setModals((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals((prev) => {
      const closed: ModalState = {} as ModalState;
      const keys: ModalKeys[] = ["login", "createUser", "world", "entity", "campaign", "session", "player", "storyArc", "storyArcEvent", "scene"];
      for (const key of keys) {
        closed[key] = false;
      }
      return closed;
    });
  }, []);

  // Create individual modal controllers for convenience (memoized to ensure isOpen is always current)
  const modal = useMemo(() => ({
    login: {
      isOpen: modals.login,
      open: () => openModal("login"),
      close: () => closeModal("login"),
      toggle: () => toggleModal("login")
    },
    createUser: {
      isOpen: modals.createUser,
      open: () => openModal("createUser"),
      close: () => closeModal("createUser"),
      toggle: () => toggleModal("createUser")
    },
    world: {
      isOpen: modals.world,
      open: () => openModal("world"),
      close: () => closeModal("world"),
      toggle: () => toggleModal("world")
    },
    entity: {
      isOpen: modals.entity,
      open: () => openModal("entity"),
      close: () => closeModal("entity"),
      toggle: () => toggleModal("entity")
    },
    campaign: {
      isOpen: modals.campaign,
      open: () => openModal("campaign"),
      close: () => closeModal("campaign"),
      toggle: () => toggleModal("campaign")
    },
    session: {
      isOpen: modals.session,
      open: () => openModal("session"),
      close: () => closeModal("session"),
      toggle: () => toggleModal("session")
    },
    player: {
      isOpen: modals.player,
      open: () => openModal("player"),
      close: () => closeModal("player"),
      toggle: () => toggleModal("player")
    },
    storyArc: {
      isOpen: modals.storyArc,
      open: () => openModal("storyArc"),
      close: () => closeModal("storyArc"),
      toggle: () => toggleModal("storyArc")
    },
    storyArcEvent: {
      isOpen: modals.storyArcEvent,
      open: () => openModal("storyArcEvent"),
      close: () => closeModal("storyArcEvent"),
      toggle: () => toggleModal("storyArcEvent")
    },
    scene: {
      isOpen: modals.scene,
      open: () => openModal("scene"),
      close: () => closeModal("scene"),
      toggle: () => toggleModal("scene")
    }
  }), [modals, openModal, closeModal, toggleModal]);

  return {
    modals,
    modal,
    openModal,
    closeModal,
    toggleModal,
    closeAllModals
  };
}
