#!/usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import path from "path";

// Read package.json using fs instead of import assertions
const packageJsonPath = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

import { create } from "./commands/create";
import { add } from "./commands/add";
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

  program.addCommand(add);
  program.addCommand(create);
  program.addCommand(init);
  program.addCommand(codemodCommand);
  program.addCommand(upgradeCommand);

  program.parse();
}

main();
