import { createRuntimeExtras } from "@assistant-ui/core/react";
import type { UseFlueAgentResult } from "@flue/react";

export type FlueRuntimeExtras = Pick<
  UseFlueAgentResult,
  | "error"
  | "failedSends"
  | "historyReady"
  | "messages"
  | "refresh"
  | "settlements"
  | "status"
>;

export const flueExtras =
  createRuntimeExtras<FlueRuntimeExtras>("useFlueRuntime");
