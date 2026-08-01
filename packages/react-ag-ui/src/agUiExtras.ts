import { createRuntimeExtras } from "@assistant-ui/core/react";
import type { AgUiRuntimeExtras } from "./runtime/types";

export const agUiExtras =
  createRuntimeExtras<AgUiRuntimeExtras>("useAgUiRuntime");
