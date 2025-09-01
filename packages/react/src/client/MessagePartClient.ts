import { resource } from "@assistant-ui/tap";
import { tapActions } from "../utils/tap-store";
import { MessagePartRuntime } from "../api/MessagePartRuntime";
import { tapSubscribable } from "./util-hooks/tapSubscribable";
import { tapRefValue } from "./util-hooks/tapRefValue";
import {
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
  MessagePartStatus,
  ToolCallMessagePartStatus,
} from "../types/AssistantTypes";
import { ToolResponse } from "assistant-stream";

export type MessagePartClientState = (
  | ThreadUserMessagePart
  | ThreadAssistantMessagePart
) & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

export type MessagePartClientActions = {
  /**
   * Add tool result to a tool call message part that has no tool result yet.
   * This is useful when you are collecting a tool result via user input ("human tool calls").
   */
  addToolResult(result: any | ToolResponse<any>): void;

  __internal_getRuntime(): MessagePartRuntime;
};

export const MessagePartClient = resource(
  ({ runtime }: { runtime: MessagePartRuntime }) => {
    const state = tapSubscribable(runtime);
    const runtimeRef = tapRefValue(runtime);

    const actions = tapActions<MessagePartClientActions>({
      addToolResult: (result) => runtimeRef.current.addToolResult(result),

      __internal_getRuntime: () => runtime,
    });

    return {
      key:
        state.type === "tool-call"
          ? "toolCallId-" + state.toolCallId
          : undefined,
      state,
      actions,
    };
  },
);
