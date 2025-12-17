#!/usr/bin/env ts-node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { InMemoryUserStore } from "./userStore";
import { seedUsers } from "./userSeeder";

void yargs(hideBin(process.argv))
  .scriptName("snapp-auth")
  .command(
    "start",
    "Start the auth HTTPS service (with seeding)",
    () => {},
    async () => {
      // Lazily import to ensure this only runs when the command is invoked
      await import("./server");
    }
  )
  .command(
    "seed-users",
    "Seed users into an in-memory store from the configured JSON file",
    (yargsBuilder) =>
      yargsBuilder.option("file", {
        alias: "f",
        type: "string",
        describe:
          "Optional explicit path to users JSON file; otherwise AUTH_USERS_FILE/default is used"
      }),
    async (args) => {
      const store = new InMemoryUserStore();
      await seedUsers(store, {
        usersFilePath: args.file as string | undefined
      });
    }
  )
  .demandCommand(1)
  .help().argv;
