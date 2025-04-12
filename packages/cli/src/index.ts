#!/usr/bin/env node

import { Command } from "commander";
import { create } from "./commands/create";
import { add } from "./commands/add";
import { codemodCommand, upgradeCommand } from "./commands/upgrade";
import { init } from "./commands/init";

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

function main() {
  const program = new Command()
    .name("assistant-ui")
    .description("add components and dependencies to your project");

  program.addCommand(add);
  program.addCommand(create);
  program.addCommand(init);
  program.addCommand(codemodCommand);
  program.addCommand(upgradeCommand);

  program.parse();
}

main();
