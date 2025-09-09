import { Unsubscribe } from "@assistant-ui/tap";
import { ToolCallMessagePartComponent } from "../../types";

export type ToolUIState = Record<string, ToolCallMessagePartComponent[]>;

export type ToolUIActions = {
  setToolUI(
    toolName: string,
    render: ToolCallMessagePartComponent,
  ): Unsubscribe;
};
export type ToolUIMeta = {
  source: "root";
  query: Record<string, never>;
};
