import fs from "fs";
import path from "path";
import https from "https";
import { InMemoryCampaignStore } from "./campaignStore";

export interface CampaignSeedOptions {
  /** Optional explicit path to the campaigns JSON file. */
  campaignsFilePath?: string;
}

async function fetchWorldNameToIdMap(): Promise<Map<string, string>> {
  const worldServiceUrl =
    process.env.WORLD_SERVICE_URL ?? "https://localhost:3002";
  const worldNameToId = new Map<string, string>();

  try {
    const url = new URL(`${worldServiceUrl}/worlds`);

    const response = await new Promise<{
      statusCode?: number;
      data: string;
    }>((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: "GET",
        rejectUnauthorized: false
      } as const;

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
      const body = JSON.parse(response.data) as {
        worlds: Array<{ id: string; name: string }>;
      };
      for (const world of body.worlds) {
        worldNameToId.set(world.name, world.id);
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `Could not fetch worlds from ${worldServiceUrl} for scene seeding:`,
      (err as Error).message
    );
  }

  return worldNameToId;
}

/**
 * Seed campaigns, sessions, scenes, players, story arcs, and events
 * into the provided store from a JSON file.
 */
export const seedCampaigns = async (
  store: InMemoryCampaignStore,
  options: CampaignSeedOptions = {}
): Promise<void> => {
  const campaignsFilePath = options.campaignsFilePath
    ? path.isAbsolute(options.campaignsFilePath)
      ? options.campaignsFilePath
      : path.join(process.cwd(), options.campaignsFilePath)
    : process.env.CAMPAIGN_CAMPAIGNS_FILE
    ? path.isAbsolute(process.env.CAMPAIGN_CAMPAIGNS_FILE)
      ? process.env.CAMPAIGN_CAMPAIGNS_FILE
      : path.join(process.cwd(), process.env.CAMPAIGN_CAMPAIGNS_FILE)
    : "/tmp/campaigns.json";

  try {
    if (!fs.existsSync(campaignsFilePath)) {
      // eslint-disable-next-line no-console
      console.warn(
        `Campaigns file not found at ${campaignsFilePath}, skipping campaign seeding`
      );
      return;
    }

    const worldNameToId = await fetchWorldNameToIdMap();

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

    for (const campaignData of campaignsData) {
      if (!campaignData.name || !campaignData.summary) {
        // eslint-disable-next-line no-console
        console.warn(
          `Skipping campaign with missing name or summary: ${JSON.stringify(
            campaignData
          )}`
        );
        continue;
      }

      try {
        const campaign = store.createCampaign(
          campaignData.name,
          campaignData.summary
        );

        if (campaignData.currentMoment) {
          campaign.currentMoment = campaignData.currentMoment;
        }

        if (campaignData.playerIds) {
          for (const playerId of campaignData.playerIds) {
            try {
              store.addPlayer(campaign.id, playerId);
            } catch (err) {
              // eslint-disable-next-line no-console
              console.warn(
                `Failed to add player ${playerId} to campaign ${campaign.name}:`,
                (err as Error).message
              );
            }
          }
        }

        if (campaignData.sessions) {
          for (const sessionData of campaignData.sessions) {
            if (!sessionData.name) {
              // eslint-disable-next-line no-console
              console.warn(
                `Skipping session with missing name in campaign ${campaign.name}`
              );
              continue;
            }
            try {
              const session = store.createSession(campaign.id, sessionData.name);

              if (sessionData.scenes) {
                for (const sceneData of sessionData.scenes) {
                  if (!sceneData.name || !sceneData.summary) {
                    // eslint-disable-next-line no-console
                    console.warn(
                      `Skipping scene with missing name or summary in session ${session.name}`
                    );
                    continue;
                  }

                  let worldId: string | undefined;
                  if (sceneData.worldName) {
                    worldId = worldNameToId.get(sceneData.worldName);
                    if (!worldId) {
                      // eslint-disable-next-line no-console
                      console.warn(
                        `World '${sceneData.worldName}' not found, skipping scene '${sceneData.name}'`
                      );
                      continue;
                    }
                  } else {
                    // eslint-disable-next-line no-console
                    console.warn(
                      `Scene '${sceneData.name}' missing worldName, skipping`
                    );
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
                    console.error(
                      `Failed to seed scene ${sceneData.name}:`,
                      (err as Error).message
                    );
                  }
                }
              }

              // eslint-disable-next-line no-console
              console.log(`  Seeded session: ${session.name}`);
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error(
                `Failed to seed session ${sessionData.name}:`,
                (err as Error).message
              );
            }
          }
        }

        if (campaignData.storyArcs) {
          for (const arcData of campaignData.storyArcs) {
            if (!arcData.name || !arcData.summary) {
              // eslint-disable-next-line no-console
              console.warn(
                `Skipping story arc with missing name or summary in campaign ${campaign.name}`
              );
              continue;
            }
            try {
              const storyArc = store.createStoryArc(
                campaign.id,
                arcData.name,
                arcData.summary
              );
              if (arcData.eventIds) {
                for (const eventId of arcData.eventIds) {
                  try {
                    store.addEventToStoryArc(storyArc.id, eventId);
                  } catch (err) {
                    // eslint-disable-next-line no-console
                    console.warn(
                      `Failed to add event ${eventId} to story arc ${storyArc.name}:`,
                      (err as Error).message
                    );
                  }
                }
              }
              // eslint-disable-next-line no-console
              console.log(`  Seeded story arc: ${storyArc.name}`);
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error(
                `Failed to seed story arc ${arcData.name}:`,
                (err as Error).message
              );
            }
          }
        }

        // eslint-disable-next-line no-console
        console.log(`Seeded campaign: ${campaign.name}`);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          `Failed to seed campaign ${campaignData.name}:`,
          (err as Error).message
        );
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `Successfully seeded ${campaignsData.length} campaign(s) from ${campaignsFilePath}`
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `Failed to load campaigns from ${campaignsFilePath}:`,
      (err as Error).message
    );
  }
};
