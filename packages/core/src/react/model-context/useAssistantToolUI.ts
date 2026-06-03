import { useEffect } from "react";
import { useAui } from "@assistant-ui/store";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";

/**
 * Props used to register a renderer for tool-call message parts.
 *
 * @deprecated Put `render`/`renderText` on the matching toolkit entry, or use
 * `MessagePrimitive.Parts` inline tool render overrides for per-message UI.
 * See https://assistant-ui.com/docs/migrations/toolkit-tools.
 */
export type AssistantToolUIProps<TArgs, TResult> = {
  /** Name of the tool whose calls should use this renderer. */
  toolName: string;
  /** Component rendered for matching tool-call message parts. */
  render: ToolCallMessagePartComponent<TArgs, TResult>;
  /**
   * How the UI is presented relative to the chain-of-thought trace. Set
   * `"standalone"` to surface it on its own (e.g. human-in-the-loop or
   * generative UI for a backend/MCP tool). Defaults to `"inline"`.
   */
  display?: "standalone" | "inline";
};

/**
 * Registers a tool-call renderer while the component is mounted.
 *
 * This only affects rendering. Pair it with {@link Tools} or a backend tool
 * registry to expose the actual tool definition to the model.
 *
 * @param tool - Tool renderer registration, or `null` to skip registration.
 *
 * @deprecated Put `render`/`renderText` on the matching toolkit entry, or use
 * `MessagePrimitive.Parts` inline tool render overrides for per-message UI.
 * See https://assistant-ui.com/docs/migrations/toolkit-tools.
 */
export const useAssistantToolUI = (
  tool: AssistantToolUIProps<any, any> | null,
) => {
  const aui = useAui();
  const standalone = tool?.display === "standalone";
  useEffect(() => {
    if (!tool?.toolName || !tool?.render) return undefined;
    return aui.tools().setToolUI(tool.toolName, tool.render, { standalone });
  }, [aui, tool?.toolName, tool?.render, standalone]);
};
