import { createRuntimeExtras } from "@assistant-ui/core/react";
import type { A2AExtras } from "./types";

export const a2aExtras = createRuntimeExtras<A2AExtras>("useA2ARuntime");
