#!/usr/bin/env node

import { buildProgram } from "./program";

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

function main() {
  buildProgram().parse();
}

main();
