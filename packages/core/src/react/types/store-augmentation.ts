import type { ToolsClientSchema } from "./scopes/tools";
import type { DataRenderersClientSchema } from "./scopes/dataRenderers";
import type { InteractablesClientSchema } from "./scopes/interactables";
import type { ToolCatalogsClientSchema } from "./scopes/toolCatalog";

declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    tools: ToolsClientSchema;
    dataRenderers: DataRenderersClientSchema;
    interactables: InteractablesClientSchema;
    toolCatalogs: ToolCatalogsClientSchema;
  }
}
