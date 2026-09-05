import type { ToolsClientSchema } from "./scopes/tools";
import type { DataRenderersClientSchema } from "./scopes/dataRenderers";
import type { InteractablesClientSchema as LegacyInteractablesClientSchema } from "../interactables-legacy/scopes";
import type { Unstable_InteractablesClientSchema } from "./scopes/interactables";

declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    tools: ToolsClientSchema;
    dataRenderers: DataRenderersClientSchema;
    interactables: LegacyInteractablesClientSchema;
    /**
     * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
     */
    unstable_interactables: Unstable_InteractablesClientSchema;
  }
}
