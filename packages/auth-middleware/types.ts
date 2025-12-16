export type Role = "admin" | "gm" | "player";

export interface TokenPayload {
  sub: string;
  roles: Role[];
}

export interface AuthenticatedRequest {
  auth: {
    userId: string;
    roles: Role[];
  };
}

