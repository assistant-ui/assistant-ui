import { createRuntimeExtras } from "@assistant-ui/core/react";
import type { FlueRuntimeExtras } from "./types";

export const flueExtras =
  createRuntimeExtras<FlueRuntimeExtras>("useFlueRuntime");
