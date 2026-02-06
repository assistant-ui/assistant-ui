import type { ToolCallMessagePartComponent } from "../MessagePartComponentTypes";
import type { Unsubscribe } from "../Unsubscribe";

export type ToolsState = {
  tools: Record<string, ToolCallMessagePartComponent[]>;
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
