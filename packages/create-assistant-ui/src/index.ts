#!/usr/bin/env node
import { create } from "../../cli/src/commands/create";

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

function main() {
  create.parse();
}

main();
