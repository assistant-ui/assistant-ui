import {
  useState,
  useMemo,
  useEffect,
  useEffectEvent,
  useCallback,
  useRef,
} from "react";
import { resource, withKey } from "@assistant-ui/tap";
import {
  type ClientElement,
  type ClientOutput,
  useClientLookup,
  attachTransformScopes,
  useClientResource,
  Derived,
} from "@assistant-ui/store";

import type {
  AddToolResultOptions,
  AppendMessage,
  Attachment,
  AttachmentAdapter,
  CreateAttachment,
  PendingAttachment,
  RespondToToolApprovalOptions,
  ResumeToolCallOptions,
  MessagePartStatus,
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
  ThreadMessage,
  ToolCallMessagePartStatus,
  ExternalThreadQueueAdapter,
  ExternalThreadBranchAdapter,
} from "@assistant-ui/core";
import { ToolResponse } from "assistant-stream";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import type { QueueItemState } from "@assistant-ui/core/store";
import type { ComposerSendOptions } from "@assistant-ui/core/store";
import {
  fileMatchesAccept,
  getThreadMessageText,
  isCreateAttachment,
  resolveToolApprovalResponse,
} from "@assistant-ui/core/internal";
import { ModelContext, Suggestions } from "@assistant-ui/core/store";
import { Tools, DataRenderers } from "@assistant-ui/core/react";
import { SingleThreadList } from "./SingleThreadList";

const EMPTY_QUEUE_ITEMS: readonly QueueItemState[] = [];
const EMPTY_BRANCH_IDS: readonly string[] = [];

export type ExternalThreadMessage = ThreadMessage & {
  id: string;
};

const COMPLETE_STATUS: MessagePartStatus = Object.freeze({
  type: "complete",
});

// Legacy runtime parity (toMessagePartStatus): a tool call without a result
// carries its message's status; the last part of a streaming message streams.
const derivePartStatus = (
  message: ExternalThreadMessage,
  partIndex: number,
  part: ThreadAssistantMessagePart | ThreadUserMessagePart,
): ToolCallMessagePartStatus => {
  if (message.role !== "assistant" || !message.status) return COMPLETE_STATUS;

  if (part.type === "tool-call") {
    if (!part.result) return message.status as ToolCallMessagePartStatus;
    return COMPLETE_STATUS;
  }

  const isLastPart = partIndex === Math.max(0, message.content.length - 1);
  if (message.status.type === "requires-action") return COMPLETE_STATUS;
  return isLastPart ? (message.status as MessagePartStatus) : COMPLETE_STATUS;
};

export type ExternalThreadProps = {
  messages: readonly ExternalThreadMessage[];
  isRunning?: boolean;
  isLoading?: boolean | undefined;
  state?: ReadonlyJSONValue | undefined;
  extras?: unknown;
  /**
   * Whether sending new messages is currently disabled. When `true`, the
   * thread composer's input remains usable but `send()` is a no-op and
   * `composer.canSend` is `false`. Edit composers (saving message edits)
   * intentionally ignore this flag.
   */
  isSendDisabled?: boolean;
  /**
   * Callback for new messages (non-queue runtimes).
   * @note Unused when `queue` is provided — new messages are routed through `queue.enqueue` instead.
   */
  onNew?: (message: AppendMessage) => void;
  onEdit?: (message: AppendMessage) => void;
  onReload?: (parentId: string | null) => void;
  onStartRun?: () => void;
  onCancel?: () => void;
  onResume?: (() => void) | undefined;
  onAddToolResult?: ((options: AddToolResultOptions) => void) | undefined;
  /** Callback for resuming a tool call that is waiting for human input. */
  onResumeToolCall?: ((options: ResumeToolCallOptions) => void) | undefined;
  onLoadExternalState?: ((state: unknown) => void) | undefined;
  attachmentAdapter?: AttachmentAdapter | undefined;
  /** Queue adapter for runtimes that support message queuing and steering. */
  queue?: ExternalThreadQueueAdapter;
  /** Branch adapter for runtimes that track sibling variants of messages. */
  branches?: ExternalThreadBranchAdapter;
  /** Callback for tool approval decisions. Absent: responding to an approval throws a capability error. */
  onRespondToToolApproval?: (options: RespondToToolApprovalOptions) => void;
};

type MessageClientProps = {
  message: ExternalThreadMessage;
  index: number;
  parentId: string | null;
  onEdit?: (message: AppendMessage) => void;
  onReload?: () => void;
  queue?: ExternalThreadQueueAdapter | undefined;
  branches?: ExternalThreadBranchAdapter | undefined;
  onRespondToToolApproval?:
    | ((options: RespondToToolApprovalOptions) => void)
    | undefined;
  onAddToolResult?: ((options: AddToolResultOptions) => void) | undefined;
  onResumeToolCall?: ((options: ResumeToolCallOptions) => void) | undefined;
  attachmentAdapter?: AttachmentAdapter | undefined;
};

// Message Client - minimal implementation
const useMessageClient = ({
  message,
  index,
  parentId,
  onEdit,
  onReload,
  queue,
  branches,
  onRespondToToolApproval,
  onAddToolResult,
  onResumeToolCall,
  attachmentAdapter,
}: MessageClientProps): ClientOutput<"message"> => {
  const [isCopied, setIsCopied] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const partClients = useClientLookup(
    message.content.map((part, idx) =>
      withKey(
        idx,
        PartResource({
          part,
          status: derivePartStatus(message, idx, part),
          messageId: message.id,
          onRespondToToolApproval,
          onAddToolResult,
          onResumeToolCall,
        }),
      ),
    ),
  );

  const attachmentClients = useClientLookup(
    (message.attachments ?? []).map((attachment) =>
      withKey(
        attachment.id,
        AttachmentResource({
          attachment,
          onRemove: () => {},
        }),
      ),
    ),
  );

  const handleBeginEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSendEdit = (msg: AppendMessage) => {
    queue?.clear("edit");
    onEdit?.({
      ...msg,
      parentId,
      sourceId: message.id,
    });
    setIsEditing(false);
  };

  const composerClient = useClientResource(
    ComposerClientResource({
      type: "edit",
      isEditing,
      canCancel: true,
      onCancel: handleCancelEdit,
      onBeginEdit: handleBeginEdit,
      onSend: handleSendEdit,
      message,
      queue,
      attachmentAdapter,
    }),
  );

  const branchIds = branches?.getBranches(message.id) ?? EMPTY_BRANCH_IDS;
  const branchIndex = branchIds.indexOf(message.id);
  const branchNumber = branchIndex === -1 ? 1 : branchIndex + 1;
  const branchCount = branchIndex === -1 ? 1 : branchIds.length;

  const state = useMemo(() => {
    return {
      ...message,
      attachments: message.attachments ?? [],
      parentId,
      isLast: false, // Will be set by thread
      branchNumber,
      branchCount,
      speech: undefined,
      parts: partClients.state,
      isCopied,
      isHovering,
      index,
      composer: composerClient.state,
    };
  }, [
    message,
    parentId,
    isCopied,
    isHovering,
    index,
    composerClient.state,
    partClients.state,
    branchNumber,
    branchCount,
  ]);

  return {
    getState: () => state,
    composer: () => composerClient.methods,
    delete: () => {},
    reload: () => {
      onReload?.();
    },
    speak: () => {},
    stopSpeaking: () => {},
    submitFeedback: () => {},
    switchToBranch: ({ position, branchId }) => {
      if (!branches) return;
      const target =
        branchId ??
        (branchIndex === -1
          ? undefined
          : position === "previous"
            ? branchIds[branchIndex - 1]
            : position === "next"
              ? branchIds[branchIndex + 1]
              : undefined);
      if (target !== undefined && target !== message.id)
        branches.switchToBranch(target);
    },
    getCopyText: () => getThreadMessageText(message),
    part: (selector) => {
      if ("index" in selector) {
        return partClients.get(selector);
      }
      const partIndex = state.parts.findIndex(
        (p) => p.type === "tool-call" && p.toolCallId === selector.toolCallId,
      );
      return partClients.get({ index: partIndex });
    },
    attachment: (selector) => {
      if ("id" in selector) {
        return attachmentClients.get({ key: selector.id });
      }
      return attachmentClients.get(selector);
    },
    setIsCopied,
    setIsHovering,
  };
};

const MessageClient = resource(useMessageClient);

type PartResourceProps = {
  part: ThreadAssistantMessagePart | ThreadUserMessagePart;
  status: ToolCallMessagePartStatus;
  messageId: string;
  onRespondToToolApproval?:
    | ((options: RespondToToolApprovalOptions) => void)
    | undefined;
  onAddToolResult?: ((options: AddToolResultOptions) => void) | undefined;
  onResumeToolCall?: ((options: ResumeToolCallOptions) => void) | undefined;
};

// Part Client - minimal implementation
const usePartResource = ({
  part,
  status,
  messageId,
  onRespondToToolApproval,
  onAddToolResult,
  onResumeToolCall,
}: PartResourceProps): ClientOutput<"part"> => {
  const state = useMemo(
    () => ({
      ...part,
      status,
    }),
    [part, status],
  );

  return {
    getState: () => state,
    addToolResult: (result) => {
      if (!onAddToolResult)
        throw new Error(
          "Runtime does not support tool results (onAddToolResult is not set).",
        );
      if (part.type !== "tool-call")
        throw new Error("Tried to add tool result on non-tool message part");

      const response = ToolResponse.toResponse(result);
      onAddToolResult({
        messageId,
        toolName: part.toolName,
        toolCallId: part.toolCallId,
        result: response.result as ReadonlyJSONValue,
        isError: response.isError,
        ...(response.artifact !== undefined && { artifact: response.artifact }),
        ...(response.modelContent !== undefined && {
          modelContent: response.modelContent,
        }),
      });
    },
    resumeToolCall: (payload) => {
      if (!onResumeToolCall)
        throw new Error(
          "Runtime does not support resuming tool calls (onResumeToolCall is not set).",
        );
      if (part.type !== "tool-call")
        throw new Error("Tried to resume tool call on non-tool message part");

      onResumeToolCall({ toolCallId: part.toolCallId, payload });
    },
    respondToToolApproval: (response) => {
      if (!onRespondToToolApproval)
        throw new Error("Runtime does not support tool approvals.");

      if (part.type !== "tool-call")
        throw new Error(
          "Tried to respond to tool approval on non-tool message part",
        );

      if (
        !part.approval ||
        part.approval.approved !== undefined ||
        part.approval.resolution !== undefined
      )
        throw new Error("Tool call has no pending approval");

      onRespondToToolApproval(
        resolveToolApprovalResponse(part.approval, response),
      );
    },
  };
};

const PartResource = resource(usePartResource);

type AttachmentResourceProps = {
  attachment: Attachment;
  onRemove?: () => void | Promise<void>;
};

// Attachment Client - minimal implementation
const useAttachmentResource = ({
  attachment,
  onRemove,
}: AttachmentResourceProps): ClientOutput<"attachment"> => {
  return {
    getState: () => attachment,
    remove: async () => {
      await onRemove?.();
    },
  };
};

const AttachmentResource = resource(useAttachmentResource);

type ComposerClientResourceProps = {
  type: "thread" | "edit";
  isEditing: boolean;
  canCancel: boolean;
  isSendDisabled?: boolean;
  onCancel: () => void;
  onBeginEdit?: () => void;
  onSend?: (message: AppendMessage) => void;
  message?: ExternalThreadMessage;
  queue?: ExternalThreadQueueAdapter | undefined;
  attachmentAdapter?: AttachmentAdapter | undefined;
};

const useQueueItemClient = ({
  item,
  onSteer,
  onRemove,
}: {
  item: QueueItemState;
  onSteer: () => void;
  onRemove: () => void;
}): ClientOutput<"queueItem"> => {
  return {
    getState: () => item,
    steer: onSteer,
    remove: onRemove,
  };
};

const QueueItemClient = resource(useQueueItemClient);

const drainAdapterAdd = async (
  result: ReturnType<AttachmentAdapter["add"]>,
  upsert: (attachment: Attachment) => void,
) => {
  if (Symbol.asyncIterator in result) {
    for await (const attachment of result) {
      upsert(attachment);
    }
  } else {
    upsert(await result);
  }
};

// State whose setter tracks the latest value in a ref, so imperative
// call sequences (setText immediately followed by send) observe the write
// before React re-renders — legacy composer parity.
const useLiveState = <T>(initial: T) => {
  const [state, setState] = useState(initial);
  const ref = useRef(state);
  const set = useCallback((next: T | ((prev: T) => T)) => {
    ref.current =
      typeof next === "function" ? (next as (prev: T) => T)(ref.current) : next;
    setState(ref.current);
  }, []);
  return [state, set, ref] as const;
};

// Composer Client - minimal implementation
const useComposerClientResource = ({
  type,
  isEditing,
  canCancel,
  isSendDisabled = false,
  onCancel,
  onBeginEdit,
  onSend,
  message,
  queue,
  attachmentAdapter,
}: ComposerClientResourceProps): ClientOutput<"composer"> => {
  const [text, setText, textRef] = useLiveState("");
  const [role, setRole, roleRef] = useLiveState<
    "user" | "assistant" | "system"
  >("user");
  const [runConfig, setRunConfig, runConfigRef] = useLiveState<
    Record<string, unknown>
  >({});
  const [attachments, setAttachments, attachmentsRef] = useLiveState<
    readonly Attachment[]
  >([]);
  const [quote, setQuote, quoteRef] = useLiveState<
    { readonly text: string; readonly messageId: string } | undefined
  >(undefined);

  // Update composer values when editing begins
  const updateFromMessage = useEffectEvent(() => {
    if (message) {
      // Extract text from message content (text parts only)
      const textParts = message.content.filter((part) => part.type === "text");
      const messageText = textParts
        .map((part) => ("text" in part ? part.text : ""))
        .join("\n\n");

      setText(messageText);
      setRole(message.role);
      setAttachments(message.attachments ?? []);
    }
  });

  useEffect(() => {
    if (isEditing) {
      updateFromMessage();
    }
  }, [isEditing]);

  const attachmentClients = useClientLookup(
    attachments.map((attachment) =>
      withKey(
        attachment.id,
        AttachmentResource({
          attachment,
          onRemove: async () => {
            await attachmentAdapter?.remove(attachment);
            setAttachments((prev) =>
              prev.filter((a) => a.id !== attachment.id),
            );
          },
        }),
      ),
    ),
  );

  const removePendingAttachments = async (removed: readonly Attachment[]) => {
    if (!attachmentAdapter) return;
    await Promise.all(
      removed
        .filter((a) => a.status.type !== "complete")
        .map((a) => attachmentAdapter.remove(a)),
    );
  };

  const upsertAttachment = (attachment: Attachment) => {
    setAttachments((prev) => {
      const idx = prev.findIndex((a) => a.id === attachment.id);
      if (idx === -1) return [...prev, attachment];
      const next = [...prev];
      next[idx] = attachment;
      return next;
    });
  };

  const queueItems = queue?.items ?? EMPTY_QUEUE_ITEMS;
  const queueItemClients = useClientLookup(
    queueItems.map((item) =>
      withKey(
        item.id,
        QueueItemClient({
          item,
          onSteer: () => queue?.steer(item.id),
          onRemove: () => queue?.remove(item.id),
        }),
      ),
    ),
  );

  const state = useMemo(() => {
    const isEmpty = !text.trim() && !attachments.length;
    return {
      text,
      role,
      attachments: attachmentClients.state,
      runConfig,
      isEditing,
      canCancel,
      canSend: isEditing && !isEmpty && !isSendDisabled,
      attachmentAccept: attachmentAdapter?.accept ?? "*",
      isEmpty,
      type,
      dictation: undefined,
      quote,
      queue: queueItems,
    };
  }, [
    text,
    role,
    attachmentClients.state,
    runConfig,
    isEditing,
    canCancel,
    isSendDisabled,
    type,
    attachments.length,
    quote,
    queueItems,
    attachmentAdapter?.accept,
  ]);

  return {
    getState: () => state,
    setText,
    setRole,
    setRunConfig,
    addAttachment: async (fileOrAttachment: File | CreateAttachment) => {
      if (attachmentAdapter) {
        const file = isCreateAttachment(fileOrAttachment)
          ? {
              name: fileOrAttachment.name,
              type: fileOrAttachment.contentType ?? "",
            }
          : { name: fileOrAttachment.name, type: fileOrAttachment.type };
        if (!fileMatchesAccept(file, attachmentAdapter.accept))
          throw new Error(
            `File type ${file.type || "unknown"} is not accepted. Accepted types: ${attachmentAdapter.accept}`,
          );
      }
      if (!isCreateAttachment(fileOrAttachment) && attachmentAdapter) {
        await drainAdapterAdd(
          attachmentAdapter.add({ file: fileOrAttachment }),
          upsertAttachment,
        );
      } else if (!isCreateAttachment(fileOrAttachment)) {
        const newAttachment: Attachment = {
          id: Math.random().toString(36).substring(7),
          type: "file",
          name: fileOrAttachment.name,
          contentType: fileOrAttachment.type,
          file: fileOrAttachment,
          status: { type: "complete" },
          content: [],
        };
        setAttachments((prev) => [...prev, newAttachment]);
      } else {
        const newAttachment: Attachment = {
          id: fileOrAttachment.id ?? Math.random().toString(36).substring(7),
          type: fileOrAttachment.type ?? "document",
          name: fileOrAttachment.name,
          contentType: fileOrAttachment.contentType,
          content: fileOrAttachment.content,
          status: { type: "complete" },
        };
        setAttachments((prev) => [...prev, newAttachment]);
      }
    },
    clearAttachments: async () => {
      const removed = attachmentsRef.current;
      setAttachments([]);
      await removePendingAttachments(removed);
    },
    attachment: (selector) => {
      if ("id" in selector) {
        return attachmentClients.get({ key: selector.id });
      }
      return attachmentClients.get(selector);
    },
    reset: async () => {
      const removed = attachmentsRef.current;
      setText("");
      setRole("user");
      setRunConfig({});
      setAttachments([]);
      setQuote(undefined);
      await removePendingAttachments(removed);
    },
    send: (opts?: ComposerSendOptions) => {
      const currentQuote = quoteRef.current;
      const currentText = textRef.current;
      const currentAttachments = attachmentsRef.current;
      const isEmpty = !currentText.trim() && !currentAttachments.length;
      if (!isEditing || isEmpty || isSendDisabled) return;

      setText("");
      setAttachments([]);
      setQuote(undefined);

      const dispatch = (sendAttachments: readonly Attachment[]) => {
        const composedMessage: AppendMessage = {
          role: roleRef.current,
          content: currentText
            ? [{ type: "text" as const, text: currentText }]
            : [],
          attachments: sendAttachments as any,
          createdAt: new Date(),
          parentId: null,
          sourceId: null,
          runConfig: runConfigRef.current,
          startRun: opts?.startRun,
          metadata: {
            custom: { ...(currentQuote ? { quote: currentQuote } : {}) },
          },
        };
        if (queue) {
          queue.enqueue(composedMessage, { steer: opts?.steer ?? false });
        } else {
          onSend?.(composedMessage);
        }
      };

      if (attachmentAdapter && currentAttachments.length > 0) {
        void Promise.all(
          currentAttachments.map((attachment) =>
            attachment.status.type === "complete"
              ? attachment
              : attachmentAdapter.send(attachment as PendingAttachment),
          ),
        ).then(dispatch, (error) => {
          // Upload failed: merge the failed send back into the draft.
          setText((prev) =>
            currentText && prev
              ? currentText + "\n" + prev
              : currentText || prev,
          );
          setQuote((prev) => prev ?? currentQuote);
          setAttachments((prev) => [...currentAttachments, ...prev]);
          console.error("Failed to send attachments", error);
        });
      } else {
        dispatch(currentAttachments);
      }
    },
    cancel: onCancel,
    beginEdit: () => {
      onBeginEdit?.();
    },
    startDictation: () => {},
    stopDictation: () => {},
    setQuote,
    queueItem: (selector: { index: number }) => {
      return queueItemClients.get(selector);
    },
  };
};

const ComposerClientResource = resource(useComposerClientResource);

const dedupeMessagesById = (messages: readonly ExternalThreadMessage[]) => {
  const seenIds = new Set<string>();
  const deduped: ExternalThreadMessage[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]!;
    if (seenIds.has(message.id)) {
      console.warn(
        `ExternalThread: duplicate message id "${message.id}" in the provided messages array; keeping the last occurrence.`,
      );
      continue;
    }
    seenIds.add(message.id);
    deduped.push(message);
  }
  return deduped.length === messages.length ? messages : deduped.reverse();
};

// External Thread Client
const useExternalThread = ({
  messages: messagesProp,
  isRunning = false,
  isLoading = false,
  state: threadState,
  extras,
  isSendDisabled = false,
  onNew,
  onEdit,
  onReload,
  onStartRun,
  onCancel,
  onResume,
  onAddToolResult,
  onResumeToolCall,
  onLoadExternalState,
  attachmentAdapter,
  queue,
  branches,
  onRespondToToolApproval,
}: ExternalThreadProps): ClientOutput<"thread"> => {
  const messages = useMemo(
    () => dedupeMessagesById(messagesProp),
    [messagesProp],
  );

  const handleReload = (messageId: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    const parentId = messageIndex > 0 ? messages[messageIndex - 1]!.id : null;
    queue?.clear("reload");
    onReload?.(parentId);
  };

  const messageClients = useClientLookup(
    messages.map((msg, index) => {
      const props: MessageClientProps = {
        message: msg,
        index,
        parentId: index > 0 ? messages[index - 1]!.id : null,
        onReload: () => handleReload(msg.id),
        queue,
        branches,
        onRespondToToolApproval,
        onAddToolResult,
        onResumeToolCall,
        attachmentAdapter,
      };
      if (onEdit) props.onEdit = onEdit;
      return withKey(msg.id, MessageClient(props));
    }),
  );

  const handleCancelRun = () => {
    queue?.clear("cancel-run");
    onCancel?.();
  };

  const handleSendNew = (message: AppendMessage) => {
    // The composer does not know the thread; stamp the current head as the
    // parent (legacy composer parity).
    onNew?.({ ...message, parentId: messages.at(-1)?.id ?? null });
  };

  const headId = messages.at(-1)?.id ?? null;
  const composerQueue = useMemo(
    (): ExternalThreadQueueAdapter | undefined =>
      queue && {
        ...queue,
        enqueue: (message, options) =>
          queue.enqueue(
            { ...message, parentId: message.parentId ?? headId },
            options,
          ),
      },
    [queue, headId],
  );

  const composerClient = useClientResource(
    ComposerClientResource({
      type: "thread",
      isEditing: true,
      canCancel: isRunning,
      isSendDisabled,
      onCancel: handleCancelRun,
      onSend: handleSendNew,
      queue: composerQueue,
      attachmentAdapter,
    }),
  );

  const hasQueue = !!queue;
  const hasBranches = !!branches;
  const hasEdit = !!onEdit;
  const hasReload = !!onReload;
  const hasAttachments = !!attachmentAdapter;
  const state = useMemo(() => {
    const messageStates = messageClients.state.map((s, idx, arr) => ({
      ...s,
      isLast: idx === arr.length - 1,
    }));

    return {
      isEmpty: messages.length === 0,
      isDisabled: false,
      isLoading,
      isRunning,
      capabilities: {
        edit: hasEdit,
        delete: false,
        reload: hasReload,
        cancel: isRunning,
        speech: false,
        attachments: hasAttachments,
        feedback: false,
        voice: false,
        switchToBranch: hasBranches,
        switchBranchDuringRun: false,
        unstable_copy: false,
        dictation: false,
        queue: hasQueue,
      },
      messages: messageStates,
      state: threadState ?? {},
      suggestions: [],
      extras,
      speech: undefined,
      voice: undefined,
      composer: composerClient.state,
    };
  }, [
    messages,
    isRunning,
    isLoading,
    threadState,
    extras,
    hasQueue,
    hasBranches,
    hasEdit,
    hasReload,
    hasAttachments,
    messageClients.state,
    composerClient.state,
  ]);

  return {
    getState: () => state,
    composer: () => composerClient.methods,
    append: (message) => {
      const appendMessage: AppendMessage =
        typeof message === "string"
          ? {
              createdAt: new Date(),
              parentId: messages.at(-1)?.id ?? null,
              sourceId: null,
              runConfig: {},
              role: "user",
              content: [{ type: "text", text: message }],
              attachments: [],
              metadata: { custom: {} },
            }
          : {
              createdAt: message.createdAt ?? new Date(),
              parentId: message.parentId ?? messages.at(-1)?.id ?? null,
              sourceId: message.sourceId ?? null,
              role: message.role ?? "user",
              content: message.content,
              attachments: message.attachments ?? [],
              metadata: message.metadata ?? { custom: {} },
              runConfig: message.runConfig ?? {},
              startRun: message.startRun,
            };
      if (queue) {
        queue.enqueue(appendMessage, { steer: false });
      } else {
        onNew?.(appendMessage);
      }
    },
    deleteMessage: () => {},
    startRun: () => {
      onStartRun?.();
    },
    resumeRun: () => {
      if (!onResume)
        throw new Error(
          "Runtime does not support resuming runs (onResume is not set).",
        );
      onResume();
    },
    cancelRun: handleCancelRun,
    importExternalState: (state: unknown) => {
      if (!onLoadExternalState)
        throw new Error(
          "Runtime does not support importing external states (onLoadExternalState is not set).",
        );
      onLoadExternalState(state);
    },
    getModelContext: () => ({ tools: {}, config: {} }),
    export: () => ({ messages: [] }),
    import: () => {},
    reset: () => {},
    message: (selector) => {
      if ("id" in selector) {
        return messageClients.get({ key: selector.id });
      }
      return messageClients.get(selector);
    },
    stopSpeaking: () => {},
    connectVoice: () => {},
    disconnectVoice: () => {},
    getVoiceVolume: () => 0,
    subscribeVoiceVolume: () => () => {},
    muteVoice: () => {},
    unmuteVoice: () => {},
  };
};

export const ExternalThread = resource(useExternalThread);

attachTransformScopes(useExternalThread, (scopes, parent) => {
  if (!scopes.threads && parent.threads.source === null) {
    const threadElement = scopes.thread as ClientElement<"thread">;
    scopes.threads = SingleThreadList({ thread: threadElement });
    // scopes mount in key order; re-declare thread after the threads source it resolves from
    delete scopes.thread;
    scopes.thread = Derived({
      source: "threads",
      query: { type: "main" },
      get: (aui) => aui.threads.thread("main"),
    });
  }

  if (!scopes.threadListItem && parent.threadListItem.source === null) {
    scopes.threadListItem = Derived({
      source: "threads",
      query: { type: "main" },
      get: (aui) => aui.threads.item("main"),
    });
  }

  scopes.composer ??= Derived({
    source: "thread",
    query: {},
    get: (aui) => aui.thread.composer(),
  });

  if (!scopes.modelContext && parent.modelContext.source === null) {
    scopes.modelContext = ModelContext();
  }
  if (!scopes.tools && parent.tools.source === null) {
    scopes.tools = Tools({});
  }
  if (!scopes.dataRenderers && parent.dataRenderers.source === null) {
    scopes.dataRenderers = DataRenderers();
  }
  if (!scopes.suggestions && parent.suggestions.source === null) {
    scopes.suggestions = Suggestions();
  }
});
