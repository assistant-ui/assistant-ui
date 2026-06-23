import { createRuntimeExtras } from "@assistant-ui/core/internal";
import type { OpenCodeRuntimeExtras } from "./types";

export const openCodeExtras =
  createRuntimeExtras<OpenCodeRuntimeExtras>("useOpenCodeRuntime");
