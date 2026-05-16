import type { ToolCallMessagePartComponent } from "../MessagePartComponentTypes";
import type { Unsubscribe } from "../../..";

export type McpAppResourceOutput = {
  readonly render: ToolCallMessagePartComponent;
};

export type ToolsState = {
  tools: Record<string, ToolCallMessagePartComponent[]>;
  mcpApp?: McpAppResourceOutput | undefined;
};

export type ToolsMethods = {
  getState(): ToolsState;
  setToolUI(
    toolName: string,
    render: ToolCallMessagePartComponent,
  ): Unsubscribe;
};

export type ToolsClientSchema = {
  methods: ToolsMethods;
};
