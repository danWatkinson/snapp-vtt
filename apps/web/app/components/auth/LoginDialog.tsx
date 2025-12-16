"use client";

import type { FormEvent } from "react";

interface LoginDialogProps {
  open: boolean;
  loginName: string;
  loginPassword: string;
  isLoading: boolean;
  error: string | null;
  authServiceUnavailable: boolean;
  onChangeName: (value: string) => void;
  onChangePassword: (value: string) => void;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
}

export default function LoginDialog({
  open,
  loginName,
  loginPassword,
  isLoading,
  error,
  authServiceUnavailable,
  onChangeName,
  onChangePassword,
  onClose,
  onSubmit
}: LoginDialogProps) {
  if (!open) return null;

  return (
    <div
      data-component="LoginDialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Login"
        className="w-full max-w-md rounded-lg border p-4 shadow-lg snapp-panel"
      >
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-lg font-medium snapp-heading"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Login
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-lg hover:opacity-80 snapp-muted"
            aria-label="Close login"
          >
            ×
          </button>
        </div>

        {error && (
          <div
            className="mb-3 rounded-lg border p-3 shadow-sm snapp-error-box"
            data-testid="error-message"
          >
            <p
              className="text-sm font-medium snapp-error-text"
            >
              {error}
            </p>
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="space-y-3"
        >
          <label className="block text-sm">
            Username
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-sm snapp-input"
              id="login-username"
              data-testid="login-username"
              value={loginName}
              onChange={(e) => onChangeName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              type="password"
              className="mt-1 w-full rounded border px-2 py-1 text-sm snapp-input"
              data-testid="login-password"
              value={loginPassword}
              onChange={(e) => onChangePassword(e.target.value)}
              required
            />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1 text-sm hover:opacity-80 snapp-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded px-3 py-1 text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed snapp-primary-btn"
            >
              {isLoading ? "Signing in…" : "Sign in"}
            </button>
          </div>
          {authServiceUnavailable && (
            <p className="mt-2 text-xs snapp-error-text">
              The authentication service is currently unavailable. Please try again later.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

