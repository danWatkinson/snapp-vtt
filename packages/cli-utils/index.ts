import yargs from "yargs";
import { hideBin } from "yargs/helpers";

export interface SeedCommand {
  name: string;
  description: string;
  handler: (args: { file?: string }) => Promise<void> | void;
  fileOptionDescription?: string;
}

export interface ServiceCliOptions {
  scriptName: string;
  startCommand: () => Promise<void>;
  seedCommands?: SeedCommand[];
}

/**
 * Creates a standardized CLI for services.
 * 
 * Sets up:
 * - "start" command that imports/runs the server
 * - Optional seed commands with file option
 * - Help text
 * 
 * @param options - CLI configuration
 */
export function createServiceCli(options: ServiceCliOptions): void {
  const { scriptName, startCommand, seedCommands = [] } = options;

  const cli = yargs(hideBin(process.argv)).scriptName(scriptName);

  // Start command
  cli.command(
    "start",
    `Start the ${scriptName} HTTPS service${seedCommands.length > 0 ? " (with seeding)" : ""}`,
    () => {},
    async () => {
      await startCommand();
    }
  );

  // Seed commands
  for (const seedCmd of seedCommands) {
    cli.command(
      seedCmd.name,
      seedCmd.description,
      (yargsBuilder) =>
        yargsBuilder.option("file", {
          alias: "f",
          type: "string",
          describe:
            seedCmd.fileOptionDescription ??
            `Optional explicit path to seed JSON file; otherwise default is used`
        }),
      async (args) => {
        await seedCmd.handler({ file: args.file as string | undefined });
      }
    );
  }

  cli.demandCommand(1).help().argv;
}
