import "dotenv/config";
import https from "https";
import fs from "fs";
import path from "path";
import { createWorldApp } from "./app";
import { InMemoryWorldStore } from "./worldStore";
import { InMemoryWorldEntityStore } from "./worldEntitiesStore";

// Use a non-conflicting default port for the world service.
const port = Number(process.env.WORLD_PORT ?? process.env.PORT ?? 4501);

const store = new InMemoryWorldStore();
const entityStore = new InMemoryWorldEntityStore();

const app = createWorldApp({ store, entityStore });

// Start the server
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
    console.log(`World service listening on https://localhost:${port}`);
  });

  server.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("World service server error:", err);
  });
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("Failed to start world service:", err);
  // Avoid killing the test runner; only exit in non-test environments
  if (process.env.NODE_ENV !== "test") {
    process.exit(1);
  }
}


