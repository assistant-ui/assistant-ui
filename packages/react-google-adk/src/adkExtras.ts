import { createRuntimeExtras } from "@assistant-ui/core/react";
import type { AdkRuntimeExtras } from "./types";

export const adkExtras = createRuntimeExtras<AdkRuntimeExtras>("useAdkRuntime");
