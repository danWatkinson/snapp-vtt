import { alreadyExistsError, notFoundError } from "../../../packages/store-utils";

export type Role = "admin" | "gm" | "player";

export interface User {
  id: string;
  username: string;
  roles: Role[];
  passwordHash?: string; // Optional to support future SSO providers
}

/**
 * In-memory user store for early development and testing.
 * This will later be replaced by a proper persistence layer.
 */
export class InMemoryUserStore {
  private usersByUsername = new Map<string, User>();

  createUser(username: string, roles: Role[] = [], passwordHash?: string): User {
    if (this.usersByUsername.has(username)) {
      throw new Error(alreadyExistsError("User", username));
    }
    const user: User = {
      id: username,
      username,
      roles: [...roles],
      passwordHash
    };
    this.usersByUsername.set(username, user);
    return user;
  }

  getUser(username: string): User | undefined {
    return this.usersByUsername.get(username);
  }

  assignRoles(username: string, roles: Role[]): User {
    const user = this.usersByUsername.get(username);
    if (!user) {
      throw new Error(notFoundError("User", username));
    }
    const uniqueRoles = Array.from(new Set([...user.roles, ...roles]));
    user.roles = uniqueRoles;
    return user;
  }

  listUsers(): User[] {
    return Array.from(this.usersByUsername.values());
  }

  removeUser(username: string): void {
    if (!this.usersByUsername.has(username)) {
      throw new Error(notFoundError("User", username));
    }
    this.usersByUsername.delete(username);
  }

  revokeRole(username: string, role: Role): User {
    const user = this.usersByUsername.get(username);
    if (!user) {
      throw new Error(notFoundError("User", username));
    }
    user.roles = user.roles.filter((r) => r !== role);
    return user;
  }

  setRoles(username: string, roles: Role[]): User {
    const user = this.usersByUsername.get(username);
    if (!user) {
      throw new Error(notFoundError("User", username));
    }
    user.roles = [...roles];
    return user;
  }

  updatePassword(username: string, passwordHash: string): User {
    const user = this.usersByUsername.get(username);
    if (!user) {
      throw new Error(notFoundError("User", username));
    }
    user.passwordHash = passwordHash;
    return user;
  }
}


