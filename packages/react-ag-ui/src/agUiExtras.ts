import { createRuntimeExtras } from "@assistant-ui/core/internal";
import type { AgUiRuntimeExtras } from "./runtime/types";

export const agUiExtras =
  createRuntimeExtras<AgUiRuntimeExtras>("useAgUiRuntime");
