import { createRuntimeExtras } from "@assistant-ui/core/internal";
import type { PiRuntimeExtrasInternal } from "./runtimeTypes";

export const piExtras =
  createRuntimeExtras<PiRuntimeExtrasInternal>("usePiRuntime");
