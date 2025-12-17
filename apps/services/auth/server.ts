import "dotenv/config";
import https from "https";
import fs from "fs";
import path from "path";
import { createApp } from "./app";
import { InMemoryUserStore } from "./userStore";
import { seedUsers } from "./userSeeder";

const port = Number(process.env.AUTH_PORT ?? process.env.PORT ?? 4400);

const seededStore = new InMemoryUserStore();

// Start server after seeding
seedUsers(seededStore).then(() => {
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
