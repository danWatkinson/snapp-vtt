#!/usr/bin/env ts-node

import { createServiceCli } from "../../../packages/cli-utils";
import { InMemoryUserStore } from "./userStore";
import { seedUsers } from "./userSeeder";

void createServiceCli({
  scriptName: "snapp-auth",
  startCommand: async () => {
    // Lazily import to ensure this only runs when the command is invoked
    await import("./server");
  },
  seedCommands: [
    {
      name: "seed-users",
      description:
        "Seed users into an in-memory store from the configured JSON file",
      fileOptionDescription:
        "Optional explicit path to users JSON file; otherwise AUTH_USERS_FILE/default is used",
      handler: async (args) => {
        const store = new InMemoryUserStore();
        await seedUsers(store, {
          usersFilePath: args.file
        });
      }
    }
  ]
});
