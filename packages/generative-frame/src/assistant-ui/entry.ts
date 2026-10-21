import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import type { ComponentType } from "react";
import type { ToolDefinition } from "../tools/define";
import type { ToolkitDisplay, ToolkitExecution } from "./extension";

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
