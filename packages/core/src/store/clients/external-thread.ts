import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { resource, withKey } from "@assistant-ui/tap";
import { getMessagePartKeys } from "../../utils/getMessagePartKeys";
import type { ClientElement, ClientOutput } from "@assistant-ui/store";
import {
  useOptionalAssistantClientRef,
  useOptionalAssistantEmit,
  useOptionalAssistantScopeEffect,
} from "@assistant-ui/store/internal";
import {
  useClientLookup,
  attachTransformScopes,
  useClientResource,
  Derived,
} from "@assistant-ui/store/client";

import type {
  AppendMessage,
  MessagePartStatus,
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
  ThreadMessage,
  ToolCallMessagePartStatus,
} from "../../types/message";
import type {
  AddToolResultOptions,
  RespondToToolApprovalOptions,
  ResumeToolCallOptions,
  SpeechState,
  ThreadSuggestion,
  Unstable_RecordToolInteractionOptions,
} from "../../runtime/interfaces/thread-runtime-core";
import type { Unstable_ToolInteractionInput } from "../../types/message";
import type { CreateResumeRunConfig } from "../../runtime/api/thread-runtime";
import { toAppendMessage } from "../../runtime/utils/append-message";
import { dedupeMessagesById } from "../../runtime/utils/external-store-message";
import { LoadEarlier } from "../../runtime/utils/load-earlier";
import type { ExternalThreadQueueAdapter } from "../../runtime/queue/external-thread-queue-adapter";
import type { ExternalThreadBranchAdapter } from "../../runtime/branch/external-thread-branch-adapter";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type { FeedbackAdapter } from "../../adapters/feedback";
import type { SpeechSynthesisAdapter } from "../../adapters/speech";
import { ToolResponse } from "assistant-stream";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import { getThreadMessageText } from "../../utils/text";
import { resolveToolApprovalResponse } from "../../runtime/utils/resolveToolApprovalResponse";
import { createToolInteraction } from "../../runtime/utils/tool-interactions";
import { ThreadMessageClient } from "./thread-message-client";
import { submissionThreadMessage } from "./submission-message";
import { toMessagePartStatus } from "../../utils/normalizePartStatus";
import { ModelContext } from "./model-context-client";
import { ThreadSuggestions } from "./suggestions";
import { createTaskDeriver, getTaskKey, TaskClient } from "./thread-tasks";
import { Tools } from "../../react/client/Tools";
import { DataRenderers } from "../../react/client/DataRenderers";
import { SingleThreadList } from "./single-thread-list";
import {
  AttachmentResource,
  ComposerClientResource,
  getEventThreadId,
  type CleanupOwner,
} from "./external-composer";

const EMPTY_BRANCH_IDS: readonly string[] = [];
const EMPTY_SUGGESTIONS: readonly ThreadSuggestion[] = [];

export type ExternalThreadMessage = ThreadMessage & {
  id: string;
};

const COMPLETE_STATUS: MessagePartStatus = Object.freeze({
  type: "complete",
});

const derivePartStatus = (
  message: ExternalThreadMessage,
  partIndex: number,
  part: ThreadAssistantMessagePart | ThreadUserMessagePart,
): ToolCallMessagePartStatus => {
  if (!message.status) return COMPLETE_STATUS;
  return toMessagePartStatus(message, partIndex, part);
};

export type ExternalThreadProps = {
  messages: readonly ExternalThreadMessage[];
  isRunning?: boolean;
  isLoading?: boolean | undefined;
  /** Whether messages exist before the first one in `messages`; takes effect with `onLoadEarlier`. */
  hasEarlier?: boolean | undefined;
  /** Loads the page before the first message, which the host prepends to `messages`; one call runs at a time. */
  onLoadEarlier?: (() => Promise<void>) | undefined;
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
  /** Resume the existing run from its checkpoint without appending a user message. */
  onResume?:
    | ((config: CreateResumeRunConfig) => void | Promise<void>)
    | undefined;
  /** True only while a checkpoint is available; requires onResume. */
  canResume?: boolean | undefined;
  /**
   * Handler for re-fetching this thread's state in place, driving
   * `threads.reloadMainThread()`. Unrelated to `onReload`, which re-generates
   * an assistant message. Presence enables the `refetchThread` capability;
   * rejections propagate to the caller.
   */
  onRefetchThread?: (() => Promise<void>) | undefined;
  onAddToolResult?: ((options: AddToolResultOptions) => void) | undefined;
  /** Callback for resuming a tool call that is waiting for human input. */
  onResumeToolCall?: ((options: ResumeToolCallOptions) => void) | undefined;
  onLoadExternalState?: ((state: unknown) => void) | undefined;
  attachmentAdapter?: AttachmentAdapter | undefined;
  feedbackAdapter?: FeedbackAdapter | undefined;
  speechAdapter?: SpeechSynthesisAdapter | undefined;
  /** Queue adapter for runtimes that support message queuing and steering. */
  queue?: ExternalThreadQueueAdapter;
  /** Branch adapter for runtimes that track sibling variants of messages. */
  branches?: ExternalThreadBranchAdapter;
  /** Callback for tool approval decisions. Absent: responding to an approval throws a capability error. */
  onRespondToToolApproval?: (
    options: RespondToToolApprovalOptions,
  ) => void | Promise<void>;
  /** @deprecated Experimental since 2026-09-23. Not scheduled for removal; the API may change in any release. */
  unstable_onRecordToolInteraction?:
    | ((options: Unstable_RecordToolInteractionOptions) => void | Promise<void>)
    | undefined;
};

type MessageClientProps = {
  message: ExternalThreadMessage;
  index: number;
  isLast: boolean;
  parentId: string | null;
  onEdit?: (message: AppendMessage) => void;
  onReload?: () => void;
  queue?: ExternalThreadQueueAdapter | undefined;
  branches?: ExternalThreadBranchAdapter | undefined;
  onRespondToToolApproval?:
    | ((options: RespondToToolApprovalOptions) => void | Promise<void>)
    | undefined;
  /** @deprecated Experimental since 2026-09-23. Not scheduled for removal; the API may change in any release. */
  unstable_onRecordToolInteraction?:
    | ((options: Unstable_RecordToolInteractionOptions) => void | Promise<void>)
    | undefined;
  onAddToolResult?: ((options: AddToolResultOptions) => void) | undefined;
  onResumeToolCall?: ((options: ResumeToolCallOptions) => void) | undefined;
  attachmentAdapter?: AttachmentAdapter | undefined;
  captureCleanupOwner?: (() => CleanupOwner) | undefined;
  submittedFeedback:
    | { type: "positive" | "negative"; comment?: string }
    | undefined;
  onSubmitFeedback: (feedback: {
    type: "positive" | "negative";
    comment?: string;
  }) => void;
  speech: SpeechState | undefined;
  onSpeak: () => void;
  onStopSpeaking: () => void;
};

// Message Client - minimal implementation
const useMessageClient = ({
  message,
  index,
  isLast,
  parentId,
  onEdit,
  onReload,
  queue,
  branches,
  onRespondToToolApproval,
  unstable_onRecordToolInteraction,
  onAddToolResult,
  onResumeToolCall,
  attachmentAdapter,
  captureCleanupOwner,
  submittedFeedback,
  onSubmitFeedback,
  speech,
  onSpeak,
  onStopSpeaking,
}: MessageClientProps): ClientOutput<"message"> => {
  const [isCopied, setIsCopied] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const partKeys = getMessagePartKeys(message.content);
  const partClients = useClientLookup(
    message.content.map((part, idx) =>
      withKey(
        partKeys[idx]!,
        PartResource({
          part,
          status: derivePartStatus(message, idx, part),
          messageId: message.id,
          onRespondToToolApproval,
          unstable_onRecordToolInteraction,
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
    if (!onEdit) throw new Error("Runtime does not support editing.");
  };

  const handleSendEdit = (msg: AppendMessage) => {
    if (!onEdit) throw new Error("Runtime does not support editing.");
    onEdit({
      ...msg,
      parentId,
      sourceId: message.id,
    });
  };

  const composerClient = useClientResource(
    ComposerClientResource({
      type: "edit",
      canCancel: true,
      onBeginEdit: handleBeginEdit,
      onSend: handleSendEdit,
      message,
      queue,
      attachmentAdapter,
      captureCleanupOwner,
    }),
  );

  const branchIds = branches?.getBranches(message.id) ?? EMPTY_BRANCH_IDS;
  const branchIndex = branchIds.indexOf(message.id);
  const branchNumber = branchIndex === -1 ? 1 : branchIndex + 1;
  const branchCount = branchIndex === -1 ? 1 : branchIds.length;

  const state = useMemo(() => {
    const messageWithFeedback: ExternalThreadMessage =
      submittedFeedback && message.role === "assistant"
        ? {
            ...message,
            metadata: {
              ...message.metadata,
              submittedFeedback,
            },
          }
        : message;
    return {
      ...messageWithFeedback,
      attachments: message.attachments ?? [],
      parentId,
      isLast,
      branchNumber,
      branchCount,
      speech,
      parts: partClients.state,
      isCopied,
      isHovering,
      index,
      composer: composerClient.state,
    };
  }, [
    message,
    isLast,
    parentId,
    isCopied,
    isHovering,
    index,
    composerClient.state,
    partClients.state,
    branchNumber,
    branchCount,
    submittedFeedback,
    speech,
  ]);

  return {
    getState: () => state,
    composer: () => composerClient.methods,
    delete: () => {},
    reload: () => {
      onReload?.();
    },
    speak: onSpeak,
    stopSpeaking: onStopSpeaking,
    submitFeedback: onSubmitFeedback,
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
    | ((options: RespondToToolApprovalOptions) => void | Promise<void>)
    | undefined;
  /** @deprecated Experimental since 2026-09-23. Not scheduled for removal; the API may change in any release. */
  unstable_onRecordToolInteraction?:
    | ((options: Unstable_RecordToolInteractionOptions) => void | Promise<void>)
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
  unstable_onRecordToolInteraction,
  onAddToolResult,
  onResumeToolCall,
}: PartResourceProps): ClientOutput<"part"> => {
  const state = useMemo(
    () => ({ ...part, status: status as MessagePartStatus }),
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
      void Promise.resolve()
        .then(() =>
          unstable_onRecordToolInteraction?.({
            messageId,
            toolCallId: part.toolCallId,
            interaction: createToolInteraction({
              type: "human-response",
              payload,
            }),
          }),
        )
        .catch(() => {});
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

      const options = resolveToolApprovalResponse(part.approval, response);
      try {
        return Promise.resolve(onRespondToToolApproval(options));
      } catch (error) {
        return Promise.reject(error);
      }
    },
    unstable_recordInteraction: async (
      input: Unstable_ToolInteractionInput,
    ) => {
      if (!unstable_onRecordToolInteraction)
        throw new Error(
          "Runtime does not support recording tool interactions.",
        );
      if (part.type !== "tool-call")
        throw new Error("Tried to record interaction on non-tool message part");

      await unstable_onRecordToolInteraction({
        messageId,
        toolCallId: part.toolCallId,
        interaction: createToolInteraction(input),
      });
    },
  };
};

const PartResource = resource(usePartResource);

const createSpeechController = (
  notify: (speech: SpeechState | undefined) => void,
) => {
  let session: { messageId: string; cancel: () => void } | undefined;
  let replacing = false;

  const clear = () => {
    const current = session;
    if (!current) return;
    session = undefined;
    try {
      current.cancel();
    } finally {
      if (!session) notify(undefined);
    }
  };

  return {
    speak: (
      adapter: SpeechSynthesisAdapter,
      message: ExternalThreadMessage,
    ) => {
      // A speak from inside the replaced utterance's cancel is superseded by
      // this one, which would otherwise leave it playing untracked.
      if (replacing) return;
      replacing = true;
      try {
        clear();
      } finally {
        replacing = false;
      }

      const utterance = adapter.speak(getThreadMessageText(message));
      let active = true;
      let unsub: (() => void) | undefined;
      unsub = utterance.subscribe(() => {
        if (!active) return;
        if (utterance.status.type === "ended") {
          active = false;
          unsub?.();
          session = undefined;
          notify(undefined);
        } else {
          notify({ messageId: message.id, status: utterance.status });
        }
      });

      if (utterance.status.type === "ended") {
        active = false;
        unsub();
        notify(undefined);
        return;
      }

      session = {
        messageId: message.id,
        cancel: () => {
          active = false;
          unsub!();
          utterance.cancel();
        },
      };
      notify({ messageId: message.id, status: utterance.status });
    },
    stop: () => {
      if (!session) throw new Error("No message is being spoken");
      clear();
    },
    stopMessage: (messageId: string) => {
      if (session?.messageId !== messageId)
        throw new Error("Message is not being spoken");
      clear();
    },
    dispose: clear,
  };
};

// External Thread Client
const useExternalThread = ({
  messages: messagesProp,
  isRunning = false,
  isLoading = false,
  hasEarlier: hasEarlierProp = false,
  onLoadEarlier,
  state: threadState,
  extras,
  isSendDisabled = false,
  onNew,
  onEdit,
  onReload,
  onStartRun,
  onCancel,
  onResume,
  canResume = false,
  onRefetchThread,
  onAddToolResult,
  onResumeToolCall,
  unstable_onRecordToolInteraction,
  onLoadExternalState,
  attachmentAdapter,
  feedbackAdapter,
  speechAdapter,
  queue,
  branches,
  onRespondToToolApproval,
}: ExternalThreadProps): ClientOutput<"thread"> => {
  const clientRef = useOptionalAssistantClientRef();
  const emit = useOptionalAssistantEmit();

  useOptionalAssistantScopeEffect(
    "modelContext",
    () => {
      const modelContext = clientRef?.current?.modelContext;
      if (!modelContext || modelContext.source == null) return;

      return modelContext().subscribe?.(() => {
        emit("thread.modelContextUpdate", {
          threadId: getEventThreadId(clientRef?.current),
        });
      });
    },
    [clientRef, emit],
  );

  const messages = useMemo(
    () =>
      dedupeMessagesById(messagesProp, (id) =>
        console.warn(
          `ExternalThread: duplicate message id "${id}" in the provided messages array; keeping the last occurrence.`,
        ),
      ),
    [messagesProp],
  );

  const hasEarlier = hasEarlierProp && !!onLoadEarlier;
  const loadingEarlier = useMemo(() => new LoadEarlier(), []);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const loadEarlier = useCallback((): Promise<void> => {
    return loadingEarlier.load(
      hasEarlier ? onLoadEarlier : undefined,
      (error) => {
        console.error(
          "[ExternalThread] onLoadEarlier callback rejected",
          error,
        );
      },
      setIsLoadingEarlier,
    );
  }, [hasEarlier, onLoadEarlier, loadingEarlier]);

  // Local entries are optimistic: they apply only while the message's
  // external submittedFeedback still equals the value seen at click time.
  const [submittedFeedback, setSubmittedFeedback] = useState<
    Record<
      string,
      {
        feedback: { type: "positive" | "negative"; comment?: string };
        external:
          | {
              readonly type: "positive" | "negative";
              readonly comment?: string;
            }
          | undefined;
      }
    >
  >({});

  const feedbackFor = (msg: ExternalThreadMessage) => {
    const entry = submittedFeedback[msg.id];
    const external = msg.metadata.submittedFeedback;
    return entry &&
      external?.type === entry.external?.type &&
      external?.comment === entry.external?.comment
      ? entry.feedback
      : undefined;
  };

  // `messages` changes identity on every streamed token, and this body fans out
  // to one client per message, so pruning during render would re-run the whole
  // fan-out per token. The effect bails out on an unchanged map instead.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubmittedFeedback((prev) => {
      const live = Object.entries(prev).filter(([id, entry]) => {
        const msg = messages.find((m) => m.id === id);
        return (
          !!msg &&
          msg.metadata.submittedFeedback?.type === entry.external?.type &&
          msg.metadata.submittedFeedback?.comment === entry.external?.comment
        );
      });
      return live.length === Object.keys(prev).length
        ? prev
        : Object.fromEntries(live);
    });
  }, [messages]);

  const handleSubmitFeedback = (
    message: ExternalThreadMessage,
    feedback: { type: "positive" | "negative"; comment?: string },
  ) => {
    const comment = feedback.comment?.trim();
    const submittedFeedback = {
      type: feedback.type,
      ...(comment ? { comment } : undefined),
    };
    feedbackAdapter?.submit({ message, ...submittedFeedback });

    if (message.role === "assistant") {
      setSubmittedFeedback((prev) => ({
        ...prev,
        [message.id]: {
          feedback: submittedFeedback,
          external: message.metadata.submittedFeedback,
        },
      }));
    }
  };

  const [speechState, setSpeech] = useState<SpeechState | undefined>(undefined);
  const [speechController] = useState(() => createSpeechController(setSpeech));

  const hasSpeechAdapter = !!speechAdapter;
  const speech = hasSpeechAdapter ? speechState : undefined;
  useEffect(() => {
    if (!hasSpeechAdapter) speechController.dispose();
  }, [hasSpeechAdapter, speechController]);

  useEffect(() => () => speechController.dispose(), [speechController]);

  const handleSpeak = (message: ExternalThreadMessage) => {
    if (!speechAdapter) throw new Error("Speech adapter not configured");
    speechController.speak(speechAdapter, message);
  };

  const handleReload = (messageId: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    const parentId = messageIndex > 0 ? messages[messageIndex - 1]!.id : null;
    onReload?.(parentId);
  };

  const messageKeys = useMemo(
    () => messages.map((message) => `${message.id}|${message.role}`),
    [messages],
  );

  const handleCancelRun = () => {
    // Nothing is aborted without a handler, so pausing the queue would hold
    // the pending items against a run that keeps going.
    if (!onCancel) return;

    // Before the run is aborted, so the settle it produces keeps the pending
    // items instead of dispatching the next one at the moment the user
    // stopped.
    queue?.__internal_notifyCancelled?.();
    onCancel();
  };

  const handleSendNew = (message: AppendMessage) => {
    // The composer does not know the thread; stamp the current head as the
    // parent (legacy composer parity).
    onNew?.({ ...message, parentId: messages.at(-1)?.id ?? null });
  };

  const headId = messages.at(-1)?.id ?? null;
  const hasCancel = !!onCancel;
  const hasRefetchThread = !!onRefetchThread;
  const composerQueue = useMemo(
    (): ExternalThreadQueueAdapter | undefined =>
      queue && {
        ...queue,
        enqueue: (message) =>
          queue.enqueue({ ...message, parentId: message.parentId ?? headId }),
        steer: (message) =>
          queue.steer({ ...message, parentId: message.parentId ?? headId }),
      },
    [queue, headId],
  );

  const composerClient = useClientResource(
    ComposerClientResource({
      type: "thread",
      canCancel: isRunning && hasCancel,
      isRunning,
      isSendDisabled,
      onCancel: handleCancelRun,
      onSend: handleSendNew,
      queue: composerQueue,
      attachmentAdapter,
      messageKeys,
    }),
  );
  const captureCleanupOwner = (
    composerClient.methods as typeof composerClient.methods & {
      captureCleanupOwner: () => CleanupOwner;
    }
  ).captureCleanupOwner;
  const submission = composerClient.state.submission;
  const inTransit = composerClient.state.inTransit;
  // Messages the composer sent that the host does not show yet render after
  // the thread's own, oldest first, so a send never leaves the conversation.
  const pending = useMemo(
    () => [...(inTransit ?? []), ...(submission ? [submission] : [])],
    [inTransit, submission],
  );
  const hasPending = pending.length > 0;
  const messageClients = useClientLookup(
    messages.map((msg, index) => {
      const props: MessageClientProps = {
        message: msg,
        index,
        isLast: index === messages.length - 1 && !hasPending,
        parentId: index > 0 ? messages[index - 1]!.id : null,
        onReload: () => handleReload(msg.id),
        queue,
        branches,
        onRespondToToolApproval,
        unstable_onRecordToolInteraction,
        onAddToolResult,
        onResumeToolCall,
        attachmentAdapter,
        captureCleanupOwner,
        submittedFeedback: feedbackFor(msg),
        onSubmitFeedback: (feedback) => handleSubmitFeedback(msg, feedback),
        speech: speech?.messageId === msg.id ? speech : undefined,
        onSpeak: () => handleSpeak(msg),
        onStopSpeaking: () => speechController.stopMessage(msg.id),
      };
      if (onEdit) props.onEdit = onEdit;
      return withKey(msg.id, MessageClient(props));
    }),
  );

  const pendingMessages = useMemo(
    () => pending.map(submissionThreadMessage),
    [pending],
  );
  const pendingClients = useClientLookup(
    pending.map((row, index) =>
      withKey(
        row.id,
        ThreadMessageClient({
          message: pendingMessages[index]!,
          submission: row,
          index: messages.length + index,
          isLast: index === pending.length - 1,
        }),
        [pendingMessages[index], row, messages.length, index, pending.length],
      ),
    ),
  );

  const taskDeriver = useMemo(() => createTaskDeriver(), []);
  const tasks = useMemo(() => taskDeriver(messages), [taskDeriver, messages]);
  const taskClients = useClientLookup(
    tasks.map((task) =>
      withKey(getTaskKey(task), TaskClient({ task }), [task]),
    ),
  );

  const suggestionsClient = useClientResource(
    ThreadSuggestions(EMPTY_SUGGESTIONS),
  );

  const hasQueue = !!queue;
  const hasBranches = !!branches;
  const hasEdit = !!onEdit;
  const hasReload = !!onReload;
  const hasResume = !!onResume;
  const resumePendingRef = useRef<Promise<void> | null>(null);
  const [resumePending, setResumePending] = useState(false);
  const hasAttachments = !!attachmentAdapter;
  const hasFeedback = !!feedbackAdapter;
  const hasSpeech = !!speechAdapter;
  const hasAnswerToolCall =
    !!onAddToolResult || !!onResumeToolCall || !!onRespondToToolApproval;
  const state = useMemo(() => {
    const messageStates =
      pendingClients.state.length === 0
        ? messageClients.state
        : [...messageClients.state, ...pendingClients.state];

    return {
      isEmpty: messageStates.length === 0 && !isLoading,
      isDisabled: false,
      isSendDisabled,
      isLoading,
      hasEarlier,
      isLoadingEarlier,
      isRunning,
      canResume:
        canResume && hasResume && !isRunning && !isLoading && !resumePending,
      capabilities: {
        edit: hasEdit,
        delete: false,
        reload: hasReload,
        refetchThread: hasRefetchThread,
        cancel: hasCancel,
        speech: hasSpeech,
        attachments: hasAttachments,
        feedback: hasFeedback,
        voice: false,
        switchToBranch: hasBranches,
        switchBranchDuringRun: false,
        unstable_copy: false,
        dictation: false,
        queue: hasQueue,
        answerToolCall: hasAnswerToolCall,
      },
      messages: messageStates,
      tasks,
      state: threadState ?? {},
      suggestions: EMPTY_SUGGESTIONS,
      extras,
      speech,
      voice: undefined,
      composer: composerClient.state,
    };
  }, [
    isRunning,
    isSendDisabled,
    isLoading,
    canResume,
    resumePending,
    hasResume,
    hasEarlier,
    isLoadingEarlier,
    threadState,
    extras,
    hasQueue,
    hasBranches,
    hasEdit,
    hasReload,
    hasCancel,
    hasRefetchThread,
    hasAttachments,
    hasFeedback,
    hasSpeech,
    hasAnswerToolCall,
    speech,
    messageClients.state,
    pendingClients.state,
    composerClient.state,
    tasks,
  ]);

  return {
    getState: () => state,
    composer: () => composerClient.methods,
    suggestions: () => suggestionsClient.methods,
    task: (selector) => {
      if ("id" in selector) {
        const task = tasks.find((candidate) => candidate.id === selector.id);
        return taskClients.get({ key: task ? getTaskKey(task) : selector.id });
      }
      return taskClients.get(selector);
    },
    append: (message) => {
      const appendMessage = toAppendMessage(messages, message);
      if (queue) {
        queue.enqueue(appendMessage);
      } else {
        onNew?.(appendMessage);
      }
    },
    deleteMessage: () => {},
    startRun: () => {
      onStartRun?.();
    },
    resumeRun: (config: CreateResumeRunConfig) => {
      if (!onResume)
        throw new Error(
          "Runtime does not support resuming runs (onResume is not set).",
        );
      if (resumePendingRef.current) return resumePendingRef.current;
      if (!canResume) return onResume(config);
      let start!: () => void;
      const pending = new Promise<void>((resolve, reject) => {
        start = () => {
          try {
            resolve(onResume(config));
          } catch (error) {
            reject(error);
          }
        };
      }).finally(() => {
        resumePendingRef.current = null;
        setResumePending(false);
      });
      resumePendingRef.current = pending;
      setResumePending(true);
      start();
      return pending;
    },
    cancelRun: handleCancelRun,
    loadEarlier,
    ...(onRefetchThread && { unstable_refetchThread: onRefetchThread }),
    importExternalState: (state: unknown) => {
      if (!onLoadExternalState)
        throw new Error(
          "Runtime does not support importing external states (onLoadExternalState is not set).",
        );
      onLoadExternalState(state);
    },
    getModelContext: () => {
      const modelContext = clientRef?.current?.modelContext;
      return modelContext?.source != null
        ? modelContext().getModelContext()
        : { tools: {}, config: {} };
    },
    export: () => ({ messages: [] }),
    import: () => {},
    reset: () => {},
    message: (selector) => {
      if ("id" in selector) {
        if (pending.some((row) => row.id === selector.id))
          return pendingClients.get({ key: selector.id });
        return messageClients.get({ key: selector.id });
      }
      if (selector.index >= messageClients.state.length)
        return pendingClients.get({
          index: selector.index - messageClients.state.length,
        });
      return messageClients.get(selector);
    },
    stopSpeaking: speechController.stop,
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
    scopes.suggestions = Derived({
      source: "thread",
      query: {},
      get: (aui) => aui.thread.suggestions(),
    });
  }
});
