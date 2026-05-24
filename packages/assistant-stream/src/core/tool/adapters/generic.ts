import { injectDiscoveryWrappers } from "../wrappers";
import type {
  ToolWireFormatAdapter,
  ToolWireFormatInput,
  ToolWireFormatOutput,
} from "../wire-format";

export type GenericFallbackOptions = {
  adapterId: string;
};

/**
 * Fallback adapter for providers without native deferred loading. Injects two
 * stable wrapper tools (`aui_discover_tools`, `aui_run_dynamic_tool`) and
 * keeps deferred tools off the wire entirely, preserving prompt-cache
 * stability regardless of how many deferred tools exist.
 *
 * Consumers must implement `aui_discover_tools` and `aui_run_dynamic_tool`
 * on the server side, dispatching to the relevant deferred tool by name.
 */
export function genericFallbackAdapter(
  options: GenericFallbackOptions,
): ToolWireFormatAdapter {
  return {
    id: `generic-fallback:${options.adapterId}`,
    format(input: ToolWireFormatInput): ToolWireFormatOutput {
      return {
        tools: injectDiscoveryWrappers({
          tools: input.tools,
          deferredTools: input.deferredTools,
        }),
      };
    },
  };
}
