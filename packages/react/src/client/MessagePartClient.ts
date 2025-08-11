import { resource, tapMemo } from "@assistant-ui/tap";
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
  readonly addToolResult: (result: any | ToolResponse<any>) => void;
};

export const MessagePartClient = resource(
  ({ runtime }: { runtime: MessagePartRuntime }) => {
    const runtimeState = tapSubscribable(runtime);
    const runtimeRef = tapRefValue(runtime);

    const state = tapMemo<MessagePartClientState>(() => {
      return runtimeState;
    }, [runtimeState]);

    const actions = tapActions<MessagePartClientActions>({
      addToolResult: (result) => runtimeRef.current.addToolResult(result),
    });

    return {
      state,
      actions,
    };
  },
);
