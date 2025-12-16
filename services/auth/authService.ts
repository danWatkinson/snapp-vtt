import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { InMemoryUserStore, Role, User } from "./userStore";

export interface AuthServiceConfig {
  jwtSecret: string;
  tokenExpiresInSeconds: number;
}

export interface TokenPayload {
  sub: string;
  roles: Role[];
}

export class AuthService {
  private readonly userStore: InMemoryUserStore;
  private readonly config: AuthServiceConfig;

  constructor(userStore: InMemoryUserStore, config: AuthServiceConfig) {
    this.userStore = userStore;
    this.config = config;
  }

  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const existing = this.userStore.getUser(username);
    if (!existing) {
      throw new Error("Invalid username or password");
    }

    // If user has no password hash, they might be SSO-only (future feature)
    // For now, require password for all users
    if (!existing.passwordHash) {
      throw new Error("Invalid username or password");
    }

    const passwordValid = await bcrypt.compare(password, existing.passwordHash);
    if (!passwordValid) {
      throw new Error("Invalid username or password");
    }

    const payload: TokenPayload = {
      sub: existing.id,
      roles: existing.roles
    };
    const token = jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.tokenExpiresInSeconds
    });
    return { user: existing, token };
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  assignRolesAsAdmin(
    actingUsername: string,
    targetUsername: string,
    roles: Role[]
  ): User {
    const acting = this.userStore.getUser(actingUsername);
    if (!acting || !acting.roles.includes("admin")) {
      throw new Error("Only admins can assign roles");
    }
    return this.userStore.assignRoles(targetUsername, roles);
  }

  verifyToken(token: string): TokenPayload {
    const decoded = jwt.verify(token, this.config.jwtSecret);
    if (typeof decoded === "string") {
      throw new Error("Invalid token payload");
    }
    const { sub, roles } = decoded as TokenPayload;
    return { sub, roles };
  }
}


