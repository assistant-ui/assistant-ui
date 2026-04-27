/// <reference types="@assistant-ui/core/store" />
import { useEffect, useRef, useState } from "react";
import {
  getExternalStoreMessages,
  type AttachmentAdapter,
  type DictationAdapter,
  type FeedbackAdapter,
  type SpeechSynthesisAdapter,
  type AppendMessage,
  type ThreadMessage,
} from "@assistant-ui/core";
import {
  type ToolExecutionStatus,
  useCloudThreadListAdapter,
  useRemoteThreadListRuntime,
  useExternalMessageConverter,
  useExternalStoreRuntime,
  useToolInvocations,
} from "@assistant-ui/core/react";
import { useAui } from "@assistant-ui/store";
import type { AssistantCloud } from "assistant-cloud";
import type { RemoteThreadListAdapter } from "@assistant-ui/core";
import type {
  AdkMessage,
  AdkSendMessageConfig,
  AdkStreamCallback,
  OnAdkErrorCallback,
  OnAdkCustomEventCallback,
  OnAdkAgentTransferCallback,
} from "./types";
import { useAdkMessages } from "./useAdkMessages";
import { convertAdkMessage } from "./convertAdkMessages";
import { symbolAdkRuntimeExtras, type AdkRuntimeExtras } from "./hooks";
import { v4 as uuidv4 } from "uuid";

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
        return { type: "image_url" as const, url: part.image };
      case "file":
        return {
          type: "text" as const,
          text: `[File: ${part.filename ?? "file"}]`,
        };

      case "tool-call":
        throw new Error("Tool call appends are not supported.");

      default: {
        const _exhaustiveCheck: "reasoning" | "source" | "audio" | "data" =
          type;
        throw new Error(
          `Unsupported append message part type: ${_exhaustiveCheck}`,
        );
      }
    }
  });

  if (content.length === 1 && content[0]?.type === "text") {
    return content[0].text ?? "";
  }

  return content;
};

/** @internal — exported for unit tests. */
export const getPendingToolCalls = (messages: AdkMessage[]) => {
  const pending = new Map<string, { id: string; name: string }>();
  for (const msg of messages) {
    if (msg.type === "ai" && msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        pending.set(tc.id, tc);
      }
    }
    if (msg.type === "tool") {
      pending.delete(msg.tool_call_id);
    }
  }
  return [...pending.values()];
};

/**
 * @internal — exported for unit tests.
 *
 * Returns `{cancelled: true}` tool responses for pending tool calls when the
 * user sends a new turn, EXCEPT for HITL interrupts marked via
 * `long_running_tool_ids` (`adk_request_input`, `adk_request_confirmation`,
 * `adk_request_credential`). Those must be answered through a dedicated tool
 * UI + submit helper, not auto-cancelled.
 */
export const getPendingCancellations = (
  messages: AdkMessage[],
  longRunningToolIds: readonly string[],
): Array<AdkMessage & { type: "tool" }> => {
  const longRunningSet = new Set(longRunningToolIds);
  return getPendingToolCalls(messages)
    .filter((t) => !longRunningSet.has(t.id))
    .map(
      (t) =>
        ({
          id: uuidv4(),
          type: "tool",
          name: t.name,
          tool_call_id: t.id,
          content: JSON.stringify({ cancelled: true }),
          status: "error",
        }) satisfies AdkMessage & { type: "tool" },
    );
};

const truncateAdkMessages = (
  threadMessages: readonly ThreadMessage[],
  parentId: string | null,
): AdkMessage[] => {
  if (parentId === null) return [];
  const parentIndex = threadMessages.findIndex((m) => m.id === parentId);
  if (parentIndex === -1) return [];
  const truncated: AdkMessage[] = [];
  for (let i = 0; i <= parentIndex && i < threadMessages.length; i++) {
    truncated.push(...getExternalStoreMessages<AdkMessage>(threadMessages[i]!));
  }
  return truncated;
};

export type UseAdkRuntimeOptions = {
  stream: AdkStreamCallback;
  autoCancelPendingToolCalls?: boolean | undefined;
  unstable_allowCancellation?: boolean | undefined;
  getCheckpointId?: (
    threadId: string,
    parentMessages: AdkMessage[],
  ) => Promise<string | null>;
  load?: (threadId: string) => Promise<{ messages: AdkMessage[] }>;
  create?: () => Promise<{ externalId: string }>;
  delete?: (threadId: string) => Promise<void>;
  adapters?:
    | {
        attachments?: AttachmentAdapter;
        speech?: SpeechSynthesisAdapter;
        dictation?: DictationAdapter;
        feedback?: FeedbackAdapter;
      }
    | undefined;
  eventHandlers?:
    | {
        onError?: OnAdkErrorCallback;
        onCustomEvent?: OnAdkCustomEventCallback;
        onAgentTransfer?: OnAdkAgentTransferCallback;
      }
    | undefined;
  cloud?: AssistantCloud | undefined;
  /**
   * A `RemoteThreadListAdapter` to use instead of the cloud adapter.
   * Use with `createAdkSessionAdapter` for ADK session-backed persistence.
   */
  sessionAdapter?: RemoteThreadListAdapter | undefined;
};

const useAdkRuntimeImpl = ({
  autoCancelPendingToolCalls,
  adapters: { attachments, dictation, feedback, speech } = {},
  unstable_allowCancellation,
  stream,
  load,
  getCheckpointId,
  eventHandlers,
}: UseAdkRuntimeOptions) => {
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const aui = useAui();
  const {
    messages,
    stateDelta,
    agentInfo,
    longRunningToolIds,
    artifactDelta,
    toolConfirmations,
    authRequests,
    escalated,
    messageMetadata,
    sendMessage,
    cancel,
    replaceMessages,
    // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  } = useAdkMessages({
    stream,
    ...(eventHandlers && { eventHandlers }),
  });

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const [isRunning, setIsRunning] = useState(false);
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});
  const hasExecutingTools = Object.values(toolStatuses).some(
    (s) => s?.type === "executing",
  );
  const effectiveIsRunning = isRunning || hasExecutingTools;

  const handleSendMessage = async (
    msgs: AdkMessage[],
    config: AdkSendMessageConfig,
  ) => {
    try {
      setIsRunning(true);
      await sendMessage(msgs, config);
    } finally {
      setIsRunning(false);
    }
  };

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const threadMessages = useExternalMessageConverter({
    callback: convertAdkMessage,
    messages,
    isRunning: effectiveIsRunning,
  });

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const threadMessagesRef = useRef(threadMessages);
  threadMessagesRef.current = threadMessages;

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const [runtimeRef] = useState(() => ({
    get current() {
      return runtime;
    },
  }));

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const toolInvocations = useToolInvocations({
    state: { messages: threadMessages, isRunning: effectiveIsRunning },
    getTools: () => runtimeRef.current.thread.getModelContext().tools,
    onResult: (command) => {
      if (command.type === "add-tool-result") {
        void handleSendMessage(
          [
            {
              id: uuidv4(),
              type: "tool",
              name: command.toolName,
              tool_call_id: command.toolCallId,
              content: JSON.stringify(command.result),
              status: command.isError ? "error" : "success",
            },
          ],
          {},
        );
      }
    },
    setToolStatuses,
  });

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const runtime = useExternalStoreRuntime({
    isRunning: effectiveIsRunning,
    messages: threadMessages,
    adapters: { attachments, dictation, feedback, speech },
    extras: {
      [symbolAdkRuntimeExtras]: true,
      agentInfo,
      stateDelta,
      artifactDelta,
      longRunningToolIds,
      toolConfirmations,
      authRequests,
      escalated,
      messageMetadata,
      send: handleSendMessage,
    } satisfies AdkRuntimeExtras,
    onNew: async (msg) => {
      await toolInvocations.abort();

      const cancellations =
        autoCancelPendingToolCalls !== false
          ? getPendingCancellations(messages, longRunningToolIds)
          : [];

      return handleSendMessage(
        [
          ...cancellations,
          {
            id: uuidv4(),
            type: "human",
            content: getMessageContent(msg),
          },
        ],
        { runConfig: msg.runConfig },
      );
    },
    onEdit: getCheckpointId
      ? async (msg) => {
          await toolInvocations.abort();
          const truncated = truncateAdkMessages(
            threadMessagesRef.current,
            msg.parentId,
          );
          replaceMessages(truncated);
          const externalId = aui.threadListItem().getState().externalId;
          const checkpointId = externalId
            ? await getCheckpointId(externalId, truncated)
            : null;
          return handleSendMessage(
            [
              {
                id: uuidv4(),
                type: "human",
                content: getMessageContent(msg),
              },
            ],
            {
              runConfig: msg.runConfig,
              ...(checkpointId && { checkpointId }),
            },
          );
        }
      : undefined,
    onReload: getCheckpointId
      ? async (parentId, config) => {
          await toolInvocations.abort();
          const truncated = truncateAdkMessages(
            threadMessagesRef.current,
            parentId,
          );
          replaceMessages(truncated);
          const externalId = aui.threadListItem().getState().externalId;
          const checkpointId = externalId
            ? await getCheckpointId(externalId, truncated)
            : null;
          return handleSendMessage([], {
            runConfig: config.runConfig,
            ...(checkpointId && { checkpointId }),
          });
        }
      : undefined,
    onAddToolResult: async ({
      toolCallId,
      toolName,
      result,
      isError,
      artifact,
    }) => {
      await handleSendMessage(
        [
          {
            id: uuidv4(),
            type: "tool",
            name: toolName,
            tool_call_id: toolCallId,
            content: JSON.stringify(result),
            artifact,
            status: isError ? "error" : "success",
          },
        ],
        {},
      );
    },
    onResumeToolCall: (options) =>
      toolInvocations.resume(options.toolCallId, options.payload),
    onCancel: unstable_allowCancellation
      ? async () => {
          cancel();
          await toolInvocations.abort();
        }
      : undefined,
  });

  {
    // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
    const loadRef = useRef(load);
    // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
    useEffect(() => {
      loadRef.current = load;
    });

    // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
    useEffect(() => {
      const loadFn = loadRef.current;
      if (!loadFn) return;

      const externalId = aui.threadListItem().getState().externalId;
      if (externalId == null) return;

      loadFn(externalId).then(
        ({ messages: msgs }) => {
          replaceMessages(msgs);
        },
        (e) => {
          console.warn("Failed to load ADK session:", e);
        },
      );
    }, [aui, replaceMessages]);
  }

  return runtime;
};

export const useAdkRuntime = ({
  cloud,
  sessionAdapter,
  create,
  delete: deleteFn,
  ...options
}: UseAdkRuntimeOptions) => {
  const aui = useAui();
  const cloudAdapter = useCloudThreadListAdapter({
    cloud,
    create: async () => {
      if (create) return create();
      if (aui.threadListItem.source) return aui.threadListItem().initialize();
      return { externalId: undefined };
    },
    delete: deleteFn,
  });

  const adapter = sessionAdapter ?? cloudAdapter;

  return useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
      return useAdkRuntimeImpl(options);
    },
    adapter,
    allowNesting: true,
  });
};
