import { createRuntimeExtras } from "@assistant-ui/core/react";
import type { UseEveAgentReturn } from "eve/react";

export type EveRuntimeExtras = Pick<
  UseEveAgentReturn,
  "error" | "events" | "session"
> & { readonly reset: UseEveAgentReturn["newSession"] };

export const eveExtras =
  createRuntimeExtras<EveRuntimeExtras>("useEveAgentRuntime");
