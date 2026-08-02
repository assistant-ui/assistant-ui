#!/usr/bin/env node
import { runServer } from "./index.js";
import { flushTelemetry, isTelemetryEnabled } from "./telemetry.js";

const FLUSH_TIMEOUT_MS = 3000;

function flushOnExit() {
  if (!isTelemetryEnabled()) {
    process.exit(0);
  }
  const timeout = setTimeout(() => process.exit(0), FLUSH_TIMEOUT_MS);
  void flushTelemetry().finally(() => {
    clearTimeout(timeout);
    process.exit(0);
  });
}

process.on("SIGINT", flushOnExit);
process.on("SIGTERM", flushOnExit);
process.stdin.on("end", flushOnExit);

void runServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
