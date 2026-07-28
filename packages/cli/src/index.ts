#!/usr/bin/env node

import { runCli } from "./run";

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

void runCli().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
