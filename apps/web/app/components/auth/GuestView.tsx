"use client";

import SplashScreen from "./SplashScreen";
import LoginDialog from "./LoginDialog";
import { useHomePage } from "../../../lib/contexts/HomePageContext";

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
