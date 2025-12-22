import { useEffect } from "react";
import { useDataFetching } from "../useDataFetching";

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
  // Reset loaded state when conditions aren't met
  useEffect(() => {
    if (activeTab !== "Users" || !currentUser) {
      setUsersLoaded(false);
    } else if (!currentUser.user.roles.includes("admin")) {
      setUsersLoaded(false);
    }
  }, [activeTab, currentUser, setUsersLoaded]);

  useDataFetching({
    enabled: activeTab === "Users" && !!currentUser && currentUser.user?.roles?.includes("admin"),
    loaded: usersLoaded,
    fetchFn: () => listUsers(currentUser.token),
    onSuccess: (users) => {
      setUsers(users);
      setUsersLoaded(true);
    },
    onError: (error) => {
      // Don't logout on users fetch errors - might be service unavailable
      // Only user-initiated actions should trigger logout on auth errors
      setError(error);
      setUsersLoaded(false);
    },
    dependencies: [activeTab, currentUser, usersLoaded, listUsers, setUsers, setUsersLoaded, setError]
  });
}
