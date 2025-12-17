import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import { InMemoryUserStore, type Role } from "./userStore";

export interface UserSeedOptions {
  /** Optional explicit path to the users JSON file. If omitted, AUTH_USERS_FILE and the default path will be used. */
  usersFilePath?: string;
}

/**
 * Seed users into the provided store from a JSON file.
 *
 * The JSON file is expected to contain an array of objects:
 * [{ "username": string, "password": string, "roles": string[] }]
 */
export const seedUsers = async (
  store: InMemoryUserStore,
  options: UserSeedOptions = {}
): Promise<void> => {
  const usersFileEnv = process.env.AUTH_USERS_FILE;
  const usersFilePath = options.usersFilePath
    ? path.isAbsolute(options.usersFilePath)
      ? options.usersFilePath
      : path.join(process.cwd(), options.usersFilePath)
    : usersFileEnv
    ? path.isAbsolute(usersFileEnv)
      ? usersFileEnv
      : path.join(process.cwd(), usersFileEnv)
    : path.join(
        process.cwd(),
        "..",
        "Snapp-other",
        "bootstrap",
        "users.json"
      );

  try {
    if (!fs.existsSync(usersFilePath)) {
      // eslint-disable-next-line no-console
      console.warn(
        `Users file not found at ${usersFilePath}, skipping user seeding`
      );
      return;
    }

    const usersFileContent = fs.readFileSync(usersFilePath, "utf-8");
    const users = JSON.parse(usersFileContent) as Array<{
      username: string;
      password: string;
      roles: string[];
    }>;

    for (const user of users) {
      if (!user.username || !user.password) {
        // eslint-disable-next-line no-console
        console.warn(
          `Skipping user with missing username or password: ${JSON.stringify(
            user
          )}`
        );
        continue;
      }

      try {
        const passwordHash = await bcrypt.hash(user.password, 10);
        const roles = (user.roles || []).filter((r): r is Role =>
          r === "admin" || r === "gm" || r === "player"
        );
        store.createUser(user.username, roles, passwordHash);
        // eslint-disable-next-line no-console
        console.log(
          `Seeded user: ${user.username} with roles: ${
            (user.roles || []).join(", ") || "none"
          }`
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          `Failed to seed user ${user.username}:`,
          (err as Error).message
        );
      }
    }

    // eslint-disable-next-line no-console
    console.log(`Successfully seeded ${users.length} user(s) from ${usersFilePath}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `Failed to load users from ${usersFilePath}:`,
      (err as Error).message
    );
  }
};
