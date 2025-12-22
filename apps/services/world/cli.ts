#!/usr/bin/env ts-node

import { createServiceCli } from "../../../packages/cli-utils";
import { InMemoryWorldStore } from "./worldStore";
import { InMemoryWorldEntityStore } from "./worldEntitiesStore";
import { seedWorlds } from "./worldSeeder";

void createServiceCli({
  scriptName: "snapp-world",
  startCommand: async () => {
    await import("./server");
  },
  seedCommands: [
    {
      name: "seed-worlds",
      description: "Seed worlds and entities from the configured JSON file",
      fileOptionDescription:
        "Optional explicit path to worlds JSON file; otherwise WORLD_WORLDS_FILE/default is used",
      handler: (args) => {
        const store = new InMemoryWorldStore();
        const entityStore = new InMemoryWorldEntityStore();
        seedWorlds(store, {
          worldsFilePath: args.file
        });
      }
    }
  ]
});
