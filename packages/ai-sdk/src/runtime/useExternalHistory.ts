"use client";

import type {
  AssistantRuntime,
  ThreadHistoryAdapter,
  ThreadMessage,
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
  ExportedMessageRepository,
  RespondToToolApprovalOptions,
  Unstable_ToolInteractionLog,
} from "@assistant-ui/core";
import { getExternalStoreMessages } from "@assistant-ui/core";
import {
  MessageRepository,
  readToolInteractionLog,
} from "@assistant-ui/core/internal";
import { useAui } from "@assistant-ui/store";
import {
  useRef,
  useEffect,
  useState,
  type RefObject,
  useCallback,
  useMemo,
} from "react";

export const toExportedMessageRepository = <TMessage>(
  toThreadMessages: (messages: TMessage[]) => ThreadMessage[],
  messages: MessageFormatRepository<TMessage>,
): ExportedMessageRepository => {
  const survivingIds = new Set<string>();
  const survivors = messages.messages.flatMap((m) => {
    const message = toThreadMessages([m.message])[0];
    if (!message) {
      console.warn("Skipping a stored message that could not be loaded.");
      return [];
    }
    if (m.parentId && !survivingIds.has(m.parentId)) return [];
    survivingIds.add(message.id);
    return [{ ...m, message }];
  });

  return {
    headId:
      messages.headId && survivingIds.has(messages.headId)
        ? messages.headId
        : null,
    messages: survivors,
  };
};

const isAwaitingToolApproval = (message: ThreadMessage) =>
  message.status?.type === "requires-action" &&
  message.status.reason === "tool-calls";

const isTerminalMessage = (message: ThreadMessage) =>
  message.status === undefined ||
  message.status.type === "complete" ||
  message.status.type === "incomplete";

const TOOL_ARTIFACTS_METADATA_KEY = "__aui_toolArtifacts";
const TOOL_INTERACTIONS_METADATA_KEY = "__aui_toolInteractions";
const TOOL_APPROVAL_RESPONSES_METADATA_KEY = "__aui_toolApprovalResponses";

type StoredToolApprovalResponse = Omit<
  RespondToToolApprovalOptions,
  "approvalId"
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const collectToolArtifacts = (
  message: ThreadMessage,
  toolArtifacts: ReadonlyMap<string, unknown> | undefined,
) => {
  if (!toolArtifacts) return undefined;
  const entries = message.content.flatMap((part) => {
    if (part.type !== "tool-call") return [];
    const artifact = toolArtifacts.get(part.toolCallId);
    return artifact === undefined ? [] : [[part.toolCallId, artifact] as const];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const collectToolInteractions = (
  message: ThreadMessage,
  toolInteractions:
    | ReadonlyMap<string, Unstable_ToolInteractionLog>
    | undefined,
) => {
  if (!toolInteractions) return undefined;
  const entries = message.content.flatMap((part) => {
    if (part.type !== "tool-call") return [];
    const interactions = toolInteractions.get(part.toolCallId);
    return interactions === undefined
      ? []
      : [[part.toolCallId, interactions] as const];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const collectToolApprovalResponses = (
  message: ThreadMessage,
  toolApprovalResponses:
    | ReadonlyMap<string, RespondToToolApprovalOptions>
    | undefined,
) => {
  if (!toolApprovalResponses) return undefined;
  const entries = message.content.flatMap((part) => {
    if (part.type !== "tool-call" || !part.approval) return [];
    const response = toolApprovalResponses.get(part.approval.id);
    if (!response) return [];
    return [
      [
        part.approval.id,
        {
          approved: response.approved,
          ...(response.optionId != null && { optionId: response.optionId }),
          ...(response.text != null && { text: response.text }),
          ...(response.reason != null && { reason: response.reason }),
        },
      ] as const,
    ];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const addToolData = <TMessage>(
  message: TMessage,
  toolArtifacts: Record<string, unknown> | undefined,
  toolInteractions: Record<string, Unstable_ToolInteractionLog> | undefined,
  toolApprovalResponses: Record<string, StoredToolApprovalResponse> | undefined,
): TMessage => {
  if (
    (!toolArtifacts && !toolInteractions && !toolApprovalResponses) ||
    !isRecord(message) ||
    !Array.isArray(message.parts)
  )
    return message;
  const toolCallIds = message.parts.flatMap((part) => {
    if (!isRecord(part) || typeof part.toolCallId !== "string") return [];
    return [part.toolCallId];
  });
  const artifacts = toolArtifacts
    ? Object.fromEntries(
        toolCallIds.flatMap((toolCallId) =>
          Object.hasOwn(toolArtifacts, toolCallId)
            ? [[toolCallId, toolArtifacts[toolCallId]] as const]
            : [],
        ),
      )
    : undefined;
  const interactions = toolInteractions
    ? Object.fromEntries(
        toolCallIds.flatMap((toolCallId) =>
          Object.hasOwn(toolInteractions, toolCallId)
            ? [[toolCallId, toolInteractions[toolCallId]] as const]
            : [],
        ),
      )
    : undefined;
  const approvalIds = message.parts.flatMap((part) => {
    if (!isRecord(part) || !isRecord(part.approval)) return [];
    const approvalId = part.approval.id;
    return typeof approvalId === "string" ? [approvalId] : [];
  });
  const approvalResponses = toolApprovalResponses
    ? Object.fromEntries(
        approvalIds.flatMap((approvalId) =>
          Object.hasOwn(toolApprovalResponses, approvalId)
            ? [[approvalId, toolApprovalResponses[approvalId]] as const]
            : [],
        ),
      )
    : undefined;
  const hasArtifacts = !!artifacts && Object.keys(artifacts).length > 0;
  const hasInteractions =
    !!interactions && Object.keys(interactions).length > 0;
  const hasApprovalResponses =
    !!approvalResponses && Object.keys(approvalResponses).length > 0;
  if (!hasArtifacts && !hasInteractions && !hasApprovalResponses)
    return message;
  const metadata = isRecord(message.metadata) ? message.metadata : {};
  return {
    ...message,
    metadata: {
      ...metadata,
      ...(hasArtifacts && { [TOOL_ARTIFACTS_METADATA_KEY]: artifacts }),
      ...(hasInteractions && {
        [TOOL_INTERACTIONS_METADATA_KEY]: interactions,
      }),
      ...(hasApprovalResponses && {
        [TOOL_APPROVAL_RESPONSES_METADATA_KEY]: approvalResponses,
      }),
    },
  } as TMessage;
};

const restoreToolData = <TMessage>(
  message: TMessage,
  toolArtifacts: Map<string, unknown> | undefined,
  toolInteractions: Map<string, Unstable_ToolInteractionLog> | undefined,
  toolApprovalResponses: Map<string, RespondToToolApprovalOptions> | undefined,
): TMessage => {
  if (!isRecord(message) || !isRecord(message.metadata)) return message;
  const metadata = message.metadata;
  const hasArtifacts = Object.hasOwn(metadata, TOOL_ARTIFACTS_METADATA_KEY);
  const hasInteractions = Object.hasOwn(
    metadata,
    TOOL_INTERACTIONS_METADATA_KEY,
  );
  const hasApprovalResponses = Object.hasOwn(
    metadata,
    TOOL_APPROVAL_RESPONSES_METADATA_KEY,
  );
  if (!hasArtifacts && !hasInteractions && !hasApprovalResponses)
    return message;
  const artifacts = metadata[TOOL_ARTIFACTS_METADATA_KEY];
  if (toolArtifacts && isRecord(artifacts)) {
    for (const [toolCallId, artifact] of Object.entries(artifacts)) {
      toolArtifacts.set(toolCallId, artifact);
    }
  }
  const interactions = metadata[TOOL_INTERACTIONS_METADATA_KEY];
  if (toolInteractions && isRecord(interactions)) {
    for (const [toolCallId, value] of Object.entries(interactions)) {
      const log = readToolInteractionLog(value);
      if (log) toolInteractions.set(toolCallId, log);
    }
  }
  const approvalResponses = metadata[TOOL_APPROVAL_RESPONSES_METADATA_KEY];
  if (toolApprovalResponses && isRecord(approvalResponses)) {
    for (const [approvalId, value] of Object.entries(approvalResponses)) {
      if (!isRecord(value) || typeof value.approved !== "boolean") continue;
      toolApprovalResponses.set(approvalId, {
        approvalId,
        approved: value.approved,
        ...(typeof value.optionId === "string" && {
          optionId: value.optionId,
        }),
        ...(typeof value.text === "string" && { text: value.text }),
        ...(typeof value.reason === "string" && { reason: value.reason }),
      });
    }
  }
  const {
    [TOOL_ARTIFACTS_METADATA_KEY]: _,
    [TOOL_INTERACTIONS_METADATA_KEY]: __,
    [TOOL_APPROVAL_RESPONSES_METADATA_KEY]: ___,
    ...restMetadata
  } = metadata;
  const { metadata: _metadata, ...restMessage } = message;
  return (
    Object.keys(restMetadata).length === 0
      ? restMessage
      : { ...restMessage, metadata: restMetadata }
  ) as TMessage;
};

const encodeContent = <TMessage>(
  storageFormatAdapter: MessageFormatAdapter<TMessage, any>,
  item: MessageFormatItem<TMessage>,
) => JSON.stringify(storageFormatAdapter.encode(item));

export const useExternalHistory = <TMessage>(
  runtimeRef: RefObject<AssistantRuntime>,
  historyAdapter: ThreadHistoryAdapter | undefined,
  toThreadMessages: (messages: TMessage[]) => ThreadMessage[],
  storageFormatAdapter: MessageFormatAdapter<TMessage, any>,
  onSetMessages: (messages: TMessage[]) => void,
  toolArtifacts?: Map<string, unknown>,
  onToolArtifactsRestored?: () => void,
  toolInteractions?: Map<string, Unstable_ToolInteractionLog>,
  onToolInteractionsRestored?: () => void,
  toolApprovalResponses?: Map<string, RespondToToolApprovalOptions>,
  onToolApprovalResponsesRestored?: () => void,
) => {
  const loadedRef = useRef(false);
  const [itemEpoch, setItemEpoch] = useState(0);

  const aui = useAui();
  const optionalThreadListItem = useCallback(
    () => (aui.threadListItem.source ? aui.threadListItem : null),
    [aui],
  );

  const [hasLoaded, setHasLoaded] = useState(false);

  const historyIds = useRef(new Set<string>());
  const deferredTelemetryIds = useRef(new Set<string>());
  // `content` is a snapshot taken at write time rather than a re-encode of `source`, because a retained message object can be mutated in place by the runtime that produced it.
  const persistedInnerMessages = useRef(
    new Map<string, { source: TMessage; content: string }>(),
  );

  const onSetMessagesRef = useRef(onSetMessages);
  useEffect(() => {
    onSetMessagesRef.current = onSetMessages;
  });

  const formatAdapter = useMemo(() => {
    if (!historyAdapter) return undefined;
    if (!historyAdapter.withFormat) {
      throw new Error(
        "useAISDKRuntime: ThreadHistoryAdapter is missing the required `withFormat` method.",
      );
    }
    return historyAdapter.withFormat<TMessage, any>(storageFormatAdapter);
  }, [historyAdapter, storageFormatAdapter]);

  const isLoading = formatAdapter != null && !hasLoaded;

  useEffect(() => {
    if (!formatAdapter || loadedRef.current) return undefined;

    const loadHistory = async () => {
      try {
        const repo = await formatAdapter.load();
        toolArtifacts?.clear();
        toolInteractions?.clear();
        toolApprovalResponses?.clear();
        const restoredMessages =
          repo?.messages.map((item) => ({
            ...item,
            message: restoreToolData(
              item.message,
              toolArtifacts,
              toolInteractions,
              toolApprovalResponses,
            ),
          })) ?? [];
        onToolArtifactsRestored?.();
        onToolInteractionsRestored?.();
        onToolApprovalResponsesRestored?.();
        if (repo && restoredMessages.length > 0) {
          const restoredRepo = { ...repo, messages: restoredMessages };
          for (const [index, m] of repo.messages.entries()) {
            persistedInnerMessages.current.set(
              storageFormatAdapter.getId(m.message),
              {
                source: restoredMessages[index]!.message,
                content: encodeContent(storageFormatAdapter, m),
              },
            );
          }
          const converted = toExportedMessageRepository(
            toThreadMessages,
            restoredRepo,
          );
          runtimeRef.current.thread.import(converted);

          const tempRepo = new MessageRepository();
          tempRepo.import(converted);
          const messages = tempRepo.getMessages();

          onSetMessagesRef.current(
            messages.flatMap(getExternalStoreMessages<TMessage>),
          );

          historyIds.current = new Set();
          for (const m of converted.messages) {
            historyIds.current.add(m.message.id);
            if (isAwaitingToolApproval(m.message)) {
              deferredTelemetryIds.current.add(m.message.id);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load message history:", error);
      } finally {
        setHasLoaded(true);
      }
    };

    formatAdapter.pin?.();

    const remoteId = optionalThreadListItem()?.getState().remoteId;
    if (!remoteId) {
      // History loads asynchronously against the thread list item; without a
      // remote id there is nothing to await, so the flag settles here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasLoaded(true);
      return aui.subscribe(() => {
        if (optionalThreadListItem()?.getState().remoteId) {
          setItemEpoch((n) => n + 1);
        }
      });
    }

    const threadState = runtimeRef.current.thread.getState();
    if (threadState.isRunning || threadState.messages.length > 0) {
      loadedRef.current = true;
      setHasLoaded(true);
      return undefined;
    }

    loadedRef.current = true;
    void loadHistory();
    return undefined;
  }, [
    formatAdapter,
    toThreadMessages,
    runtimeRef,
    optionalThreadListItem,
    aui,
    itemEpoch,
    storageFormatAdapter,
    toolArtifacts,
    onToolArtifactsRestored,
    toolInteractions,
    onToolInteractionsRestored,
    toolApprovalResponses,
    onToolApprovalResponsesRestored,
  ]);

  const runStartRef = useRef<number | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistInFlightRef = useRef<Promise<void>>(Promise.resolve());
  const stepBoundariesRef = useRef<number[]>([]);
  const wasRunningRef = useRef(false);
  const toolCallCountRef = useRef(0);

  const persistToolInteractions = useCallback(
    (messageId: string) => {
      const persistence = persistInFlightRef.current.then(async () => {
        if (!formatAdapter?.update) return;
        const messages = runtimeRef.current.thread.getState().messages;
        const message = messages.find(
          (item) =>
            item.id === messageId ||
            getExternalStoreMessages<TMessage>(item).some(
              (innerMessage) =>
                storageFormatAdapter.getId(innerMessage) === messageId,
            ),
        );
        if (!message) return;

        const previousMessages = messages
          .slice(0, messages.indexOf(message))
          .flatMap(getExternalStoreMessages<TMessage>);
        let parentId = previousMessages.at(-1)
          ? storageFormatAdapter.getId(previousMessages.at(-1)!)
          : null;
        const storedToolArtifacts = collectToolArtifacts(
          message,
          toolArtifacts,
        );
        const storedToolInteractions = collectToolInteractions(
          message,
          toolInteractions,
        );
        const storedToolApprovalResponses = collectToolApprovalResponses(
          message,
          toolApprovalResponses,
        );

        for (const innerMessage of getExternalStoreMessages<TMessage>(
          message,
        )) {
          const item = {
            parentId,
            message: addToolData(
              innerMessage,
              storedToolArtifacts,
              storedToolInteractions,
              storedToolApprovalResponses,
            ),
          };
          const innerId = storageFormatAdapter.getId(item.message);
          const persisted = persistedInnerMessages.current.get(innerId);
          if (persisted) {
            const content = encodeContent(storageFormatAdapter, item);
            if (content === persisted.content) {
              persisted.source = item.message;
            } else {
              await formatAdapter.update(item, innerId);
              persistedInnerMessages.current.set(innerId, {
                source: item.message,
                content,
              });
            }
          }
          parentId = innerId;
        }
      });
      persistInFlightRef.current = persistence.catch(() => {});
      return persistence.catch((error) => {
        console.error("Failed to persist tool data:", error);
      });
    },
    [
      formatAdapter,
      runtimeRef,
      storageFormatAdapter,
      toolArtifacts,
      toolInteractions,
      toolApprovalResponses,
    ],
  );

  useEffect(() => {
    if (!formatAdapter) return;
    const adapter = formatAdapter;

    const idleScheduledInnerIds = new Set<string>();
    const unpersistedInnerIds = (message: ThreadMessage) =>
      isTerminalMessage(message)
        ? getExternalStoreMessages<TMessage>(message)
            .map((innerMessage) => storageFormatAdapter.getId(innerMessage))
            .filter((innerId) => !persistedInnerMessages.current.has(innerId))
        : [];

    const unsubscribe = runtimeRef.current.thread.subscribe(() => {
      const threadState = runtimeRef.current.thread.getState();
      const { isRunning } = threadState;
      const wasRunning = wasRunningRef.current;
      wasRunningRef.current = isRunning;

      // Track step boundaries by content changes (more reliable than isRunning)
      if (runStartRef.current != null) {
        const lastMsg = threadState.messages.at(-1);
        if (lastMsg?.role === "assistant") {
          const currentToolCallCount = lastMsg.content.filter(
            (p) => p.type === "tool-call",
          ).length;
          while (toolCallCountRef.current < currentToolCallCount) {
            stepBoundariesRef.current.push(Date.now() - runStartRef.current);
            toolCallCountRef.current++;
          }
        }
      }

      if (isRunning) {
        if (runStartRef.current == null) {
          runStartRef.current = Date.now();
          stepBoundariesRef.current = [];
          toolCallCountRef.current = 0;
          adapter.pin?.();
        }
        // Cancel any pending persist — isRunning went back to true
        if (persistTimerRef.current) {
          clearTimeout(persistTimerRef.current);
          persistTimerRef.current = null;
        }
        return;
      }

      if (wasRunning) {
        // Record step boundary offset (synchronous for accuracy)
        if (runStartRef.current != null) {
          stepBoundariesRef.current.push(Date.now() - runStartRef.current);
        }
      } else {
        const pending = threadState.messages.flatMap(unpersistedInnerIds);
        if (pending.every((innerId) => idleScheduledInnerIds.has(innerId)))
          return;
        for (const innerId of pending) idleScheduledInnerIds.add(innerId);
      }

      // Debounce: wait one macrotask so agentic step flickers are absorbed
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        persistSettled(false);
      }, 0);
    });

    const initialThreadState = runtimeRef.current.thread.getState();
    wasRunningRef.current = initialThreadState.isRunning;
    if (initialThreadState.isRunning) {
      if (runStartRef.current == null) {
        runStartRef.current = Date.now();
        stepBoundariesRef.current = [];
        toolCallCountRef.current = 0;
        adapter.pin?.();
      }
    } else if (initialThreadState.messages.length > 0) {
      persistSettled(true);
    }

    function persistSettled(ignoreRunning: boolean) {
      persistTimerRef.current = null;
      const latest = runtimeRef.current.thread.getState();
      if (!ignoreRunning && latest.isRunning) return;

      const boundaries = stepBoundariesRef.current;
      const durationMs = boundaries.length > 0 ? boundaries.at(-1) : undefined;

      // Fallback: if only 1 boundary but message has multiple steps, distribute evenly
      if (boundaries.length === 1 && durationMs != null) {
        const lastAssistant = latest.messages.findLast(
          (m) => m.role === "assistant",
        );
        if (lastAssistant) {
          const tcCount = lastAssistant.content.filter(
            (p) => p.type === "tool-call",
          ).length;
          if (tcCount > 0) {
            const totalSteps = tcCount + 1;
            const stepDur = durationMs / totalSteps;
            boundaries.length = 0;
            for (let i = 0; i < totalSteps; i++) {
              boundaries.push(Math.round((i + 1) * stepDur));
            }
          }
        }
      }

      // Build per-step timestamps when there are multiple steps
      const stepTimestamps =
        boundaries.length > 1
          ? boundaries.map((endMs, i) => ({
              start_ms: i === 0 ? 0 : boundaries[i - 1]!,
              end_ms: endMs,
            }))
          : undefined;

      runStartRef.current = null;
      stepBoundariesRef.current = [];

      const telemetryOptions = {
        ...(durationMs != null ? { durationMs } : undefined),
        ...(stepTimestamps != null ? { stepTimestamps } : undefined),
      };

      persistInFlightRef.current = persistInFlightRef.current
        .then(async () => {
          const { messages } = latest;
          let lastInnerMessageId: string | null = null;

          const getLastInnerId = (msgs: TMessage[]): string | null =>
            msgs.length > 0 ? storageFormatAdapter.getId(msgs.at(-1)!) : null;

          const toBatchItems = (
            msgs: TMessage[],
            toolArtifacts: Record<string, unknown> | undefined,
            toolInteractions:
              | Record<string, Unstable_ToolInteractionLog>
              | undefined,
            toolApprovalResponses:
              | Record<string, StoredToolApprovalResponse>
              | undefined,
          ) =>
            msgs.map((msg, idx) => ({
              parentId:
                idx === 0
                  ? lastInnerMessageId
                  : storageFormatAdapter.getId(msgs[idx - 1]!),
              message: addToolData(
                msg,
                toolArtifacts,
                toolInteractions,
                toolApprovalResponses,
              ),
            }));

          for (const message of messages) {
            const innerMessages = getExternalStoreMessages<TMessage>(message);

            const isTerminal = isTerminalMessage(message);
            const isAwaitingToolCalls = isAwaitingToolApproval(message);
            // A paused message's later content can only reach storage via update, so it is persisted early only when the adapter supports update.
            const isReady =
              isTerminal ||
              (isAwaitingToolCalls && adapter.update !== undefined);

            if (!isReady) {
              lastInnerMessageId =
                getLastInnerId(innerMessages) ?? lastInnerMessageId;
              continue;
            }

            if (!historyIds.current.has(message.id)) {
              historyIds.current.add(message.id);
              deferredTelemetryIds.current.add(message.id);
            }

            const batchItems = toBatchItems(
              innerMessages,
              collectToolArtifacts(message, toolArtifacts),
              collectToolInteractions(message, toolInteractions),
              collectToolApprovalResponses(message, toolApprovalResponses),
            );
            for (const item of batchItems) {
              const innerId = storageFormatAdapter.getId(item.message);
              const persisted = persistedInnerMessages.current.get(innerId);
              if (!persisted) {
                await adapter.append(item);
                persistedInnerMessages.current.set(innerId, {
                  source: item.message,
                  content: encodeContent(storageFormatAdapter, item),
                });
              } else if (
                persisted.source !== item.message &&
                durationMs !== undefined &&
                adapter.update
              ) {
                const content = encodeContent(storageFormatAdapter, item);
                if (content === persisted.content) {
                  persisted.source = item.message;
                } else {
                  try {
                    await adapter.update(item, innerId);
                    persistedInnerMessages.current.set(innerId, {
                      source: item.message,
                      content,
                    });
                  } catch {
                    // A failed update leaves the stale baseline behind so the next run stop retries it.
                  }
                }
              }
            }

            lastInnerMessageId =
              getLastInnerId(innerMessages) ?? lastInnerMessageId;

            if (deferredTelemetryIds.current.has(message.id) && isTerminal) {
              deferredTelemetryIds.current.delete(message.id);
              adapter.reportTelemetry?.(
                batchItems.map((item, index) => ({
                  ...item,
                  message: innerMessages[index]!,
                })),
                {
                  ...telemetryOptions,
                  message,
                },
              );
            }
          }
        })
        .catch((error) => {
          console.error("Failed to persist message history:", error);
        });
    }

    return () => {
      unsubscribe();
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
        persistSettled(false);
      }
    };
  }, [
    formatAdapter,
    storageFormatAdapter,
    runtimeRef,
    toolArtifacts,
    toolInteractions,
    toolApprovalResponses,
  ]);

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const deleteMessages = formatAdapter?.delete?.bind(formatAdapter);
      if (!deleteMessages) return;

      const messages = runtimeRef.current.thread.getState().messages;
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return;

      const previousInnerMessages = messages
        .slice(0, messageIndex)
        .flatMap(getExternalStoreMessages<TMessage>);
      let parentId = previousInnerMessages.at(-1)
        ? storageFormatAdapter.getId(previousInnerMessages.at(-1)!)
        : null;
      const itemsToDelete = getExternalStoreMessages<TMessage>(
        messages[messageIndex]!,
      ).map((message) => {
        const item = { parentId, message };
        parentId = storageFormatAdapter.getId(message);
        return item;
      });

      const deletion = persistInFlightRef.current.then(async () => {
        await deleteMessages(itemsToDelete);

        historyIds.current.delete(messageId);
        deferredTelemetryIds.current.delete(messageId);
        for (const item of itemsToDelete) {
          persistedInnerMessages.current.delete(
            storageFormatAdapter.getId(item.message),
          );
        }
      });

      persistInFlightRef.current = deletion.catch(() => {});
      await deletion;
    },
    [formatAdapter, runtimeRef, storageFormatAdapter],
  );

  return {
    isLoading,
    deleteMessage,
    persistToolInteractions,
    persistToolApprovalResponses: persistToolInteractions,
  };
};
