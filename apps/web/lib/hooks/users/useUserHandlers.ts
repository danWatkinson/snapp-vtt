import type { FormEvent } from "react";
import {
  USER_CREATED_EVENT,
  USER_DELETED_EVENT,
  ROLE_ASSIGNED_EVENT,
  ROLE_REVOKED_EVENT
} from "../../auth/authEvents";
import { dispatchTransitionEvent } from "../../utils/eventDispatcher";
import { assignRoles, revokeRole, deleteUser, createUser } from "../../clients/authClient";
import { withAsyncAction } from "../useAsyncAction";

interface UseUserHandlersProps {
  userManagementForm: {
    form: { username: string; role: string };
  };
  createUserForm: {
    form: { username: string; password: string; roles: string[] };
    resetForm: () => void;
  };
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUsersLoaded: (loaded: boolean) => void;
  closeModal: ReturnType<typeof import("../useModals").useModals>["closeModal"];
  currentUser: { token: string } | null;
  handleLogout: () => void;
}

/**
 * Handlers for user management operations (create, delete, assign role, revoke role).
 */
export function useUserHandlers({
  userManagementForm,
  createUserForm,
  setIsLoading,
  setError,
  setUsersLoaded,
  closeModal,
  currentUser,
  handleLogout
}: UseUserHandlersProps) {
  async function handleAssignRole(e: FormEvent) {
    e.preventDefault();
    if (!currentUser) {
      setError("You must log in as an admin first");
      return;
    }
    try {
      await withAsyncAction(
        () =>
          assignRoles(
            currentUser.token,
            userManagementForm.form.username,
            [userManagementForm.form.role]
          ),
        {
          setIsLoading,
          setError,
          onAuthError: handleLogout,
          onSuccess: (result) => {
            setUsersLoaded(false);
            Promise.resolve().then(() => {
              dispatchTransitionEvent(ROLE_ASSIGNED_EVENT, {
                username: userManagementForm.form.username,
                role: userManagementForm.form.role,
                updatedUser: result
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

  async function handleRevokeRole(username: string, role: string) {
    if (!currentUser) return;
    try {
      await withAsyncAction(
        () => revokeRole(currentUser.token, username, role),
        {
          setIsLoading,
          setError,
          onSuccess: (user) => {
            setUsersLoaded(false);
            Promise.resolve().then(() => {
              dispatchTransitionEvent(ROLE_REVOKED_EVENT, {
                username: username,
                role: role,
                updatedUser: user
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

  async function handleDeleteUser(username: string) {
    if (!currentUser) return;
    if (!confirm(`Are you sure you want to delete user '${username}'?`)) {
      return;
    }
    try {
      await withAsyncAction(
        () => deleteUser(currentUser.token, username),
        {
          setIsLoading,
          setError,
          onAuthError: handleLogout,
          onSuccess: () => {
            setUsersLoaded(false);
            Promise.resolve().then(() => {
              dispatchTransitionEvent(USER_DELETED_EVENT, {
                username: username
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

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    try {
      await withAsyncAction(
        () =>
          createUser(
            currentUser.token,
            createUserForm.form.username,
            createUserForm.form.password,
            createUserForm.form.roles
          ),
        {
          setIsLoading,
          setError,
          onSuccess: (user) => {
            createUserForm.resetForm();
            closeModal("createUser");
            setUsersLoaded(false);
            Promise.resolve().then(() => {
              dispatchTransitionEvent(USER_CREATED_EVENT, {
                username: user.username,
                roles: user.roles
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

  return {
    handleAssignRole,
    handleRevokeRole,
    handleDeleteUser,
    handleCreateUser
  };
}
