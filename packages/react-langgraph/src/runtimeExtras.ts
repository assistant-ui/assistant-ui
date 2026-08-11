import { createRuntimeExtras } from "@assistant-ui/core/react";
import type { LangGraphRuntimeExtras } from "./types";

export const langGraphExtras = createRuntimeExtras<LangGraphRuntimeExtras>(
  "useLangGraphRuntime",
);
