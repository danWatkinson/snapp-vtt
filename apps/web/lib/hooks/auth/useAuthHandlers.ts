import type { FormEvent } from "react";
import { AUTH_EVENT } from "../../auth/authEvents";
import { AUTH_USERNAME_KEY } from "../../auth/authStorage";
import { login, type LoginResponse } from "../../clients/authClient";
import { withAsyncAction } from "../useAsyncAction";
import { isAuthError } from "../../auth/authErrors";

interface UseAuthHandlersProps {
  loginForm: {
    form: { name: string; password: string };
    setField: (field: string, value: string) => void;
  };
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAuthServiceUnavailable: (unavailable: boolean) => void;
  setCurrentUser: (user: LoginResponse | null) => void;
  closeModal: (name: string) => void;
  handleLogout: () => void;
}

/**
 * Handlers for authentication operations (login, logout).
 */
export function useAuthHandlers({
  loginForm,
  setIsLoading,
  setError,
  setAuthServiceUnavailable,
  setCurrentUser,
  closeModal,
  handleLogout
}: UseAuthHandlersProps) {
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setAuthServiceUnavailable(false);
    try {
      const result = await withAsyncAction(
        () => login(loginForm.form.name, loginForm.form.password),
        {
          setIsLoading,
          setError,
          onSuccess: (result) => {
            setCurrentUser(result);
            loginForm.setField("password", "");
            /* c8 ignore next */ // SSR guard; window is only available in browser/JS DOM
            if (typeof window !== "undefined") {
              window.localStorage.setItem(AUTH_USERNAME_KEY, result.user.username);
              window.dispatchEvent(
                new CustomEvent(AUTH_EVENT, {
                  detail: { username: result.user.username }
                })
              );
            }
            closeModal("login");
          },
          onError: (error) => {
            const isNetworkError =
              (error as any).isNetworkError ||
              (error.name === "TypeError" && error.message.includes("Failed to fetch"));

            if (isNetworkError) {
              setAuthServiceUnavailable(true);
              // eslint-disable-next-line no-console
              console.error("Auth service connection error:", error);
              setError(
                "Unable to connect to the authentication service. Please check your connection. If using self-signed certificates, you may need to accept the certificate in your browser."
              );
            } else {
              setAuthServiceUnavailable(false);
            }
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
    handleLogin,
    handleLogout
  };
}
