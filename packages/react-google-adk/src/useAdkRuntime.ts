import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { httpUrlPattern, parseDataUrl } from "@assistant-ui/core/internal";
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
  AdkThreadSnapshot,
  AdkSendMessageConfig,
  AdkStreamCallback,
  OnAdkErrorCallback,
  OnAdkCustomEventCallback,
  OnAdkAgentTransferCallback,
} from "./types";
import { useAdkMessages } from "./useAdkMessages";
import {
  convertAdkMessage,
  createAdkMessageConverter,
} from "./convertAdkMessages";
import {
  projectAdkToolApprovals,
  toAdkToolConfirmationReply,
} from "./adkToolApproval";
import { adkExtras } from "./adkExtras";
import { v4 as uuidv4 } from "uuid";

/** @internal — exported for unit tests. */
export const getMessageContent = (msg: AppendMessage) => {
  const allContent = [
    ...msg.content,
    ...(msg.attachments?.flatMap((a) => a.content) ?? []),
  ];
  const content = allContent.flatMap((part) => {
    const type = part.type;
    switch (type) {
      case "text":
        return { type: "text" as const, text: part.text };
      case "image":
        return { type: "image_url" as const, url: part.image };
      case "file":
        if (part.sourceType === "url" || httpUrlPattern.test(part.data)) {
          return {
            type: "file_url" as const,
            url: part.data,
            mimeType: part.mimeType,
          };
        }
        return {
          type: "file" as const,
          mimeType: part.mimeType,
          // Lands in Gemini `inlineData.data`, which takes bare base64, so a
          // data URL envelope is stripped rather than forwarded.
          data: parseDataUrl(part.data)?.data ?? part.data,
          ...(part.filename != null && { filename: part.filename }),
        };
      case "audio": {
        const parsed = parseDataUrl(part.audio.data);
        return {
          type: "file" as const,
          mimeType: `audio/${part.audio.format}`,
          data: parsed?.data ?? part.audio.data,
        };
      }
      case "data":
        return [];

      case "tool-call":
        throw new Error("Tool call appends are not supported.");

      default: {
        const _exhaustiveCheck: "reasoning" | "source" | "generative-ui" = type;
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
  /**
   * Loads a thread's stored state. Called when the thread opens, and again for
   * `threads.reloadMainThread()`, which refetches in place rather than
   * remounting the runtime; the signal aborts a load the runtime no longer
   * needs.
   */
  load?: (
    threadId: string,
    options?: { signal?: AbortSignal | undefined },
  ) => Promise<AdkThreadSnapshot>;
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
    applySnapshot,
  } = useAdkMessages({
    stream,
    ...(eventHandlers && { eventHandlers }),
  });

  const loadRef = useRef(load);
  loadRef.current = load;
  const loadControllerRef = useRef<{
    controller: AbortController;
    purpose: "initial" | "reload";
    promise?: Promise<void> | undefined;
  } | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [isLoadingThread, setIsLoadingThread] = useState(
    () =>
      load !== undefined && aui.threadListItem.getState().externalId != null,
  );

  const [isRunning, setIsRunning] = useState(false);
  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});
  const hasExecutingTools = Object.values(toolStatuses).some(
    (s) => s?.type === "executing",
  );
  const effectiveIsRunning = isRunning || hasExecutingTools;
  const isRunningRef = useRef(effectiveIsRunning);
  isRunningRef.current = effectiveIsRunning;

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

  const { approvals: toolApprovals, key: toolApprovalsKey } =
    projectAdkToolApprovals(messages);
  const toolApprovalsRef = useRef(toolApprovals);
  toolApprovalsRef.current = toolApprovals;

  const messageConverter = useMemo(
    () =>
      toolApprovalsKey === ""
        ? convertAdkMessage
        : createAdkMessageConverter(toolApprovalsRef.current),
    [toolApprovalsKey],
  );

  const threadMessages = useExternalMessageConverter({
    callback: messageConverter,
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
  const [stagedMessageCount, setStagedMessageCount] = useState(0);
  const hasStagedMessages = stagedMessageCount > 0;

  const getStagedRun = (parentId: string | null) => {
    if (!parentId || !stagedMessagesRef.current.has(parentId)) return null;

    const staged: AdkMessage[] = [];
    for (const message of adkMessagesRef.current) {
      if (message.id && stagedMessagesRef.current.has(message.id)) {
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
    setStagedMessageCount(stagedMessagesRef.current.size);
    const nextMessages = [...adkMessagesRef.current, stagedMessage];
    adkMessagesRef.current = nextMessages;
    setMessages(nextMessages);
  };

  // The scoped client, not `aui` itself: useAui returns a render-bound
  // instance, so depending on it would re-run the load on every render.
  const threadListItem =
    aui.threadListItem.source !== null ? aui.threadListItem : undefined;

  const runLoad = useCallback(
    (purpose: "initial" | "reload" = "initial") => {
      const loadFn = loadRef.current;
      if (!loadFn || !threadListItem) return Promise.resolve();

      const externalId = threadListItem.getState().externalId;
      if (externalId == null) return Promise.resolve();

      // The initial load is already fetching what a refetch would ask for, and
      // taking it over strands the thread's history if the refetch then fails.
      if (
        purpose === "reload" &&
        loadControllerRef.current?.purpose === "initial"
      )
        return loadControllerRef.current.promise ?? Promise.resolve();

      loadControllerRef.current?.controller.abort();
      const controller = new AbortController();
      const record: NonNullable<typeof loadControllerRef.current> = {
        controller,
        purpose,
      };
      loadControllerRef.current = record;

      const messagesAtLoadStart = messagesRef.current;
      if (purpose === "initial") setIsLoadingThread(true);

      const task = loadFn(externalId, { signal: controller.signal })
        .then((snapshot) => {
          if (controller.signal.aborted) return;
          // A snapshot the session assembled before a run cannot speak for what
          // that run has since produced, and an ADK id cannot correlate a
          // message sent optimistically with the one the session stored for it,
          // so there is nothing here that could merge the two. A refetch that
          // raced a run therefore defers to the run, whether the run started
          // during the load or was already streaming when it began.
          if (
            purpose === "reload" &&
            (isRunningRef.current ||
              messagesRef.current !== messagesAtLoadStart)
          )
            return;
          applySnapshot(snapshot);
        })
        .catch((error: unknown) => {
          // Aborting a load the runtime no longer needs is not a failure.
          if (controller.signal.aborted) return;
          throw error;
        })
        .finally(() => {
          if (loadControllerRef.current?.controller === controller) {
            loadControllerRef.current = null;
          }
          if (controller.signal.aborted) return;
          setIsLoadingThread(false);
        });
      record.promise = task;

      // A refetch reports the failure to whoever awaited it; the initial load
      // has no caller to tell.
      if (purpose === "reload") return task;
      return task.catch((e: unknown) => {
        console.warn("Failed to load ADK session:", e);
      });
    },
    [threadListItem, applySnapshot],
  );

  useEffect(() => {
    runLoad();
    return () => {
      // Whatever is current, not this effect's own controller: a refetch swaps
      // the ref, and one in flight at unmount must be aborted too.
      loadControllerRef.current?.controller.abort();
      setIsLoadingThread(false);
    };
  }, [runLoad]);

  const runtime = useExternalStoreRuntime({
    ...pickExternalStoreSharedOptions(options),
    isRunning,
    isLoading: isLoadingThread,
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
            setStagedMessageCount(stagedMessagesRef.current.size);
            const nextMessages = [...truncated, stagedMessage];
            adkMessagesRef.current = nextMessages;
            setMessages(nextMessages);
            return;
          }
          const externalId = aui.threadListItem.getState().externalId;
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
    ...(getCheckpointId || hasStagedMessages
      ? {
          onReload: async (parentId, config) => {
            const stagedRun = getStagedRun(parentId);
            if (stagedRun) {
              for (const message of stagedRun.messages) {
                stagedMessagesRef.current.delete(message.id);
              }
              setStagedMessageCount(stagedMessagesRef.current.size);
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
            const externalId = aui.threadListItem.getState().externalId;
            const checkpointId = externalId
              ? await getCheckpointId(externalId, truncated)
              : null;
            return handleSendMessage([], {
              runConfig: config.runConfig,
              ...(checkpointId && { checkpointId }),
            });
          },
        }
      : {}),
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
    onRespondToToolApproval: async (options) => {
      await handleSendMessage(
        [toAdkToolConfirmationReply(options, toolApprovalsRef.current)],
        {},
      );
    },
    onCancel: unstable_allowCancellation
      ? async () => {
          cancel();
        }
      : undefined,
    ...(load !== undefined && {
      onRefetchThread: () => runLoad("reload"),
    }),
  });

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
      if (aui.threadListItem.source) return aui.threadListItem.initialize();
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
