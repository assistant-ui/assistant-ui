import type { ToolsClientSchema } from "./scopes/tools";
import type { DataRenderersClientSchema } from "./scopes/dataRenderers";
import type { InteractablesClientSchema as LegacyInteractablesClientSchema } from "../interactables-legacy/scopes";
import type { Unstable_InteractablesClientSchema } from "./scopes/interactables";

declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    tools: ToolsClientSchema;
    dataRenderers: DataRenderersClientSchema;
    interactables: LegacyInteractablesClientSchema;
    unstable_interactables: Unstable_InteractablesClientSchema;
  }
}
