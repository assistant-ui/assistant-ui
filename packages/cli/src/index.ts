#!/usr/bin/env node

import { add } from "@/src/commands/add";
import { Command } from "commander";

import { getPackageInfo } from "./utils/get-package-info";
import { create } from "./commands/create";

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

async function main() {
  const packageInfo = getPackageInfo();

  const program = new Command()
    .name("assistant-ui")
    .description("add components and dependencies to your project")
    .version(
      packageInfo.version || "1.0.0",
      "-v, --version",
      "display the version number",
    );

  program.addCommand(add);
  program.addCommand(create);

  program.parse();
}

main();
