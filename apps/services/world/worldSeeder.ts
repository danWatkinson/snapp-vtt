import fs from "fs";
import path from "path";
import { InMemoryWorldStore } from "./worldStore";
import {
  InMemoryWorldEntityStore,
  type WorldEntityType
} from "./worldEntitiesStore";

export interface WorldSeedOptions {
  /** Optional explicit path to the worlds JSON file. */
  worldsFilePath?: string;
  /** Optional async function to look up asset ID by filename. Used for splash images. */
  lookupAssetByFileName?: (fileName: string) => Promise<string | undefined>;
}

/**
 * Seed worlds and their entities into the provided stores from a JSON file.
 */
export const seedWorlds = async (
  store: InMemoryWorldStore,
  entityStore: InMemoryWorldEntityStore,
  options: WorldSeedOptions = {}
): Promise<void> => {
  const worldsFilePath = options.worldsFilePath
    ? path.isAbsolute(options.worldsFilePath)
      ? options.worldsFilePath
      : path.join(process.cwd(), options.worldsFilePath)
    : process.env.WORLD_WORLDS_FILE
    ? path.isAbsolute(process.env.WORLD_WORLDS_FILE)
      ? process.env.WORLD_WORLDS_FILE
      : path.join(process.cwd(), process.env.WORLD_WORLDS_FILE)
    : path.join(
        process.cwd(),
        "..",
        "Snapp-other",
        "bootstrap",
        "worlds.json"
      );

  try {
    if (!fs.existsSync(worldsFilePath)) {
      // eslint-disable-next-line no-console
      console.warn(
        `Worlds file not found at ${worldsFilePath}, skipping world seeding`
      );
      return;
    }

    const worldsFileContent = fs.readFileSync(worldsFilePath, "utf-8");
    const worlds = JSON.parse(worldsFileContent) as Array<{
      name: string;
      description: string;
      splashImageFileName?: string;
      entities?: Array<{
        type: WorldEntityType;
        name: string;
        summary: string;
        beginningTimestamp?: number;
        endingTimestamp?: number;
      }>;
    }>;

    for (const world of worlds) {
      if (!world.name || !world.description) {
        // eslint-disable-next-line no-console
        console.warn(
          `Skipping world with missing name or description: ${JSON.stringify(
            world
          )}`
        );
        continue;
      }

      try {
        const createdWorld = store.createWorld(world.name, world.description);
        
        // If splash image filename is provided, look it up and set it
        if (world.splashImageFileName && options.lookupAssetByFileName) {
          const assetId = await options.lookupAssetByFileName(world.splashImageFileName);
          if (assetId) {
            store.updateWorld(createdWorld.id, { splashImageAssetId: assetId });
            // eslint-disable-next-line no-console
            console.log(`Seeded world: ${world.name} (with splash: ${world.splashImageFileName})`);
          } else {
            // eslint-disable-next-line no-console
            console.warn(
              `Splash image '${world.splashImageFileName}' not found for world ${world.name}, skipping`
            );
            // eslint-disable-next-line no-console
            console.log(`Seeded world: ${world.name}`);
          }
        } else {
          // eslint-disable-next-line no-console
          console.log(`Seeded world: ${world.name}`);
        }

        if (world.entities) {
          for (const entity of world.entities) {
            if (!entity.name || !entity.summary || !entity.type) {
              // eslint-disable-next-line no-console
              console.warn(
                `Skipping entity with missing fields in world ${world.name}: ${JSON.stringify(
                  entity
                )}`
              );
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
              console.error(
                `Failed to seed ${entity.type} ${entity.name}:`,
                (err as Error).message
              );
            }
          }
        }
      } catch (err) {
        if ((err as Error).message.includes("already exists")) {
          // eslint-disable-next-line no-console
          console.log(`World '${world.name}' already exists, skipping`);
        } else {
          // eslint-disable-next-line no-console
          console.error(
            `Failed to seed world ${world.name}:`,
            (err as Error).message
          );
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log(`Successfully seeded ${worlds.length} world(s) from ${worldsFilePath}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `Failed to load worlds from ${worldsFilePath}:`,
      (err as Error).message
    );
  }
};
