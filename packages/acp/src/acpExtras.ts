import { createRuntimeExtras } from "@assistant-ui/core/react";
import type { AcpExtras } from "./types";

export const acpExtras = createRuntimeExtras<AcpExtras>("useAcpRuntime");
