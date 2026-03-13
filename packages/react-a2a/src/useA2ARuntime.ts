/// <reference types="@assistant-ui/core/store" />
import { useEffect, useRef, useState } from "react";
import {
  A2AMessage,
  A2AToolCall,
  A2AArtifact,
  A2ATaskState,
  A2ASendMessageConfig,
  A2AStreamCallback,
  OnTaskUpdateEventCallback,
  OnArtifactsEventCallback,
  OnErrorEventCallback,
  OnStateUpdateEventCallback,
  OnCustomEventCallback,
} from "./types";
import {
  useExternalMessageConverter,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { convertA2AMessage } from "./convertA2AMessages";
import { useA2AMessages } from "./useA2AMessages";
import type { AttachmentAdapter } from "@assistant-ui/core";
import type { AppendMessage } from "@assistant-ui/core";
import type { ExternalStoreAdapter } from "@assistant-ui/core";
import type { FeedbackAdapter } from "@assistant-ui/core";
import type { SpeechSynthesisAdapter } from "@assistant-ui/core";
import { appendA2AChunk } from "./appendA2AChunk";

const getPendingToolCalls = (messages: A2AMessage[]) => {
  const pendingToolCalls = new Map<string, A2AToolCall>();
  for (const message of messages) {
    if (message.role === "assistant") {
      for (const toolCall of message.tool_calls ?? []) {
        pendingToolCalls.set(toolCall.id, toolCall);
      }
    }
    if (message.role === "tool") {
      pendingToolCalls.delete(message.tool_call_id!);
    }
  }

  return [...pendingToolCalls.values()];
};

const getMessageContent = (msg: AppendMessage) => {
  const allContent = [
    ...msg.content,
    ...(msg.attachments?.flatMap((a) => a.content) ?? []),
  ];
  const content = allContent.map((part) => {
    const type = part.type;
    switch (type) {
      case "text":
        return { type: "text" as const, text: part.text };
      case "image":
        return { type: "image_url" as const, image_url: { url: part.image } };

      case "tool-call":
        throw new Error("Tool call appends are not supported.");

      default:
        const _exhaustiveCheck:
          | "reasoning"
          | "source"
          | "file"
          | "audio"
          | "data" = type;
        throw new Error(
          `Unsupported append message part type: ${_exhaustiveCheck}`,
        );
    }
  });

  if (content.length === 1 && content[0]?.type === "text") {
    return content[0].text ?? "";
  }

  return content;
};

const symbolA2ARuntimeExtras = Symbol("a2a-runtime-extras");
type A2ARuntimeExtras = {
  [symbolA2ARuntimeExtras]: true;
  send: (messages: A2AMessage[], config: A2ASendMessageConfig) => Promise<void>;
  taskState: A2ATaskState | undefined;
  artifacts: A2AArtifact[];
};

const asA2ARuntimeExtras = (extras: unknown): A2ARuntimeExtras => {
  if (
    typeof extras !== "object" ||
    extras == null ||
    !(symbolA2ARuntimeExtras in extras)
  )
    throw new Error(
      "This method can only be called when you are using useA2ARuntime",
    );

  return extras as A2ARuntimeExtras;
};

export const useA2ATaskState = () => {
  const { taskState } = useAuiState((s) => asA2ARuntimeExtras(s.thread.extras));
  return taskState;
};

export const useA2AArtifacts = () => {
  const { artifacts } = useAuiState((s) => asA2ARuntimeExtras(s.thread.extras));
  return artifacts;
};

export const useA2ASend = () => {
  const { send } = useAuiState((s) => asA2ARuntimeExtras(s.thread.extras));
  return send;
};

export const useA2ARuntime = ({
  autoCancelPendingToolCalls,
  adapters: { attachments, feedback, speech } = {},
  unstable_allowCancellation,
  stream,
  contextId,
  onSwitchToNewThread,
  onSwitchToThread,
  eventHandlers,
}: {
  /**
   * @deprecated For thread management use `useCloudThreadListRuntime` instead. This option will be removed in a future version.
   */
  contextId?: string | undefined;
  autoCancelPendingToolCalls?: boolean | undefined;
  unstable_allowCancellation?: boolean | undefined;
  stream: A2AStreamCallback<A2AMessage>;
  /**
   * @deprecated For thread management use `useCloudThreadListRuntime` instead. This option will be removed in a future version.
   */
  onSwitchToNewThread?: () => Promise<void> | void;
  onSwitchToThread?: (contextId: string) => Promise<{
    messages: A2AMessage[];
    artifacts?: A2AArtifact[];
  }>;
  adapters?:
    | {
        attachments?: AttachmentAdapter;
        speech?: SpeechSynthesisAdapter;
        feedback?: FeedbackAdapter;
      }
    | undefined;
  /**
   * Event handlers for various A2A stream events
   */
  eventHandlers?:
    | {
        /**
         * Called when task updates are received from the A2A stream
         */
        onTaskUpdate?: OnTaskUpdateEventCallback;
        /**
         * Called when artifacts are received from the A2A stream
         */
        onArtifacts?: OnArtifactsEventCallback;
        /**
         * Called when errors occur during A2A stream processing
         */
        onError?: OnErrorEventCallback;
        /**
         * Called when state updates are received from the A2A stream
         */
        onStateUpdate?: OnStateUpdateEventCallback;
        /**
         * Called when custom events are received from the A2A stream
         */
        onCustomEvent?: OnCustomEventCallback;
      }
    | undefined;
}) => {
  const {
    taskState,
    artifacts,
    setArtifacts,
    messages,
    sendMessage,
    cancel,
    setMessages,
  } = useA2AMessages({
    appendMessage: appendA2AChunk,
    stream,
    ...(eventHandlers && { eventHandlers }),
  });

  const [isRunning, setIsRunning] = useState(false);
  const handleSendMessage = async (
    messages: A2AMessage[],
    config: A2ASendMessageConfig,
  ) => {
    try {
      setIsRunning(true);
      await sendMessage(messages, config);
    } catch (error) {
      console.error("Error streaming A2A messages:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const threadMessages = useExternalMessageConverter({
    callback: convertA2AMessage,
    messages,
    isRunning,
  });

  const switchToThread = !onSwitchToThread
    ? undefined
    : async (externalId: string) => {
        const { messages, artifacts } = await onSwitchToThread(externalId);
        setMessages(messages);
        if (artifacts) {
          setArtifacts(artifacts);
        }
      };

  const threadList: NonNullable<
    ExternalStoreAdapter["adapters"]
  >["threadList"] = {
    threadId: contextId,
    onSwitchToNewThread: !onSwitchToNewThread
      ? undefined
      : async () => {
          await onSwitchToNewThread();
          setMessages([]);
          setArtifacts([]);
        },
    onSwitchToThread: switchToThread,
  };

  const loadingRef = useRef(false);
  const aui = useAui();
  const externalId = useAuiState(() =>
    aui.threadListItem.source
      ? aui.threadListItem().getState().externalId
      : undefined,
  );
  useEffect(() => {
    if (!externalId || !switchToThread || loadingRef.current) return;

    loadingRef.current = true;
    switchToThread(externalId).finally(() => {
      loadingRef.current = false;
    });
  }, [switchToThread, externalId]);

  return useExternalStoreRuntime({
    isRunning,
    messages: threadMessages,
    adapters: {
      attachments,
      feedback,
      speech,
      threadList,
    },
    extras: {
      [symbolA2ARuntimeExtras]: true,
      taskState,
      artifacts,
      send: handleSendMessage,
    } satisfies A2ARuntimeExtras,
    onNew: (msg) => {
      const cancellations =
        autoCancelPendingToolCalls !== false
          ? getPendingToolCalls(messages).map(
              (t) =>
                ({
                  role: "tool",
                  tool_call_id: t.id,
                  content: JSON.stringify({ cancelled: true }),
                  status: {
                    type: "incomplete",
                    reason: "cancelled",
                  },
                }) satisfies A2AMessage & { role: "tool" },
            )
          : [];

      const config: A2ASendMessageConfig = {};
      if (contextId !== undefined) config.contextId = contextId;
      if (msg.runConfig !== undefined) config.runConfig = msg.runConfig;
      return handleSendMessage(
        [
          ...cancellations,
          {
            role: "user",
            content: getMessageContent(msg),
          },
        ],
        config,
      );
    },
    onAddToolResult: async ({
      toolCallId,
      toolName: _toolName,
      result,
      isError,
      artifact,
    }) => {
      // TODO parallel human in the loop calls
      const message: A2AMessage = {
        role: "tool",
        tool_call_id: toolCallId,
        content: JSON.stringify(result),
        status: isError
          ? { type: "incomplete", reason: "error" }
          : { type: "complete", reason: "stop" },
      };
      if (artifact) {
        message.artifacts = [artifact] as A2AArtifact[];
      }
      const config: A2ASendMessageConfig = {};
      if (contextId !== undefined) config.contextId = contextId;
      await handleSendMessage(
        [message],
        // TODO reuse runconfig here!
        config,
      );
    },
    onCancel: unstable_allowCancellation
      ? async () => {
          cancel();
        }
      : undefined,
  });
};
