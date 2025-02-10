#!/usr/bin/env node

import { Command } from "commander";

import packageJson from "../package.json" with { type: "json" };
import { create } from "./commands/create";
import { shadcnAdd } from "./commands/shadcn/add";
import { codemodCommand, upgradeCommand } from "./commands/upgrade";
import { init } from "./commands/init";

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

function main() {
  const program = new Command()
    .name("assistant-ui")
    .description("add components and dependencies to your project")
    .version(
      packageJson.version || "1.0.0",
      "-v, --version",
      "display the version number",
    );

  program.addCommand(shadcnAdd);
  program.addCommand(create);
  program.addCommand(init);
  program.addCommand(codemodCommand);
  program.addCommand(upgradeCommand);

  program.parse();
}

main();
