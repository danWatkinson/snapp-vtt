#!/usr/bin/env ts-node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { InMemoryWorldStore } from "./worldStore";
import { InMemoryWorldEntityStore } from "./worldEntitiesStore";
import { seedWorlds } from "./worldSeeder";

void yargs(hideBin(process.argv))
  .scriptName("snapp-world")
  .command(
    "start",
    "Start the world HTTPS service (with seeding)",
    () => {},
    async () => {
      await import("./server");
    }
  )
  .command(
    "seed-worlds",
    "Seed worlds and entities from the configured JSON file",
    (yargsBuilder) =>
      yargsBuilder.option("file", {
        alias: "f",
        type: "string",
        describe:
          "Optional explicit path to worlds JSON file; otherwise WORLD_WORLDS_FILE/default is used"
      }),
    async (args) => {
      const store = new InMemoryWorldStore();
      const entityStore = new InMemoryWorldEntityStore();
      seedWorlds(store, {
        worldsFilePath: args.file as string | undefined
      });
    }
  )
  .demandCommand(1)
  .help().argv;
