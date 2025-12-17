#!/usr/bin/env ts-node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import https from "https";
import fs from "fs";
import path from "path";

interface SeedOptions {
  username: string;
  password: string;
  authUrl: string;
  worldUrl: string;
  campaignUrl: string;
  assetUrl: string;
  file: string;
}

/**
 * Authenticate with the auth service and return a JWT token
 */
async function authenticate(
  authUrl: string,
  username: string,
  password: string
): Promise<string> {
  const response = await makeRequest(authUrl, "/auth/login", "POST", undefined, {
    username,
    password
  });

  if (response.status !== 200) {
    throw new Error(
      `Authentication failed: ${response.body?.error || "Unknown error"}`
    );
  }

  const token = (response.body as { token?: string }).token;
  if (!token) {
    throw new Error("No token received from auth service");
  }

  return token;
}

/**
 * Make an HTTPS request with self-signed cert support
 */
async function makeRequest(
  baseUrl: string,
  path: string,
  method: string = "GET",
  token?: string,
  body?: any
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` })
      },
      rejectUnauthorized: false // Allow self-signed certs in dev
    };

    const req = https.request(requestOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const responseBody = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode || 200, body: responseBody });
        } catch (err) {
          reject(new Error(`Failed to parse response: ${(err as Error).message}`));
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Look up an asset ID by filename from the asset service
 */
async function lookupAssetByFileName(
  assetUrl: string,
  token: string,
  fileName: string
): Promise<string | undefined> {
  const response = await makeRequest(assetUrl, "/assets", "GET", token);

  if (response.status !== 200) {
    console.warn(`Failed to fetch assets: ${response.body?.error || "Unknown error"}`);
    return undefined;
  }

  const assets = (response.body as { assets?: Array<{ id: string; originalFileName: string }> }).assets ?? [];
  const asset = assets.find((a) => a.originalFileName === fileName);
  return asset?.id;
}

/**
 * Detect file type by examining JSON structure
 * Handles both arrays and single objects
 */
function detectFileType(fileContent: any): "worlds" | "campaigns" | "unknown" {
  // Normalize to array - handle both single objects and arrays
  let items: any[];
  if (Array.isArray(fileContent)) {
    if (fileContent.length === 0) {
      return "unknown";
    }
    items = fileContent;
  } else if (fileContent && typeof fileContent === "object") {
    // Single object - wrap in array
    items = [fileContent];
  } else {
    return "unknown";
  }

  const firstItem = items[0];
  
  // Worlds have: name, description, optional entities array
  if (firstItem.name && firstItem.description && (firstItem.entities === undefined || Array.isArray(firstItem.entities))) {
    // Check if it looks like a world (entities have type, name, summary)
    if (firstItem.entities && firstItem.entities.length > 0) {
      const entity = firstItem.entities[0];
      if (entity.type && entity.name && entity.summary) {
        return "worlds";
      }
    }
    // Or if it has splashImageFileName, it's definitely a world
    if (firstItem.splashImageFileName !== undefined) {
      return "worlds";
    }
    // If it has name/description but no other distinguishing features, check for campaign indicators
    if (firstItem.summary !== undefined && firstItem.sessions !== undefined) {
      return "campaigns";
    }
    // Default to worlds if it has name/description (worlds are simpler structure)
    if (!firstItem.summary && !firstItem.sessions && !firstItem.storyArcs) {
      return "worlds";
    }
  }

  // Campaigns have: name, summary, optional sessions, storyArcs, playerIds
  if (firstItem.name && firstItem.summary !== undefined) {
    if (firstItem.sessions !== undefined || firstItem.storyArcs !== undefined || firstItem.playerIds !== undefined) {
      return "campaigns";
    }
  }

  return "unknown";
}

/**
 * Seed worlds from JSON file
 */
async function seedWorlds(filePath: string, options: SeedOptions, token: string): Promise<void> {
  const worldsFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  if (!fs.existsSync(worldsFilePath)) {
    console.warn(`Worlds file not found at ${worldsFilePath}, skipping world seeding`);
    return;
  }

  const worldsFileContent = fs.readFileSync(worldsFilePath, "utf-8");
  const parsedContent = JSON.parse(worldsFileContent);
  // Handle both single world object and array of worlds
  const worlds = Array.isArray(parsedContent) 
    ? parsedContent 
    : [parsedContent] as Array<{
    name: string;
    description: string;
    splashImageFileName?: string;
    entities?: Array<{
      type: string;
      name: string;
      summary: string;
      beginningTimestamp?: number;
      endingTimestamp?: number;
    }>;
  }>;

  // Get existing worlds to check for duplicates
  const existingWorldsResponse = await makeRequest(options.worldUrl, "/worlds", "GET", token);
  const existingWorlds = (existingWorldsResponse.body as { worlds?: Array<{ id: string; name: string }> }).worlds ?? [];
  const worldNameToId = new Map<string, string>();
  for (const world of existingWorlds) {
    worldNameToId.set(world.name.toLowerCase(), world.id);
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const world of worlds) {
    if (!world.name || !world.description) {
      console.warn(`Skipping world with missing name or description: ${JSON.stringify(world)}`);
      continue;
    }

    const worldKey = world.name.toLowerCase();
    let worldId = worldNameToId.get(worldKey);

    // Create world if it doesn't exist
    if (!worldId) {
      try {
        const createResponse = await makeRequest(
          options.worldUrl,
          "/worlds",
          "POST",
          token,
          { name: world.name, description: world.description }
        );

        if (createResponse.status === 201) {
          worldId = (createResponse.body as { world?: { id: string } }).world?.id;
          if (worldId) {
            worldNameToId.set(worldKey, worldId);
            console.log(`✓ Created world: ${world.name}`);
            createdCount++;
          }
        } else if (createResponse.status === 400 && (createResponse.body as any).error?.includes("already exists")) {
          // World exists but wasn't in our list (case sensitivity or timing)
          console.log(`  World '${world.name}' already exists, skipping creation`);
          skippedCount++;
          continue;
        } else {
          throw new Error((createResponse.body as any).error || "Unknown error");
        }
      } catch (err) {
        console.error(`Failed to create world ${world.name}:`, (err as Error).message);
        continue;
      }
    } else {
      console.log(`  World '${world.name}' already exists, skipping creation`);
      skippedCount++;
    }

    if (!worldId) {
      console.warn(`  No world ID for ${world.name}, skipping entities`);
      continue;
    }

    // Set splash image if provided
    if (world.splashImageFileName) {
      const assetId = await lookupAssetByFileName(
        options.assetUrl,
        token,
        world.splashImageFileName
      );
      if (assetId) {
        try {
          await makeRequest(
            options.worldUrl,
            `/worlds/${worldId}`,
            "PATCH",
            token,
            { splashImageAssetId: assetId }
          );
          console.log(`  Set splash image: ${world.splashImageFileName}`);
        } catch (err) {
          console.warn(`  Failed to set splash image for ${world.name}:`, (err as Error).message);
        }
      } else {
        console.warn(`  Splash image '${world.splashImageFileName}' not found, skipping`);
      }
    }

    // Create entities
    if (world.entities) {
      for (const entity of world.entities) {
        if (!entity.name || !entity.summary || !entity.type) {
          console.warn(`  Skipping entity with missing fields: ${JSON.stringify(entity)}`);
          continue;
        }

        try {
          const entityResponse = await makeRequest(
            options.worldUrl,
            `/worlds/${worldId}/entities`,
            "POST",
            token,
            {
              type: entity.type,
              name: entity.name,
              summary: entity.summary,
              beginningTimestamp: entity.beginningTimestamp,
              endingTimestamp: entity.endingTimestamp
            }
          );

          if (entityResponse.status === 201) {
            console.log(`    ✓ Created ${entity.type}: ${entity.name}`);
          } else if (entityResponse.status === 400 && (entityResponse.body as any).error?.includes("already exists")) {
            console.log(`    Entity '${entity.name}' already exists, skipping`);
          } else {
            throw new Error((entityResponse.body as any).error || "Unknown error");
          }
        } catch (err) {
          console.error(`    Failed to create ${entity.type} ${entity.name}:`, (err as Error).message);
        }
      }
    }
  }

  console.log(`\nWorld seeding complete: ${createdCount} created, ${skippedCount} skipped`);
}

/**
 * Seed campaigns from JSON file
 */
async function seedCampaigns(filePath: string, options: SeedOptions, token: string): Promise<void> {
  const campaignsFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  if (!fs.existsSync(campaignsFilePath)) {
    console.warn(`Campaigns file not found at ${campaignsFilePath}, skipping campaign seeding`);
    return;
  }

  const campaignsFileContent = fs.readFileSync(campaignsFilePath, "utf-8");
  const parsedContent = JSON.parse(campaignsFileContent);
  // Handle both single campaign object and array of campaigns
  const campaignsData = Array.isArray(parsedContent)
    ? parsedContent
    : [parsedContent] as Array<{
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

  // Get world name-to-ID mapping
  const worldsResponse = await makeRequest(options.worldUrl, "/worlds", "GET", token);
  const worlds = (worldsResponse.body as { worlds?: Array<{ id: string; name: string }> }).worlds ?? [];
  const worldNameToId = new Map<string, string>();
  for (const world of worlds) {
    worldNameToId.set(world.name, world.id);
  }

  // Get existing campaigns to check for duplicates
  const existingCampaignsResponse = await makeRequest(options.campaignUrl, "/campaigns", "GET", token);
  const existingCampaigns = (existingCampaignsResponse.body as { campaigns?: Array<{ id: string; name: string }> }).campaigns ?? [];
  const campaignNameToId = new Map<string, string>();
  for (const campaign of existingCampaigns) {
    campaignNameToId.set(campaign.name.toLowerCase(), campaign.id);
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const campaignData of campaignsData) {
    if (!campaignData.name || !campaignData.summary) {
      console.warn(`Skipping campaign with missing name or summary: ${JSON.stringify(campaignData)}`);
      continue;
    }

    const campaignKey = campaignData.name.toLowerCase();
    let campaignId = campaignNameToId.get(campaignKey);

    // Create campaign if it doesn't exist
    if (!campaignId) {
      try {
        const createResponse = await makeRequest(
          options.campaignUrl,
          "/campaigns",
          "POST",
          token,
          { name: campaignData.name, summary: campaignData.summary }
        );

        if (createResponse.status === 201) {
          campaignId = (createResponse.body as { campaign?: { id: string } }).campaign?.id;
          if (campaignId) {
            campaignNameToId.set(campaignKey, campaignId);
            console.log(`✓ Created campaign: ${campaignData.name}`);
            createdCount++;
          }
        } else if (createResponse.status === 400 && (createResponse.body as any).error?.includes("already exists")) {
          // Campaign exists but wasn't in our list - fetch it to get the ID
          const allCampaignsResponse = await makeRequest(options.campaignUrl, "/campaigns", "GET", token);
          const allCampaigns = (allCampaignsResponse.body as { campaigns?: Array<{ id: string; name: string }> }).campaigns ?? [];
          const existingCampaign = allCampaigns.find(c => c.name.toLowerCase() === campaignKey);
          if (existingCampaign) {
            campaignId = existingCampaign.id;
            campaignNameToId.set(campaignKey, campaignId);
          }
          console.log(`  Campaign '${campaignData.name}' already exists, skipping creation`);
          skippedCount++;
        } else {
          throw new Error((createResponse.body as any).error || "Unknown error");
        }
      } catch (err) {
        console.error(`Failed to create campaign ${campaignData.name}:`, (err as Error).message);
        continue;
      }
    } else {
      console.log(`  Campaign '${campaignData.name}' already exists, skipping creation`);
      skippedCount++;
    }

    if (!campaignId) {
      console.warn(`  No campaign ID for ${campaignData.name}, skipping related data`);
      continue;
    }

    // Note: currentMoment is not settable via API - campaigns are created with Date.now()
    // If a specific currentMoment is needed, it would require a PATCH endpoint

    // Add players
    if (campaignData.playerIds) {
      for (const playerId of campaignData.playerIds) {
        try {
          const playerResponse = await makeRequest(
            options.campaignUrl,
            `/campaigns/${campaignId}/players`,
            "POST",
            token,
            { playerId }
          );

          if (playerResponse.status === 201) {
            console.log(`  ✓ Added player: ${playerId}`);
          } else if (playerResponse.status === 400 && (playerResponse.body as any).error?.includes("already")) {
            console.log(`  Player '${playerId}' already in campaign, skipping`);
          } else {
            throw new Error((playerResponse.body as any).error || "Unknown error");
          }
        } catch (err) {
          // Check if it's an "already exists" error - if so, just log and continue
          const errorMsg = (err as Error).message;
          if (errorMsg.includes("already")) {
            console.log(`  Player '${playerId}' already in campaign, skipping`);
          } else {
            console.warn(`  Failed to add player ${playerId}:`, errorMsg);
          }
        }
      }
    }

    // Create sessions and scenes
    if (campaignData.sessions) {
      for (const sessionData of campaignData.sessions) {
        if (!sessionData.name) {
          console.warn(`  Skipping session with missing name in campaign ${campaignData.name}`);
          continue;
        }

        let sessionId: string | undefined;
        try {
          const sessionResponse = await makeRequest(
            options.campaignUrl,
            `/campaigns/${campaignId}/sessions`,
            "POST",
            token,
            { name: sessionData.name }
          );

          if (sessionResponse.status === 201) {
            sessionId = (sessionResponse.body as { session?: { id: string } }).session?.id;
            if (sessionId) {
              console.log(`  ✓ Created session: ${sessionData.name}`);
            }
          } else {
            throw new Error((sessionResponse.body as any).error || "Unknown error");
          }
        } catch (err) {
          console.error(`  Failed to create session ${sessionData.name}:`, (err as Error).message);
          continue;
        }

        if (sessionId && sessionData.scenes) {
          for (const sceneData of sessionData.scenes) {
            if (!sceneData.name || !sceneData.summary) {
              console.warn(`    Skipping scene with missing name or summary in session ${sessionData.name}`);
              continue;
            }

            let worldId: string | undefined;
            if (sceneData.worldName) {
              worldId = worldNameToId.get(sceneData.worldName);
              if (!worldId) {
                console.warn(`    World '${sceneData.worldName}' not found, skipping scene '${sceneData.name}'`);
                continue;
              }
            } else {
              console.warn(`    Scene '${sceneData.name}' missing worldName, skipping`);
              continue;
            }

            try {
              const sceneResponse = await makeRequest(
                options.campaignUrl,
                `/sessions/${sessionId}/scenes`,
                "POST",
                token,
                {
                  name: sceneData.name,
                  summary: sceneData.summary,
                  worldId,
                  entityIds: sceneData.entityIds || []
                }
              );

              if (sceneResponse.status === 201) {
                console.log(`    ✓ Created scene: ${sceneData.name}`);
              } else {
                throw new Error((sceneResponse.body as any).error || "Unknown error");
              }
            } catch (err) {
              console.error(`    Failed to create scene ${sceneData.name}:`, (err as Error).message);
            }
          }
        }
      }
    }

    // Create story arcs
    if (campaignData.storyArcs) {
      for (const arcData of campaignData.storyArcs) {
        if (!arcData.name || !arcData.summary) {
          console.warn(`  Skipping story arc with missing name or summary in campaign ${campaignData.name}`);
          continue;
        }

        let storyArcId: string | undefined;
        try {
          const arcResponse = await makeRequest(
            options.campaignUrl,
            `/campaigns/${campaignId}/story-arcs`,
            "POST",
            token,
            { name: arcData.name, summary: arcData.summary }
          );

          if (arcResponse.status === 201) {
            storyArcId = (arcResponse.body as { storyArc?: { id: string } }).storyArc?.id;
            if (storyArcId) {
              console.log(`  ✓ Created story arc: ${arcData.name}`);
            }
          } else {
            throw new Error((arcResponse.body as any).error || "Unknown error");
          }
        } catch (err) {
          console.error(`  Failed to create story arc ${arcData.name}:`, (err as Error).message);
          continue;
        }

        // Add events to story arc
        if (storyArcId && arcData.eventIds) {
          for (const eventId of arcData.eventIds) {
            try {
              const eventResponse = await makeRequest(
                options.campaignUrl,
                `/story-arcs/${storyArcId}/events`,
                "POST",
                token,
                { eventId }
              );

              if (eventResponse.status === 201) {
                console.log(`    ✓ Added event to story arc: ${eventId}`);
              } else if (eventResponse.status === 400 && (eventResponse.body as any).error?.includes("already exists")) {
                console.log(`    Event '${eventId}' already in story arc, skipping`);
              } else {
                throw new Error((eventResponse.body as any).error || "Unknown error");
              }
            } catch (err) {
              console.warn(`    Failed to add event ${eventId} to story arc:`, (err as Error).message);
            }
          }
        }
      }
    }
  }

  console.log(`\nCampaign seeding complete: ${createdCount} created, ${skippedCount} skipped`);
}

/**
 * Main seeding function
 */
async function seed(options: SeedOptions): Promise<void> {
  const filePath = path.isAbsolute(options.file)
    ? options.file
    : path.join(process.cwd(), options.file);

  if (!fs.existsSync(filePath)) {
    console.error(`✗ Error: File not found at ${filePath}`);
    process.exit(1);
  }

  console.log("Starting seeding process...\n");

  // Read and parse the file to detect its type
  let fileContent: any;
  try {
    const fileContentStr = fs.readFileSync(filePath, "utf-8");
    fileContent = JSON.parse(fileContentStr);
  } catch (err) {
    console.error(`✗ Error: Failed to read or parse JSON file: ${(err as Error).message}`);
    process.exit(1);
  }

  const fileType = detectFileType(fileContent);
  if (fileType === "unknown") {
    console.error(`✗ Error: Could not determine file type. File should contain either worlds or campaigns data.`);
    process.exit(1);
  }

  // Authenticate
  console.log(`Authenticating as ${options.username}...`);
  let token: string;
  try {
    token = await authenticate(options.authUrl, options.username, options.password);
    console.log("✓ Authentication successful\n");
  } catch (err) {
    console.error("✗ Authentication failed:", (err as Error).message);
    process.exit(1);
  }

  // Seed based on detected file type
  if (fileType === "worlds") {
    console.log("Detected worlds file. Seeding worlds...");
    await seedWorlds(filePath, options, token);
  } else if (fileType === "campaigns") {
    console.log("Detected campaigns file. Seeding campaigns...");
    await seedCampaigns(filePath, options, token);
  }

  console.log("\n✓ Seeding complete!");
}

interface SeedAllOptions {
  username: string;
  password: string;
  authUrl: string;
  worldUrl: string;
  campaignUrl: string;
  assetUrl: string;
  folder: string;
}

/**
 * Seed all worlds and campaigns from subfolders
 */
async function seedAll(options: SeedAllOptions): Promise<void> {
  const folderPath = path.isAbsolute(options.folder)
    ? options.folder
    : path.join(process.cwd(), options.folder);

  if (!fs.existsSync(folderPath)) {
    console.error(`✗ Error: Folder not found at ${folderPath}`);
    process.exit(1);
  }

  if (!fs.statSync(folderPath).isDirectory()) {
    console.error(`✗ Error: Path is not a directory: ${folderPath}`);
    process.exit(1);
  }

  console.log(`Starting seedAll process for folder: ${folderPath}\n`);

  // Authenticate once at the start
  console.log(`Authenticating as ${options.username}...`);
  let token: string;
  try {
    token = await authenticate(options.authUrl, options.username, options.password);
    console.log("✓ Authentication successful\n");
  } catch (err) {
    console.error("✗ Authentication failed:", (err as Error).message);
    process.exit(1);
  }

  // Get all subdirectories
  const subdirs = fs.readdirSync(folderPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  if (subdirs.length === 0) {
    console.log("No subdirectories found. Nothing to seed.");
    return;
  }

  console.log(`Found ${subdirs.length} subdirectories: ${subdirs.join(", ")}\n`);

  // Process each subdirectory
  for (const subdir of subdirs) {
    const subdirPath = path.join(folderPath, subdir);
    const worldsFile = path.join(subdirPath, "worlds.json");
    const campaignsFile = path.join(subdirPath, "campaigns.json");

    console.log(`\n=== Processing: ${subdir} ===`);

    // Seed worlds if file exists
    if (fs.existsSync(worldsFile)) {
      console.log(`  Found worlds.json, seeding...`);
      try {
        await seedWorlds(worldsFile, {
          username: options.username,
          password: options.password,
          authUrl: options.authUrl,
          worldUrl: options.worldUrl,
          campaignUrl: options.campaignUrl,
          assetUrl: options.assetUrl,
          file: worldsFile
        }, token);
      } catch (err) {
        console.error(`  ✗ Error seeding worlds from ${worldsFile}:`, (err as Error).message);
      }
    } else {
      console.log(`  No worlds.json found, skipping`);
    }

    // Seed campaigns if file exists
    if (fs.existsSync(campaignsFile)) {
      console.log(`  Found campaigns.json, seeding...`);
      try {
        await seedCampaigns(campaignsFile, {
          username: options.username,
          password: options.password,
          authUrl: options.authUrl,
          worldUrl: options.worldUrl,
          campaignUrl: options.campaignUrl,
          assetUrl: options.assetUrl,
          file: campaignsFile
        }, token);
      } catch (err) {
        console.error(`  ✗ Error seeding campaigns from ${campaignsFile}:`, (err as Error).message);
      }
    } else {
      console.log(`  No campaigns.json found, skipping`);
    }
  }

  console.log("\n✓ SeedAll complete!");
}

// CLI setup
void yargs(hideBin(process.argv))
  .scriptName("snapp-seed")
  .command(
    "seed",
    "Seed worlds or campaigns from a JSON file via HTTP APIs (auto-detects file type)",
    (yargsBuilder) =>
      yargsBuilder
        .option("username", {
          alias: "u",
          type: "string",
          demandOption: true,
          describe: "Username for authentication"
        })
        .option("password", {
          alias: "p",
          type: "string",
          demandOption: true,
          describe: "Password for authentication"
        })
        .option("auth-url", {
          type: "string",
          default: "https://localhost:3001",
          describe: "Auth service URL"
        })
        .option("world-url", {
          type: "string",
          default: "https://localhost:3002",
          describe: "World service URL"
        })
        .option("campaign-url", {
          type: "string",
          default: "https://localhost:3003",
          describe: "Campaign service URL"
        })
        .option("asset-url", {
          type: "string",
          default: "https://localhost:3004",
          describe: "Asset service URL"
        })
        .option("file", {
          alias: "f",
          type: "string",
          demandOption: true,
          describe: "Path to worlds or campaigns JSON file (type is auto-detected)"
        }),
    async (args) => {
      await seed({
        username: args.username as string,
        password: args.password as string,
        authUrl: args["auth-url"] as string,
        worldUrl: args["world-url"] as string,
        campaignUrl: args["campaign-url"] as string,
        assetUrl: args["asset-url"] as string,
        file: args.file as string
      });
    }
  )
  .command(
    "seedAll",
    "Seed all worlds and campaigns from subfolders (looks for worlds.json and campaigns.json in each subfolder)",
    (yargsBuilder) =>
      yargsBuilder
        .option("username", {
          alias: "u",
          type: "string",
          demandOption: true,
          describe: "Username for authentication"
        })
        .option("password", {
          alias: "p",
          type: "string",
          demandOption: true,
          describe: "Password for authentication"
        })
        .option("auth-url", {
          type: "string",
          default: "https://localhost:3001",
          describe: "Auth service URL"
        })
        .option("world-url", {
          type: "string",
          default: "https://localhost:3002",
          describe: "World service URL"
        })
        .option("campaign-url", {
          type: "string",
          default: "https://localhost:3003",
          describe: "Campaign service URL"
        })
        .option("asset-url", {
          type: "string",
          default: "https://localhost:3004",
          describe: "Asset service URL"
        })
        .option("folder", {
          alias: "f",
          type: "string",
          demandOption: true,
          describe: "Path to folder containing subfolders with worlds.json and/or campaigns.json files"
        }),
    async (args) => {
      await seedAll({
        username: args.username as string,
        password: args.password as string,
        authUrl: args["auth-url"] as string,
        worldUrl: args["world-url"] as string,
        campaignUrl: args["campaign-url"] as string,
        assetUrl: args["asset-url"] as string,
        folder: args.folder as string
      });
    }
  )
  .demandCommand(1)
  .help().argv;
