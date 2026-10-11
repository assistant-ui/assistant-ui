import type { AnyTool, GuidanceModule } from "../tools/define";

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
