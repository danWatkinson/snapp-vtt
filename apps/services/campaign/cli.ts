#!/usr/bin/env ts-node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { InMemoryCampaignStore } from "./campaignStore";
import { seedCampaigns } from "./campaignSeeder";

void yargs(hideBin(process.argv))
  .scriptName("snapp-campaign")
  .command(
    "start",
    "Start the campaign HTTPS service (with seeding)",
    () => {},
    async () => {
      await import("./server");
    }
  )
  .command(
    "seed-campaigns",
    "Seed campaigns, sessions, scenes, story arcs, and events from the configured JSON file",
    (yargsBuilder) =>
      yargsBuilder.option("file", {
        alias: "f",
        type: "string",
        describe:
          "Optional explicit path to campaigns JSON file; otherwise CAMPAIGN_CAMPAIGNS_FILE/default is used"
      }),
    async (args) => {
      const store = new InMemoryCampaignStore();
      await seedCampaigns(store, {
        campaignsFilePath: args.file as string | undefined
      });
    }
  )
  .demandCommand(1)
  .help().argv;
