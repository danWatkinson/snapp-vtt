#!/usr/bin/env ts-node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

void yargs(hideBin(process.argv))
  .scriptName("snapp-campaign")
  .command(
    "start",
    "Start the campaign HTTPS service",
    () => {},
    async () => {
      await import("./server");
    }
  )
  .demandCommand(1)
  .help().argv;
