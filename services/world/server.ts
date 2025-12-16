import "dotenv/config";
import https from "https";
import fs from "fs";
import path from "path";
import { createWorldApp } from "./app";
import { InMemoryWorldStore } from "./worldStore";
import { InMemoryWorldEntityStore, type WorldEntityType } from "./worldEntitiesStore";

// Use a non-conflicting default port for the world service.
const port = Number(process.env.WORLD_PORT ?? process.env.PORT ?? 4501);

const store = new InMemoryWorldStore();
const entityStore = new InMemoryWorldEntityStore();

// Seed worlds and entities from JSON file on startup
const seedWorlds = () => {
  const worldsFilePath =
    process.env.WORLD_WORLDS_FILE ??
    path.join(
      process.cwd(),
      "..",
      "Snapp-other",
      "bootstrap",
      "worlds.json"
    );

  try {
    // Check if the file exists
    if (!fs.existsSync(worldsFilePath)) {
      // eslint-disable-next-line no-console
      console.warn(`Worlds file not found at ${worldsFilePath}, skipping world seeding`);
      return;
    }

    // Read and parse the worlds file
    const worldsFileContent = fs.readFileSync(worldsFilePath, "utf-8");
    const worlds = JSON.parse(worldsFileContent) as Array<{
      name: string;
      description: string;
      entities?: Array<{
        type: WorldEntityType;
        name: string;
        summary: string;
        beginningTimestamp?: number;
        endingTimestamp?: number;
      }>;
    }>;

    // Create worlds and their entities
    for (const world of worlds) {
      if (!world.name || !world.description) {
        // eslint-disable-next-line no-console
        console.warn(`Skipping world with missing name or description: ${JSON.stringify(world)}`);
        continue;
      }

      try {
        const createdWorld = store.createWorld(world.name, world.description);
        // eslint-disable-next-line no-console
        console.log(`Seeded world: ${world.name}`);

        // Create entities for this world
        if (world.entities) {
          for (const entity of world.entities) {
            if (!entity.name || !entity.summary || !entity.type) {
              // eslint-disable-next-line no-console
              console.warn(`Skipping entity with missing fields in world ${world.name}: ${JSON.stringify(entity)}`);
              continue;
            }

            try {
              entityStore.createEntity(
                createdWorld.id,
                entity.type,
                entity.name,
                entity.summary,
                entity.beginningTimestamp,
                entity.endingTimestamp
              );
              // eslint-disable-next-line no-console
              console.log(`  Seeded ${entity.type}: ${entity.name}`);
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error(`Failed to seed ${entity.type} ${entity.name}:`, (err as Error).message);
            }
          }
        }
      } catch (err) {
        // If world already exists, that's okay - just log it
        if ((err as Error).message.includes("already exists")) {
          // eslint-disable-next-line no-console
          console.log(`World '${world.name}' already exists, skipping`);
        } else {
          // eslint-disable-next-line no-console
          console.error(`Failed to seed world ${world.name}:`, (err as Error).message);
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log(`Successfully seeded ${worlds.length} world(s) from ${worldsFilePath}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Failed to load worlds from ${worldsFilePath}:`, (err as Error).message);
    // Don't throw - allow server to start even if seeding fails
  }
};

// Seed worlds before creating the app
seedWorlds();

const app = createWorldApp({ store, entityStore });

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
  console.log(`World service listening on https://localhost:${port}`);
});


