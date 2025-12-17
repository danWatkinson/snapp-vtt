import "dotenv/config";
import https from "https";
import fs from "fs";
import path from "path";
import { createCampaignApp } from "./app";
import { InMemoryCampaignStore } from "./campaignStore";
import { seedCampaigns } from "./campaignSeeder";

const port = Number(process.env.CAMPAIGN_PORT ?? process.env.PORT ?? 4600);

const store = new InMemoryCampaignStore();

// Create app (store is already created and will be populated by seeding)
const app = createCampaignApp({ store });

// Seed campaigns before starting server (async)
seedCampaigns(store)
  .then(() => {
    // Start server after seeding completes
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
      console.log(`Campaign service listening on https://localhost:${port}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Error during campaign seeding:", err);
    // Start server anyway - allow server to start even if seeding fails
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
      console.log(`Campaign service listening on https://localhost:${port}`);
    });
  });


