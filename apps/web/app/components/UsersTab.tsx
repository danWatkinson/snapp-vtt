"use client";

import { type User, type LoginResponse } from "../../lib/authClient";

interface UsersTabProps {
  currentUser: LoginResponse;
  users: User[];
  usersLoaded: boolean;
  createUserModalOpen: boolean;
  newUsername: string;
  newUserPassword: string;
  newUserRoles: string[];
  targetUsername: string;
  targetRole: string;
  isLoading: boolean;
  onAssignRole: (e: React.FormEvent) => void;
  onRevokeRole: (username: string, role: string) => void;
  onDeleteUser: (username: string) => void;
  onCreateUser: (e: React.FormEvent) => void;
  setCreateUserModalOpen: (open: boolean) => void;
  setNewUsername: (username: string) => void;
  setNewUserPassword: (password: string) => void;
  setNewUserRoles: (roles: string[]) => void;
  setTargetUsername: (username: string) => void;
  setTargetRole: (role: string) => void;
}

export default function UsersTab({
  currentUser,
  users,
  usersLoaded,
  createUserModalOpen,
  newUsername,
  newUserPassword,
  newUserRoles,
  targetUsername,
  targetRole,
  isLoading,
  onAssignRole,
  onRevokeRole,
  onDeleteUser,
  onCreateUser,
  setCreateUserModalOpen,
  setNewUsername,
  setNewUserPassword,
  setNewUserRoles,
  setTargetUsername,
  setTargetRole,
}: UsersTabProps) {
  return (
    <div data-component="UsersTab" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium snapp-heading" style={{ fontFamily: "'Cinzel', serif" }}>User Management</h2>
        <p className="text-sm snapp-muted">
          Logged in as {currentUser.user.username} ({currentUser.user.roles.join(", ") || "no roles"})
        </p>
      </div>

      {currentUser && currentUser.user.roles.includes("admin") && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium snapp-heading" style={{ fontFamily: "'Cinzel', serif" }}>Users</h2>
            <button
              type="button"
              className="rounded px-3 py-1 text-sm font-semibold hover:opacity-90 snapp-primary-btn"
              onClick={() => setCreateUserModalOpen(true)}
            >
              Create user
            </button>
          </div>

          <section 
            className="space-y-3 rounded-lg border p-4 snapp-panel"
            data-testid="users-list"
          >
            {users.length === 0 ? (
              <p className="text-sm snapp-muted">No users found.</p>
            ) : (
              <ul className="space-y-2" data-testid="users-list-items">
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
                                  onClick={() => onRevokeRole(user.username, role)}
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
                        onClick={() => onDeleteUser(user.username)}
                        className="rounded px-2 py-1 text-xs hover:opacity-70 snapp-danger-btn"
                        data-testid={`delete-${user.username}`}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <form
            onSubmit={onAssignRole}
            className="space-y-3 rounded-lg border p-4 snapp-panel-secondary"
          >
            <h2 className="text-lg font-medium snapp-heading" style={{ fontFamily: "'Cinzel', serif" }}>Assign role (admin only)</h2>
            <label className="block text-sm">
              Target username
              <input
                className="mt-1 w-full rounded border px-2 py-1 text-sm snapp-input"
                data-testid="assign-target-username"
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Role
              <input
                className="mt-1 w-full rounded border px-2 py-1 text-sm snapp-input"
                data-testid="assign-role"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 rounded px-3 py-1 text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed snapp-primary-btn"
            >
              {isLoading ? "Assigning…" : "Assign role"}
            </button>
          </form>
        </>
      )}

      {createUserModalOpen && currentUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setCreateUserModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Create user"
            className="w-full max-w-md rounded-lg border p-4 shadow-lg snapp-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-medium mb-3 snapp-heading" style={{ fontFamily: "'Cinzel', serif" }}>Create user</h2>
            <form onSubmit={onCreateUser} className="space-y-3">
              <label className="block text-sm">
                Username
                <input
                  className="mt-1 w-full rounded border px-2 py-1 text-sm snapp-input"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  data-testid="create-user-username"
                />
              </label>
              <label className="block text-sm">
                Password
                <input
                  type="password"
                  className="mt-1 w-full rounded border px-2 py-1 text-sm snapp-input"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  required
                  data-testid="create-user-password"
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="rounded px-3 py-1 text-sm hover:opacity-80 snapp-muted"
                  onClick={() => {
                    setCreateUserModalOpen(false);
                    setNewUsername("");
                    setNewUserRoles([]);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded px-3 py-1 text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed snapp-primary-btn"
                >
                  {isLoading ? "Creating…" : "Create user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

