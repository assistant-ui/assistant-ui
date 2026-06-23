import { createRuntimeExtras } from "@assistant-ui/core/internal";
import type { LangChainRuntimeExtras } from "./types";

export const langChainExtras =
  createRuntimeExtras<LangChainRuntimeExtras>("useStreamRuntime");
