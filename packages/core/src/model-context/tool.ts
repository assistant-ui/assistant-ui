import type { Tool } from "assistant-stream";

// TODO re-add the inferrence of the parameters

/**
 * Defines a model tool with its argument schema, execution behavior, and
 * optional model-output conversion.
 *
 * This helper preserves the inferred argument and result types from the tool
 * object, making it convenient to export reusable tool definitions for a
 * {@link Toolkit}, {@link Tools}, or {@link useAssistantTool}.
 *
 * @param tool - Tool definition to expose to the assistant model.
 */
export function tool<TArgs extends Record<string, unknown>, TResult = any>(
  tool: Tool<TArgs, TResult>,
): Tool<TArgs, TResult> {
  return tool;
}
