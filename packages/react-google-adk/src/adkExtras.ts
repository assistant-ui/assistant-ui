import { createRuntimeExtras } from "@assistant-ui/core/internal";
import type { AdkRuntimeExtras } from "./types";

export const adkExtras = createRuntimeExtras<AdkRuntimeExtras>("useAdkRuntime");
