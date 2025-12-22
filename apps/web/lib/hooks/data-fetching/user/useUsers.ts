import { useEffect } from "react";

/**
 * Hook to fetch users (admin only).
 */
export function useUsers(
  activeTab: string | null,
  currentUser: any,
  usersLoaded: boolean,
  listUsers: (token: string) => Promise<any[]>,
  setUsers: (users: any[]) => void,
  setUsersLoaded: (loaded: boolean) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    if (activeTab !== "Users" || !currentUser) {
      setUsersLoaded(false);
      return;
    }
    if (!currentUser.user.roles.includes("admin")) {
      setUsersLoaded(false);
      return;
    }
    if (usersLoaded) return;
    (async () => {
      try {
        const loaded = await listUsers(currentUser.token);
        setUsers(loaded);
        setUsersLoaded(true);
      } catch (err) {
        // Don't logout on users fetch errors - might be service unavailable
        // Only user-initiated actions should trigger logout on auth errors
        setError((err as Error).message);
        setUsersLoaded(false);
      }
    })();
  }, [activeTab, currentUser, usersLoaded, listUsers, setUsers, setUsersLoaded, setError]);
}
