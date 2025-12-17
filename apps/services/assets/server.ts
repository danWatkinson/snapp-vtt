import "dotenv/config";
import https from "https";
import fs from "fs";
import path from "path";
import { createAssetApp, InMemoryAssetStore } from "./app";
import { seedAssets } from "./assetSeeder";

const port = Number(process.env.ASSET_PORT ?? process.env.PORT ?? 4700);

const store = new InMemoryAssetStore();

// Seed assets before creating the app
seedAssets(store);

const app = createAssetApp({ store });

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
  console.log(`Asset service listening on https://localhost:${port}`);
});

