import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import type { ComponentType } from "react";
import type { AnyTool, GuidanceModule, ToolDefinition } from "../tools/define";

export type ToolkitExecution = "frontend" | "backend";
export type ToolkitDisplay = "standalone" | "inline";

/**
 * Tools added to `createWidgetToolkit` from outside the frame half, such as
 * `createSpecToolkit(catalog)` from `generative-frame/spec/assistant-ui`.
 */
export type WidgetToolkitExtension = {
  tools: Record<string, AnyTool>;
  /** Extra `read_me` modules. */
  modules?: readonly GuidanceModule[];
  /** Toolkit entries for the tools, built with the toolkit's execution and display. */
  entries(context: {
    execution: ToolkitExecution;
    display: ToolkitDisplay;
  }): Record<string, unknown>;
};

type ToolRender = ComponentType<ToolCallMessagePartProps<never>>;
type ToolExecute<I> = (
  input: I,
  call: { toolCallId: string; abortSignal?: AbortSignal },
) => Promise<unknown>;

export type ToolkitEntry<I = never> =
  | { type: "backend"; display: ToolkitDisplay; render: ToolRender }
  | {
      type: "frontend";
      display: ToolkitDisplay;
      description: string;
      parameters: never;
      execute: ToolExecute<I>;
      render: ToolRender;
    };

/** One toolkit entry: frontend tools also execute, backend tools only render. */
export function toolkitEntry<I, O>(
  tool: ToolDefinition<I, O>,
  render: ToolRender,
  context: { execution: ToolkitExecution; display: ToolkitDisplay },
  execute: ToolExecute<I> = (input) => tool.execute(input),
): ToolkitEntry<I> {
  return context.execution === "backend"
    ? { type: "backend", display: context.display, render }
    : {
        type: "frontend",
        display: context.display,
        description: tool.description,
        parameters: tool.inputSchema as never,
        execute,
        render,
      };
}
