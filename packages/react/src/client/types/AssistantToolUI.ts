import { Unsubscribe } from "@assistant-ui/tap";
import { ToolCallMessagePartComponent } from "../../types";

export type AssistantToolUIState = Record<
  string,
  ToolCallMessagePartComponent[]
>;

export type AssistantToolUIActions = {
  setToolUI(
    toolName: string,
    render: ToolCallMessagePartComponent,
  ): Unsubscribe;
};
