import "dotenv/config";
import https from "https";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import { createApp } from "./app";
import { InMemoryUserStore, Role } from "./userStore";

const port = Number(process.env.AUTH_PORT ?? process.env.PORT ?? 4400);

const seededStore = new InMemoryUserStore();

// Seed users from JSON file on startup
// In production, this would be done via migration or admin UI
const seedUsers = async () => {
  const usersFileEnv = process.env.AUTH_USERS_FILE;
  const usersFilePath = usersFileEnv
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
    // Check if the file exists
    if (!fs.existsSync(usersFilePath)) {
      // eslint-disable-next-line no-console
      console.warn(`Users file not found at ${usersFilePath}, skipping user seeding`);
      return;
    }

    // Read and parse the users file
    const usersFileContent = fs.readFileSync(usersFilePath, "utf-8");
    const users = JSON.parse(usersFileContent) as Array<{
      username: string;
      password: string;
      roles: string[];
    }>;

    // Hash passwords and create users
    for (const user of users) {
      if (!user.username || !user.password) {
        // eslint-disable-next-line no-console
        console.warn(`Skipping user with missing username or password: ${JSON.stringify(user)}`);
        continue;
      }

      try {
        const passwordHash = await bcrypt.hash(user.password, 10);
        // Validate and cast roles to Role[]
        const roles = (user.roles || []).filter((r): r is Role => 
          r === "admin" || r === "gm" || r === "player"
        ) as Role[];
        seededStore.createUser(user.username, roles, passwordHash);
        // eslint-disable-next-line no-console
        console.log(`Seeded user: ${user.username} with roles: ${(user.roles || []).join(", ") || "none"}`);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Failed to seed user ${user.username}:`, (err as Error).message);
      }
    }

    // eslint-disable-next-line no-console
    console.log(`Successfully seeded ${users.length} user(s) from ${usersFilePath}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Failed to load users from ${usersFilePath}:`, (err as Error).message);
    // Don't throw - allow server to start even if seeding fails
  }
};

// Start server after seeding
seedUsers().then(() => {
  const app = createApp({ userStore: seededStore });

  const certDir =
    process.env.HTTPS_CERT_DIR ??
    path.join(process.cwd(), "..", "Snapp-other", "certs");
  const keyPath =
    process.env.HTTPS_KEY_PATH ?? path.join(certDir, "localhost-key.pem");
  const certPath =
    process.env.HTTPS_CERT_PATH ?? path.join(certDir, "localhost-cert.pem");

  const server = https.createServer(
    {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    },
    app
  );

  server.listen(port, () => {
    // eslint-disable-next-line no-console
    /* c8 ignore next */ // startup log only; server.listen side-effects tested in server.test.ts
    console.log(`Auth service listening on https://localhost:${port}`);
  });
});

