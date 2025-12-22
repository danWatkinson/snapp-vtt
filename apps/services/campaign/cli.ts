#!/usr/bin/env ts-node

import { createServiceCli } from "../../../packages/cli-utils";

void createServiceCli({
  scriptName: "snapp-campaign",
  startCommand: async () => {
    await import("./server");
  }
});
