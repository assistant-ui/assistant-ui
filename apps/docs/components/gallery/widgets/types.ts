import type { ToolCallMessagePartProps } from "@assistant-ui/react";

/**
 * The slice of a tool-call render component's props the gallery widgets read.
 * Authoring to this keeps each widget a drop-in `render` for a real generative
 * tool, while the gallery feeds mock values.
 */
export type ToolRenderProps<TArgs, TResult = unknown> = {
  args: TArgs;
} & Partial<
  Pick<
    ToolCallMessagePartProps<TArgs, TResult>,
    "result" | "status" | "addResult"
  >
>;
