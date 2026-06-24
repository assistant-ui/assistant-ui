import { createRuntimeExtras } from "@assistant-ui/core/internal";
import type { MastraRuntimeExtras } from "./types";

export const mastraExtras =
  createRuntimeExtras<MastraRuntimeExtras>("useMastraRuntime");
