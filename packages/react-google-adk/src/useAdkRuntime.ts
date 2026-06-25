import { useEffect, useRef, useState } from "react";
import {
  getExternalStoreMessages,
  pickExternalStoreSharedOptions,
  type AttachmentAdapter,
  type DictationAdapter,
  type ExternalStoreSharedOptions,
  type FeedbackAdapter,
  type RealtimeVoiceAdapter,
  type SpeechSynthesisAdapter,
  type AppendMessage,
  type ThreadMessage,
  type ToolExecutionStatus,
  generateId,
} from "@assistant-ui/core";
import {
  useCloudThreadListAdapter,
  useRemoteThreadListRuntime,
  useExternalMessageConverter,
  useExternalStoreRuntime,
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
import { adkExtras } from "./adkExtras";
import { v4 as uuidv4 } from "uuid";

/** @internal — exported for unit tests. */
export const getMessageContent = (msg: AppendMessage) => {
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
          type: "file" as const,
          mimeType: part.mimeType,
          data: part.data,
          ...(part.filename != null && { filename: part.filename }),
        };

      case "tool-call":
        throw new Error("Tool call appends are not supported.");

      default: {
        const _exhaustiveCheck:
          | "reasoning"
          | "source"
          | "audio"
          | "data"
          | "generative-ui" = type;
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

const toAdkUserMessage = (
  msg: AppendMessage,
  id = generateId(),
): AdkMessage & { type: "human"; id: string } => ({
  id,
  type: "human",
  content: getMessageContent(msg),
});

export type UseAdkRuntimeOptions = ExternalStoreSharedOptions & {
  stream: AdkStreamCallback;
  /**
   * Called whenever the active thread's canonical (remote) ID changes, so the
   * value can be treated as a managed/controlled variable (e.g. synced to a URL
   * query param). Only the settled remote ID is emitted: while a freshly created
   * thread is still optimistic the value is `undefined`, and the real ID is
   * emitted once the thread is initialized; the transient local ID is never
   * surfaced.
   */
  onThreadIdChange?: ((threadId: string | undefined) => void) | undefined;
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
        voice?: RealtimeVoiceAdapter;
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

const useAdkRuntimeImpl = (options: UseAdkRuntimeOptions) => {
  const {
    autoCancelPendingToolCalls,
    adapters: { attachments, dictation, feedback, speech, voice } = {},
    unstable_allowCancellation,
    stream,
    load,
    getCheckpointId,
    eventHandlers,
  } = options;
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
    setMessages,
    replaceMessages,
  } = useAdkMessages({
    stream,
    ...(eventHandlers && { eventHandlers }),
  });

  const [isRunning, setIsRunning] = useState(false);
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

  const threadMessages = useExternalMessageConverter({
    callback: convertAdkMessage,
    messages,
    isRunning: effectiveIsRunning,
  });

  const threadMessagesRef = useRef(threadMessages);
  threadMessagesRef.current = threadMessages;

  const adkMessagesRef = useRef(messages);
  adkMessagesRef.current = messages;

  const stagedMessagesRef = useRef(
    new Map<
      string,
      {
        message: AdkMessage & { id: string };
        runConfig: AppendMessage["runConfig"];
      }
    >(),
  );

  const getStagedRun = (parentId: string | null) => {
    if (!parentId || !stagedMessagesRef.current.has(parentId)) return null;

    const staged: AdkMessage[] = [];
    for (const message of adkMessagesRef.current) {
      if (stagedMessagesRef.current.has(message.id)) {
        staged.push(stagedMessagesRef.current.get(message.id)!.message);
      }
      if (message.id === parentId) break;
    }

    return {
      messages: staged,
      runConfig: stagedMessagesRef.current.get(parentId)!.runConfig,
    };
  };

  const stageUserMessage = (msg: AppendMessage) => {
    const stagedMessage = toAdkUserMessage(msg);
    stagedMessagesRef.current.set(stagedMessage.id, {
      message: stagedMessage,
      runConfig: msg.runConfig,
    });
    setMessages([...messages, stagedMessage]);
  };

  const runtime = useExternalStoreRuntime({
    ...pickExternalStoreSharedOptions(options),
    isRunning: effectiveIsRunning,
    messages: threadMessages,
    unstable_enableToolInvocations: true,
    setToolStatuses,
    adapters: { attachments, dictation, feedback, speech, voice },
    extras: adkExtras.provide({
      agentInfo,
      stateDelta,
      artifactDelta,
      longRunningToolIds,
      toolConfirmations,
      authRequests,
      escalated,
      messageMetadata,
      send: handleSendMessage,
    }),
    onNew: async (msg) => {
      if (!(msg.startRun ?? msg.role === "user")) {
        stageUserMessage(msg);
        return;
      }

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
          const truncated = truncateAdkMessages(
            threadMessagesRef.current,
            msg.parentId,
          );
          replaceMessages(truncated);
          if (!(msg.startRun ?? msg.role === "user")) {
            const stagedMessage = toAdkUserMessage(msg);
            stagedMessagesRef.current.set(stagedMessage.id, {
              message: stagedMessage,
              runConfig: msg.runConfig,
            });
            setMessages([...truncated, stagedMessage]);
            return;
          }
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
    onReload: async (parentId, config) => {
      const stagedRun = getStagedRun(parentId);
      if (stagedRun) {
        for (const message of stagedRun.messages) {
          stagedMessagesRef.current.delete(message.id);
        }
        return handleSendMessage(stagedRun.messages, {
          runConfig: config.runConfig ?? stagedRun.runConfig,
        });
      }

      if (!getCheckpointId)
        throw new Error("Runtime does not support reloading messages.");

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
    },
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
    onCancel: unstable_allowCancellation
      ? async () => {
          cancel();
        }
      : undefined,
  });

  {
    const loadRef = useRef(load);
    useEffect(() => {
      loadRef.current = load;
    });

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
  onThreadIdChange,
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
      return useAdkRuntimeImpl(options);
    },
    adapter,
    allowNesting: true,
    onThreadIdChange,
  });
};
