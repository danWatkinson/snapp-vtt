import "dotenv/config";
import https from "https";
import fs from "fs";
import path from "path";
import { createApp } from "./app";
import { InMemoryUserStore } from "./userStore";
import { seedUsers } from "./userSeeder";

const port = Number(process.env.AUTH_PORT ?? process.env.PORT ?? 4400);

const seededStore = new InMemoryUserStore();

async function bootstrap() {
  try {
    // Seed users before starting the server. If seeding fails, log and continue
    // so that the service can still start (tests rely on this behaviour).
    await seedUsers(seededStore);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to seed users for auth service:", err);
  }

    const app = createApp({ userStore: seededStore });

    const certDir =
      process.env.HTTPS_CERT_DIR ??
      path.join(process.cwd(), "..", "Snapp-other", "certs");
    const keyPath =
      process.env.HTTPS_KEY_PATH ?? path.join(certDir, "localhost-key.pem");
    const certPath =
      process.env.HTTPS_CERT_PATH ?? path.join(certDir, "localhost-cert.pem");

    try {
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

      server.on("error", (err) => {
        // eslint-disable-next-line no-console
        console.error("Auth service server error:", err);
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to start auth service:", err);
    // Avoid killing the test runner; only exit in non-test environments.
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  }
}

bootstrap().catch((err) => {
    // eslint-disable-next-line no-console
  console.error("Unexpected error during auth service bootstrap:", err);
  if (process.env.NODE_ENV !== "test") {
    process.exit(1);
  }
  });

