"use client";

import { OPEN_LOGIN_EVENT } from "../../../lib/auth/authEvents";
import { useAuthUser } from "../../../lib/auth/useAuthUser";
import { useHomePage } from "../../../lib/contexts/HomePageContext";

export default function HeaderAuth() {
  const usernameFromStorage = useAuthUser();
  const { currentUser, handlers } = useHomePage();

  // Use actual currentUser state as source of truth, not just localStorage
  // If currentUser is null, user is not authenticated regardless of localStorage
  const isAuthenticated = currentUser !== null;
  const displayUsername = isAuthenticated ? (currentUser?.user.username ?? usernameFromStorage) : null;

  const handleLogout = () => {
    handlers.handleLogout();
  };

  return (
    <div
      data-component="HeaderAuth"
      className="absolute inset-y-0 right-6 flex items-center text-xs sm:text-sm snapp-header-auth"
    >
      <div className="relative flex items-center gap-2 pr-2 sm:pr-4">
        {/* Placeholder profile picture behind the auth controls */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-1 h-12 w-12 sm:h-14 sm:w-14 rounded-full border shadow-md snapp-avatar-bg"
          style={{ opacity: 0.85 }}
        />

        <div className="relative z-10 flex items-center gap-2">
          {isAuthenticated && displayUsername ? (
            <>
              <span className="hidden sm:inline" data-testid="user-roles-display">
                Logged in as{" "}
                <span className="font-semibold snapp-heading">
                  {displayUsername}
                </span>
                {currentUser?.user.roles && currentUser.user.roles.length > 0 && (
                  <span className="text-snapp-muted">
                    {" "}({currentUser.user.roles.join(", ")})
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded px-3 py-1 text-xs font-semibold hover:opacity-90 border bg-white/80 backdrop-blur-sm snapp-heading"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Guest</span>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new Event(OPEN_LOGIN_EVENT));
                  }
                }}
                className="rounded px-3 py-1 text-xs font-semibold hover:opacity-90 border bg-white/80 backdrop-blur-sm snapp-heading"
              >
                Login
              </button>
              <button
                type="button"
                className="rounded px-3 py-1 text-xs font-semibold opacity-60 cursor-not-allowed border bg-white/60 backdrop-blur-sm snapp-heading"
                disabled
              >
                Register
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

