import { resource } from "@assistant-ui/tap";
import { tapApi } from "../utils/tap-store";
import { MessagePartRuntime } from "../api/MessagePartRuntime";
import { tapSubscribable } from "./util-hooks/tapSubscribable";
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

  /** @internal */
  __internal_getRuntime(): MessagePartRuntime;
};

export const MessagePartClient = resource(
  ({ runtime }: { runtime: MessagePartRuntime }) => {
    const runtimeState = tapSubscribable(runtime);

    const api = tapApi<MessagePartClientState, MessagePartClientActions>(
      runtimeState,
      {
        addToolResult: (result) => runtime.addToolResult(result),

        __internal_getRuntime: () => runtime,
      },
    );

    return {
      key:
        runtimeState.type === "tool-call"
          ? "toolCallId-" + runtimeState.toolCallId
          : undefined,
      state: runtimeState,
      api,
    };
  },
);
