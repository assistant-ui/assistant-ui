import type { Unsubscribe } from "@assistant-ui/core";
import type { ToolCallMessagePartComponent } from "../../types";

export type ToolsState = {
  tools: Record<string, ToolCallMessagePartComponent[]>;
};

export type ToolsApi = {
  getState(): ToolsState;

  setToolUI(
    toolName: string,
    render: ToolCallMessagePartComponent,
  ): Unsubscribe;
};

export type ToolsMeta = {
  source: "root";
  query: Record<string, never>;
};
