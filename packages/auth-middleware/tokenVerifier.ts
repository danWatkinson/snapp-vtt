import jwt from "jsonwebtoken";
import { TokenPayload } from "./types";

export interface TokenVerifierConfig {
  jwtSecret: string;
}

export class TokenVerifier {
  private readonly jwtSecret: string;

  constructor(config: TokenVerifierConfig) {
    this.jwtSecret = config.jwtSecret;
  }

  verifyToken(token: string): TokenPayload {
    const decoded = jwt.verify(token, this.jwtSecret);
    if (typeof decoded === "string") {
      throw new Error("Invalid token payload");
    }
    const { sub, roles } = decoded as TokenPayload;
    return { sub, roles };
  }
}

