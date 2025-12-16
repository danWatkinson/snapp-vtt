import "dotenv/config";
import https from "https";
import fs from "fs";
import path from "path";
import { createCampaignApp } from "./app";
import { InMemoryCampaignStore } from "./campaignStore";

const port = Number(process.env.CAMPAIGN_PORT ?? process.env.PORT ?? 4600);

const store = new InMemoryCampaignStore();

// Helper function to fetch worlds and create a name-to-ID mapping
async function fetchWorldNameToIdMap(): Promise<Map<string, string>> {
  const worldServiceUrl = process.env.WORLD_SERVICE_URL ?? "https://localhost:3002";
  const worldNameToId = new Map<string, string>();

  try {
    // Use https module directly to make request (since we're using self-signed certs)
    const url = new URL(`${worldServiceUrl}/worlds`);
    
    const response = await new Promise<{ statusCode?: number; data: string }>((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: "GET",
        rejectUnauthorized: false // Accept self-signed certificates
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode, data });
        });
      });

      req.on("error", reject);
      req.end();
    });

    if (response.statusCode === 200) {
      const body = JSON.parse(response.data) as { worlds: Array<{ id: string; name: string }> };
      for (const world of body.worlds) {
        worldNameToId.set(world.name, world.id);
      }
    }
  } catch (err) {
    // World service might not be available yet - that's okay
    // eslint-disable-next-line no-console
    console.warn(`Could not fetch worlds from ${worldServiceUrl} for scene seeding:`, (err as Error).message);
  }

  return worldNameToId;
}

// Seed campaigns, sessions, and story arcs from JSON file on startup
const seedCampaigns = async () => {
  const campaignsFilePath =
    process.env.CAMPAIGN_CAMPAIGNS_FILE ??
    path.join(
      process.cwd(),
      "..",
      "Snapp-other",
      "bootstrap",
      "campaigns.json"
    );

  try {
    // Check if the file exists
    if (!fs.existsSync(campaignsFilePath)) {
      // eslint-disable-next-line no-console
      console.warn(`Campaigns file not found at ${campaignsFilePath}, skipping campaign seeding`);
      return;
    }

    // Fetch world name-to-ID mapping for scene creation
    const worldNameToId = await fetchWorldNameToIdMap();

    // Read and parse the campaigns file
    const campaignsFileContent = fs.readFileSync(campaignsFilePath, "utf-8");
    const campaignsData = JSON.parse(campaignsFileContent) as Array<{
      name: string;
      summary: string;
      playerIds?: string[];
      currentMoment?: number;
      sessions?: Array<{
        name: string;
        scenes?: Array<{
          name: string;
          summary: string;
          worldName?: string;
          entityIds?: string[];
        }>;
      }>;
      storyArcs?: Array<{
        name: string;
        summary: string;
        eventIds?: string[];
      }>;
    }>;

    // Create campaigns, sessions, and story arcs
    for (const campaignData of campaignsData) {
      if (!campaignData.name || !campaignData.summary) {
        // eslint-disable-next-line no-console
        console.warn(`Skipping campaign with missing name or summary: ${JSON.stringify(campaignData)}`);
        continue;
      }

      try {
        // Create campaign
        const campaign = store.createCampaign(campaignData.name, campaignData.summary);
        
        // Set current moment if provided
        if (campaignData.currentMoment) {
          campaign.currentMoment = campaignData.currentMoment;
        }

        // Add players if provided
        if (campaignData.playerIds) {
          for (const playerId of campaignData.playerIds) {
            try {
              store.addPlayer(campaign.id, playerId);
            } catch (err) {
              // If player already exists or other error, just log it
              // eslint-disable-next-line no-console
              console.warn(`Failed to add player ${playerId} to campaign ${campaign.name}:`, (err as Error).message);
            }
          }
        }

        // Create sessions
        if (campaignData.sessions) {
          for (const sessionData of campaignData.sessions) {
            if (!sessionData.name) {
              // eslint-disable-next-line no-console
              console.warn(`Skipping session with missing name in campaign ${campaign.name}`);
              continue;
            }
            try {
              const session = store.createSession(campaign.id, sessionData.name);
              
              // Create scenes for this session
              if (sessionData.scenes) {
                for (const sceneData of sessionData.scenes) {
                  if (!sceneData.name || !sceneData.summary) {
                    // eslint-disable-next-line no-console
                    console.warn(`Skipping scene with missing name or summary in session ${session.name}`);
                    continue;
                  }
                  
                  // Look up world ID by name
                  let worldId: string | undefined;
                  if (sceneData.worldName) {
                    worldId = worldNameToId.get(sceneData.worldName);
                    if (!worldId) {
                      // eslint-disable-next-line no-console
                      console.warn(`World '${sceneData.worldName}' not found, skipping scene '${sceneData.name}'`);
                      continue;
                    }
                  } else {
                    // eslint-disable-next-line no-console
                    console.warn(`Scene '${sceneData.name}' missing worldName, skipping`);
                    continue;
                  }

                  try {
                    store.createScene(
                      session.id,
                      sceneData.name,
                      sceneData.summary,
                      worldId,
                      sceneData.entityIds || []
                    );
                    // eslint-disable-next-line no-console
                    console.log(`    Seeded scene: ${sceneData.name}`);
                  } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error(`Failed to seed scene ${sceneData.name}:`, (err as Error).message);
                  }
                }
              }
              
              // eslint-disable-next-line no-console
              console.log(`  Seeded session: ${session.name}`);
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error(`Failed to seed session ${sessionData.name}:`, (err as Error).message);
            }
          }
        }

        // Create story arcs
        if (campaignData.storyArcs) {
          for (const arcData of campaignData.storyArcs) {
            if (!arcData.name || !arcData.summary) {
              // eslint-disable-next-line no-console
              console.warn(`Skipping story arc with missing name or summary in campaign ${campaign.name}`);
              continue;
            }
            try {
              const storyArc = store.createStoryArc(campaign.id, arcData.name, arcData.summary);
              // Add events if provided
              if (arcData.eventIds) {
                for (const eventId of arcData.eventIds) {
                  try {
                    store.addEventToStoryArc(storyArc.id, eventId);
                  } catch (err) {
                    // eslint-disable-next-line no-console
                    console.warn(`Failed to add event ${eventId} to story arc ${storyArc.name}:`, (err as Error).message);
                  }
                }
              }
              // eslint-disable-next-line no-console
              console.log(`  Seeded story arc: ${storyArc.name}`);
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error(`Failed to seed story arc ${arcData.name}:`, (err as Error).message);
            }
          }
        }

        // eslint-disable-next-line no-console
        console.log(`Seeded campaign: ${campaign.name}`);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Failed to seed campaign ${campaignData.name}:`, (err as Error).message);
      }
    }

    // eslint-disable-next-line no-console
    console.log(`Successfully seeded ${campaignsData.length} campaign(s) from ${campaignsFilePath}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Failed to load campaigns from ${campaignsFilePath}:`, (err as Error).message);
    // Don't throw - allow server to start even if seeding fails
  }
};

// Create app (store is already created and will be populated by seeding)
const app = createCampaignApp({ store });

// Seed campaigns before starting server (async)
seedCampaigns()
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


