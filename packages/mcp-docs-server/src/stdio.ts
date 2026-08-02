#!/usr/bin/env node
import { runServer } from "./index.js";
import { flushTelemetry, isTelemetryEnabled } from "./telemetry.js";

function flushOnExit() {
  if (isTelemetryEnabled()) {
    void flushTelemetry().finally(() => process.exit(0));
  } else {
    process.exit(0);
  }
}

process.on("SIGINT", flushOnExit);
process.on("SIGTERM", flushOnExit);

void runServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
