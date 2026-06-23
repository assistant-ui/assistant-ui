import { createRuntimeExtras } from "@assistant-ui/core/internal";
import type { LangGraphRuntimeExtras } from "./types";

export const langGraphExtras = createRuntimeExtras<LangGraphRuntimeExtras>(
  "useLangGraphRuntime",
);
