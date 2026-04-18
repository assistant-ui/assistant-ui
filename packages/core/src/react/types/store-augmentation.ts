import type { ToolsClientSchema } from "./scopes/tools";
import type { DataRenderersClientSchema } from "./scopes/dataRenderers";
import type { InteractablesClientSchema } from "./scopes/interactables";

declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    tools: ToolsClientSchema;
    dataRenderers: DataRenderersClientSchema;
    interactables: InteractablesClientSchema;
  }
}
