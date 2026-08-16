import { createRuntimeExtras } from "@assistant-ui/core/react";
import type { OpenCodeRuntimeExtras } from "./types";

export const openCodeExtras =
  createRuntimeExtras<OpenCodeRuntimeExtras>("useOpenCodeRuntime");
