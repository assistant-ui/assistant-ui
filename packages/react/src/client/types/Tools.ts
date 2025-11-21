import { ToolCallMessagePartComponent, Unsubscribe } from "../../types";

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
