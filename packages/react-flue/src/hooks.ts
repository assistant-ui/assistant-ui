"use client";

import { flueExtras } from "./flueExtras";
import type { FlueRuntimeExtras } from "./flueExtras";

/** Read the complete Flue conversation state exposed by the runtime. */
export const useFlueRuntimeExtras = (): FlueRuntimeExtras => flueExtras.use();
