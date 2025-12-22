#!/usr/bin/env ts-node

/**
 * Wrapper script to run TypeScript files with ts-node using CommonJS module system.
 * This simplifies package.json scripts by removing the repetitive compiler-options flag.
 * 
 * Usage: ts-node scripts/run-ts.ts <path-to-ts-file>
 */

import { spawn } from "child_process";
import { resolve } from "path";

const scriptPath = process.argv[2];

if (!scriptPath) {
  console.error("Usage: ts-node scripts/run-ts.ts <path-to-ts-file>");
  process.exit(1);
}

const resolvedPath = resolve(process.cwd(), scriptPath);

const child = spawn(
  "ts-node",
  ["--compiler-options", '{"module":"commonjs"}', resolvedPath],
  {
    stdio: "inherit",
    shell: true
  }
);

child.on("error", (error) => {
  console.error(`Failed to start ts-node: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
