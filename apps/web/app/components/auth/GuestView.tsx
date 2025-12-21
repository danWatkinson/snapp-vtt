"use client";

import { useEffect } from "react";
import SplashScreen from "./SplashScreen";
import LoginDialog from "./LoginDialog";
import { useHomePage } from "../../../lib/contexts/HomePageContext";
import { dispatchTransitionEvent } from "../../../lib/utils/eventDispatcher";
import { GUEST_VIEW_READY_EVENT } from "../../../lib/auth/authEvents";

export default function GuestView() {
  const {
    loginForm,
    isLoading,
    error,
    authServiceUnavailable,
    modals,
    handlers,
    closeModal
  } = useHomePage();

  // Fire event when guest view is ready (similar to ENTITIES_LOADED_EVENT)
  useEffect(() => {
    dispatchTransitionEvent(GUEST_VIEW_READY_EVENT, {
      timestamp: Date.now()
    });
  }, []);

  const loginModalOpen = modals.login;
  return (
    <section className="space-y-6">
      <SplashScreen dimmed={loginModalOpen} />

      <LoginDialog
        open={loginModalOpen}
        loginName={loginForm.form.name}
        loginPassword={loginForm.form.password}
        isLoading={isLoading}
        error={error}
        authServiceUnavailable={authServiceUnavailable}
        onChangeName={(value) => loginForm.setField("name", value)}
        onChangePassword={(value) => loginForm.setField("password", value)}
        onClose={() => closeModal("login")}
        onSubmit={handlers.handleLogin}
      />
    </section>
  );
}
