"use client";

import { useHomePage } from "../../../lib/contexts/HomePageContext";
import { useTabHelpers } from "../../../lib/hooks/useTabHelpers";
import FormField from "../ui/FormField";
import FormActions from "../ui/FormActions";
import Modal from "../ui/Modal";
import Heading from "../ui/Heading";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import Section from "../ui/Section";
import SectionHeader from "../ui/SectionHeader";
import ListContainer from "../ui/ListContainer";
import Form from "../ui/Form";

export default function UsersTab() {
  const {
    currentUser,
    users,
    usersLoaded,
    createUserForm,
    userManagementForm,
    modals,
    handlers,
    isLoading,
    selectedIds,
    openModal,
    closeModal
  } = useHomePage();

  // Use tab helpers to consolidate setup
  const {
    formSetters: {
      setNewUserUsername: setNewUsername,
      setNewUserPassword,
      setNewUserRoles,
      setTargetUsername,
      setTargetRole
    },
    formValues: {
      newUserUsername: newUsername,
      newUserPassword,
      newUserRoles,
      targetUsername,
      targetRole
    },
    modalHandlers: { setCreateUserModalOpen },
    modalStates: { createUserModalOpen }
  } = useTabHelpers({
    forms: {
      newUser: { form: createUserForm, fields: ["username", "password", "roles"], prefix: "newUser" },
      target: { form: userManagementForm, fields: ["username", "role"], prefix: "target" }
    },
    modals: ["createUser"],
    setSelectionField: () => {}, // Not used in UsersTab
    openModal,
    closeModal,
    selectedIds,
    modalsState: modals
  });
  return (
    <div data-component="UsersTab" className="space-y-6">
      <div className="flex items-center justify-between">
        <Heading>User Management</Heading>
        <p className="text-sm snapp-muted">
          Logged in as {currentUser.user.username} ({currentUser.user.roles.join(", ") || "no roles"})
        </p>
      </div>

      {currentUser && currentUser.user.roles.includes("admin") && (
        <>
          <SectionHeader
            action={{
              label: "Create user",
              onClick: () => setCreateUserModalOpen(true)
            }}
          >
            Users
          </SectionHeader>

          <Section data-testid="users-list">
            <ListContainer
              items={users}
              emptyMessage="No users found."
              data-testid="users-list-items"
            >
              {users.map((user) => (
                <li
                  key={user.id}
                  className="rounded border p-3 text-sm snapp-panel"
                  data-testid={`user-${user.username}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold snapp-heading" data-testid={`username-${user.username}`}>
                        {user.username}
                      </div>
                      <div className="mt-1 flex gap-2">
                        {user.roles.length === 0 ? (
                          <span className="text-xs snapp-muted">No roles</span>
                        ) : (
                          user.roles.map((role) => (
                            <span
                              key={role}
                              className="rounded px-2 py-0.5 text-xs snapp-pill"
                            >
                              {role}
                              <button
                                type="button"
                                onClick={() => handlers.handleRevokeRole(user.username, role)}
                                className="ml-1 hover:opacity-70"
                                aria-label={`Revoke ${role} role`}
                                data-testid={`revoke-${role}-${user.username}`}
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlers.handleDeleteUser(user.username)}
                      className="rounded px-2 py-1 text-xs hover:opacity-70 snapp-danger-btn"
                      data-testid={`delete-${user.username}`}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ListContainer>
          </Section>

          <Section variant="secondary" as="form" onSubmit={handlers.handleAssignRole}>
            <Heading>Assign role (admin only)</Heading>
            <FormField
              label="Target username"
              value={targetUsername}
              onChange={setTargetUsername}
              data-testid="assign-target-username"
            />
            <FormField
              label="Role"
              value={targetRole}
              onChange={setTargetRole}
              data-testid="assign-role"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 rounded px-3 py-1 text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed snapp-primary-btn"
            >
              {isLoading ? "Assigning…" : "Assign role"}
            </button>
          </Section>
        </>
      )}

      {createUserModalOpen && currentUser && (
        <Modal
          isOpen={createUserModalOpen}
          onClose={() => {
            setCreateUserModalOpen(false);
            setNewUsername("");
            setNewUserRoles([]);
          }}
          title="Create user"
          closeOnBackdropClick
        >
          <Form onSubmit={handlers.handleCreateUser}>
            <FormField
              label="Username"
              value={newUsername}
              onChange={setNewUsername}
              required
              data-testid="create-user-username"
            />
            <FormField
              label="Password"
              type="password"
              value={newUserPassword}
              onChange={setNewUserPassword}
              required
              data-testid="create-user-password"
            />
            <FormActions
              onCancel={() => {
                setCreateUserModalOpen(false);
                setNewUsername("");
                setNewUserRoles([]);
              }}
              submitLabel="Create user"
              isLoading={isLoading}
            />
          </Form>
        </Modal>
      )}
    </div>
  );
}

