#!/usr/bin/env node

import { constants } from "node:os";
import { SpawnSignalError } from "./lib/run-spawn";
import { runCli } from "./run";

void runCli().catch((error: unknown) => {
  if (error instanceof SpawnSignalError) {
    process.exitCode = 128 + (constants.signals[error.signal] ?? 0);
    if (error.forwarded) {
      process.kill(process.pid, error.signal);
    }
    return;
  }

  console.error(error);
  process.exitCode = 1;
});
