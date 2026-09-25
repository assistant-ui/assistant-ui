import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { resource, withKey } from "@assistant-ui/tap";
import type { ClientElement, ClientOutput } from "@assistant-ui/store";
import { useAssistantClientDestroySignal } from "@assistant-ui/store/internal";
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
  Attachment,
  CompleteAttachment,
  CreateAttachment,
} from "../../types/attachment";
import {
  isAttachmentComplete,
  isCreateAttachment,
} from "../../types/attachment";
import type {
  AddToolResultOptions,
  RespondToToolApprovalOptions,
  ResumeToolCallOptions,
  SpeechState,
  ThreadSuggestion,
  Unstable_RecordToolInteractionOptions,
} from "../../runtime/interfaces/thread-runtime-core";
import type { Unstable_ToolInteractionInput } from "../../types/message";
import type {
  ExternalThreadQueueAdapter,
  QueuePlacement,
} from "../../runtime/queue/external-thread-queue-adapter";
import type { ExternalThreadBranchAdapter } from "../../runtime/branch/external-thread-branch-adapter";
import type { ComposerSubmission } from "../../runtime/interfaces/composer-runtime-core";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type { FeedbackAdapter } from "../../adapters/feedback";
import type { SpeechSynthesisAdapter } from "../../adapters/speech";
import { ToolResponse } from "assistant-stream";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import type { QueueItemState } from "../scopes/queue-item";
import type { ComposerSendOptions } from "../scopes/composer";
import { fileMatchesAccept } from "../../adapters/attachment";
import { getThreadMessageText } from "../../utils/text";
import { resolveToolApprovalResponse } from "../../runtime/utils/resolveToolApprovalResponse";
import { createToolInteraction } from "../../runtime/utils/tool-interactions";
import {
  AttachmentAddOperations,
  drainAttachmentAdd,
} from "../../runtime/utils/attachment-add-operations";
import { AttachmentSendOperations } from "../../runtime/utils/attachment-send-operations";
import { ThreadMessageClient } from "./thread-message-client";
import { submissionThreadMessage } from "./submission-message";
import { toMessagePartStatus } from "../../utils/normalizePartStatus";
import { generateId } from "../../utils/id";
import { ModelContext } from "./model-context-client";
import { ThreadSuggestions } from "./suggestions";
import { createTaskDeriver, getTaskKey, TaskClient } from "./thread-tasks";
import { Tools } from "../../react/client/Tools";
import { DataRenderers } from "../../react/client/DataRenderers";
import { SingleThreadList } from "./single-thread-list";

const EMPTY_QUEUE_ITEMS: readonly QueueItemState[] = [];
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
  onResume?: (() => void | Promise<void>) | undefined;
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
  unstable_onRecordToolInteraction?:
    | ((options: Unstable_RecordToolInteractionOptions) => void | Promise<void>)
    | undefined;
  onAddToolResult?: ((options: AddToolResultOptions) => void) | undefined;
  onResumeToolCall?: ((options: ResumeToolCallOptions) => void) | undefined;
  attachmentAdapter?: AttachmentAdapter | undefined;
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
  submittedFeedback,
  onSubmitFeedback,
  speech,
  onSpeak,
  onStopSpeaking,
}: MessageClientProps): ClientOutput<"message"> => {
  const [isCopied, setIsCopied] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const partClients = useClientLookup(
    message.content.map((part, idx) =>
      withKey(
        idx,
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

const EMPTY_MESSAGE_KEYS: readonly string[] = Object.freeze([]);

type ComposerClientResourceProps = {
  type: "thread" | "edit";
  canCancel: boolean;
  isRunning?: boolean;
  isSendDisabled?: boolean;
  onCancel?: () => void;
  onBeginEdit?: () => void;
  onSend?: (message: AppendMessage) => void;
  message?: ExternalThreadMessage;
  queue?: ExternalThreadQueueAdapter | undefined;
  attachmentAdapter?: AttachmentAdapter | undefined;
  /** `id|role` of each thread message, used to tell when a send has landed. */
  messageKeys?: readonly string[] | undefined;
};

const useQueueItemClient = ({
  item,
  onMove,
  onRemove,
}: {
  item: QueueItemState;
  onMove: (placement: QueuePlacement) => void;
  onRemove: () => void;
}): ClientOutput<"queueItem"> => {
  return {
    getState: () => item,
    steer: () => onMove({ lane: "steer", insertAfter: null }),
    move: onMove,
    remove: onRemove,
  };
};

const QueueItemClient = resource(useQueueItemClient);

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

// A try/catch inside the resource makes the React Compiler bail out of the
// whole hook, so calls that can throw go through these module-scope helpers.
const removeAttachmentThroughAdapter = async (
  attachment: Attachment,
  attachmentAdapter: AttachmentAdapter | undefined,
  onError: (message: string) => void,
) => {
  try {
    await attachmentAdapter?.remove(attachment);
  } catch (error) {
    onError(error instanceof Error ? error.message : String(error));
    throw error;
  }
};

const dispatchSafely = (dispatch: () => void) => {
  try {
    dispatch();
    return undefined;
  } catch (error) {
    return { error };
  }
};

// A hidden thread keeps preparing its send, so only the owner's permanent
// teardown aborts it, never an effect cleanup.
const abortOnDestroy = (
  destroySignal: AbortSignal | undefined,
  controller: AbortController,
) => {
  if (!destroySignal) return () => {};
  const abort = () => controller.abort(destroySignal.reason);
  if (destroySignal.aborted) {
    abort();
    return () => {};
  }
  // A cancelled send can stay unsettled forever, so its abort unlinks too.
  const unlink = () => {
    destroySignal.removeEventListener("abort", abort);
    controller.signal.removeEventListener("abort", unlink);
  };
  destroySignal.addEventListener("abort", abort, { once: true });
  controller.signal.addEventListener("abort", unlink, { once: true });
  return unlink;
};

type InTransitEntry = {
  readonly submission: ComposerSubmission;
  /** `id|role` of each thread message when the submission was dispatched. */
  readonly known: ReadonlySet<string>;
};

const EMPTY_IN_TRANSIT: readonly InTransitEntry[] = Object.freeze([]);

// Composer Client - minimal implementation
const useComposerClientResource = ({
  type,
  canCancel,
  isRunning = false,
  isSendDisabled = false,
  onCancel,
  onBeginEdit,
  onSend,
  message,
  queue,
  attachmentAdapter,
  messageKeys = EMPTY_MESSAGE_KEYS,
}: ComposerClientResourceProps): ClientOutput<"composer"> => {
  const [isEditing, setIsEditing, isEditingRef] = useLiveState(
    type === "thread",
  );
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
  const attachmentAddOperations = useMemo(
    () => new AttachmentAddOperations(),
    [],
  );
  const attachmentSends = useMemo(() => new AttachmentSendOperations(), []);
  const destroySignal = useAssistantClientDestroySignal();
  const [submission, setSubmission, submissionRef] = useLiveState<
    ComposerSubmission | undefined
  >(undefined);
  const submissionSend = useRef<
    | {
        readonly options: ComposerSendOptions | undefined;
        readonly runConfig: Record<string, unknown>;
        readonly controller: AbortController;
      }
    | undefined
  >(undefined);
  const [inTransit, setInTransit] =
    useLiveState<readonly InTransitEntry[]>(EMPTY_IN_TRANSIT);
  const messageKeysRef = useRef(messageKeys);
  const sendGeneration = useRef(0);

  // A dispatched message stays on screen until the host shows it, so the two
  // never swap through an empty frame. Each new message of a send's role
  // stands in for the oldest send still waiting for one, and a shown send
  // leaves in the same render its message arrives in.
  const shown = useMemo(() => {
    const claimed = new Set<string>();
    const landed = new Set<InTransitEntry>();
    for (const entry of inTransit) {
      const key = messageKeys.find(
        (candidate) =>
          !entry.known.has(candidate) &&
          !claimed.has(candidate) &&
          candidate.endsWith(`|${entry.submission.role}`),
      );
      if (key === undefined) continue;
      claimed.add(key);
      landed.add(entry);
    }
    return { landed, claimed };
  }, [inTransit, messageKeys]);
  const inTransitSubmissions = useMemo(
    () =>
      inTransit
        .filter((entry) => !shown.landed.has(entry))
        .map((entry) => entry.submission),
    [inTransit, shown],
  );
  useEffect(() => {
    messageKeysRef.current = messageKeys;
    if (shown.landed.size === 0) return;
    // A message stands in for one send only, so the sends still waiting stop
    // counting it as new.
    setInTransit((prev) =>
      prev
        .filter((entry) => !shown.landed.has(entry))
        .map((entry) => ({
          ...entry,
          known: new Set([...entry.known, ...shown.claimed]),
        })),
    );
  }, [messageKeys, shown, setInTransit]);

  const updateFromMessage = () => {
    if (!message) return;
    const messageText = message.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n\n");
    setText(messageText);
    setRole(message.role);
    // Re-seeding from the message abandons any removal begun in a previous
    // edit session, so the restored objects must shed their removal marks.
    const restored = message.attachments ?? [];
    for (const attachment of restored)
      attachmentSends.unmarkRemoved(attachment);
    setAttachments(restored);
  };

  const handleRemoveAttachment = useCallback(
    async (attachment: Attachment) => {
      attachmentAddOperations.cancel(attachment.id);
      attachmentSends.markRemoved(attachment);
      if (!isAttachmentComplete(attachment)) {
        await removeAttachmentThroughAdapter(
          attachment,
          attachmentAdapter,
          (message) =>
            setAttachments((prev) =>
              prev.map((candidate) =>
                candidate.id === attachment.id &&
                !isAttachmentComplete(candidate)
                  ? attachmentSends.transfer(candidate, {
                      ...candidate,
                      status: { type: "incomplete", reason: "error", message },
                    })
                  : candidate,
              ),
            ),
        );
      }
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    },
    [
      attachmentAddOperations,
      attachmentAdapter,
      attachmentSends,
      setAttachments,
    ],
  );

  // A submission is not delivered yet, so its attachments stay reachable by id
  // and can still be taken out of the message that is being sent.
  const handleRemoveSubmittedAttachment = useCallback(
    async (attachment: Attachment) => {
      attachmentAddOperations.cancel(attachment.id);
      attachmentSends.markRemoved(attachment);
      if (!isAttachmentComplete(attachment)) {
        // An attachment whose removal failed stays out of the message it was
        // taken from and shows why, so the removal can be tried again.
        await removeAttachmentThroughAdapter(
          attachment,
          attachmentAdapter,
          (message) =>
            setSubmission((prev) =>
              prev
                ? {
                    ...prev,
                    attachments: prev.attachments.map((candidate) => {
                      if (
                        candidate.id !== attachment.id ||
                        isAttachmentComplete(candidate)
                      )
                        return candidate;
                      const failed = attachmentSends.transfer(candidate, {
                        ...candidate,
                        status: {
                          type: "incomplete",
                          reason: "error",
                          message,
                        },
                      });
                      attachmentSends.markRemoved(failed);
                      return failed;
                    }),
                  }
                : prev,
            ),
        );
      }
      setSubmission((prev) =>
        prev
          ? {
              ...prev,
              attachments: prev.attachments.filter(
                (a) => a.id !== attachment.id,
              ),
            }
          : prev,
      );
    },
    [
      attachmentAddOperations,
      attachmentAdapter,
      attachmentSends,
      setSubmission,
    ],
  );

  const attachmentClients = useClientLookup(
    attachments.map((attachment) =>
      withKey(
        attachment.id,
        AttachmentResource({
          attachment,
          onRemove: () => handleRemoveAttachment(attachment),
        }),
      ),
    ),
  );

  const submittedAttachmentClients = useClientLookup(
    (submission?.attachments ?? [])
      .filter((attachment) => !attachments.some((a) => a.id === attachment.id))
      .map((attachment) =>
        withKey(
          attachment.id,
          AttachmentResource({
            attachment,
            onRemove: () => handleRemoveSubmittedAttachment(attachment),
          }),
        ),
      ),
  );

  const removePendingAttachments = async (removed: readonly Attachment[]) => {
    if (!attachmentAdapter) return;
    await Promise.all(
      removed
        .filter((a) => a.status.type !== "complete")
        .map(async (a) => attachmentAdapter.remove(a)),
    );
  };

  const upsertAttachment = (attachment: Attachment) => {
    const current = submissionRef.current;
    if (current?.attachments.some((a) => a.id === attachment.id)) {
      setSubmission({
        ...current,
        attachments: current.attachments.map((a) =>
          a.id === attachment.id ? attachmentSends.transfer(a, attachment) : a,
        ),
      });
      return;
    }
    setAttachments((prev) => {
      const idx = prev.findIndex((a) => a.id === attachment.id);
      if (idx === -1) return [...prev, attachment];
      const next = [...prev];
      next[idx] = attachment;
      return next;
    });
  };

  const steerItems = queue?.steerItems ?? EMPTY_QUEUE_ITEMS;
  const laneItems = queue?.items ?? EMPTY_QUEUE_ITEMS;
  const queueItems = useMemo(
    () =>
      steerItems.length === 0
        ? laneItems
        : laneItems.length === 0
          ? steerItems
          : [...steerItems, ...laneItems],
    [steerItems, laneItems],
  );
  const queueItemClients = useClientLookup(
    queueItems.map((item) =>
      withKey(
        item.id,
        QueueItemClient({
          item,
          onMove: (placement) => queue?.move(item.id, placement),
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
      canCancel: canCancel || submission !== undefined,
      canSend:
        isEditing && !isEmpty && !isSendDisabled && submission === undefined,
      attachmentAccept: attachmentAdapter?.accept ?? "*",
      isEmpty,
      type,
      dictation: undefined,
      quote,
      queue: queueItems,
      submission,
      inTransit: inTransitSubmissions,
    };
  }, [
    text,
    role,
    attachmentClients.state,
    runConfig,
    isEditing,
    canCancel,
    isSendDisabled,
    submission,
    inTransitSubmissions,
    type,
    attachments.length,
    quote,
    queueItems,
    attachmentAdapter?.accept,
  ]);

  /** Ends the send being prepared, so nothing it started can dispatch it. */
  const endSubmission = () => {
    sendGeneration.current++;
    submissionSend.current = undefined;
    setSubmission(undefined);
  };

  // Takes a send's content back into the draft, ahead of anything written
  // since. An edit composer kept its draft, so it only takes back the state
  // the attachments came back in, such as the reason one failed.
  const returnToDraft = (content: ComposerSubmission) => {
    if (type !== "thread") {
      const returned = new Map(
        content.attachments.map((attachment) => [attachment.id, attachment]),
      );
      setAttachments((prev) =>
        prev.map((attachment) => returned.get(attachment.id) ?? attachment),
      );
      return;
    }
    const kept = content.attachments.filter(
      (attachment) => !attachmentSends.isRemoved(attachment),
    );
    setAttachments((prev) => [...kept, ...prev]);
    setText((prev) => [content.text, prev].filter(Boolean).join("\n"));
    setQuote((prev) => prev ?? content.quote);
  };

  const cancelSubmission = () => {
    const current = submissionRef.current;
    if (!current) return;
    submissionSend.current?.controller.abort();
    endSubmission();
    returnToDraft(current);
  };

  const discardSubmission = async () => {
    const current = submissionRef.current;
    if (!current) return;
    submissionSend.current?.controller.abort();
    endSubmission();
    // An attachment the draft still holds is removed along with the draft.
    const drafted = new Set(attachmentsRef.current.map((a) => a.id));
    await removePendingAttachments(
      current.attachments.filter((attachment) => !drafted.has(attachment.id)),
    );
  };

  const returnSubmissionToDraft = (
    sent: readonly Attachment[],
    settled: readonly PromiseSettledResult<CompleteAttachment>[],
    reason: unknown,
  ) => {
    const current = submissionRef.current;
    if (!current) return;
    const failures = new Map<string, unknown>();
    settled.forEach((result, index) => {
      if (result.status === "rejected")
        failures.set(sent[index]!.id, result.reason);
    });
    // Each attachment that could not be prepared carries its own reason, so
    // the draft it returns to shows which file needs another try.
    const attachments = current.attachments.map((attachment) => {
      if (!failures.has(attachment.id) || isAttachmentComplete(attachment))
        return attachment;
      const failure = failures.get(attachment.id);
      return attachmentSends.transfer(attachment, {
        ...attachment,
        status: {
          type: "incomplete",
          reason: "error",
          message: failure instanceof Error ? failure.message : String(failure),
        },
      });
    });
    endSubmission();
    returnToDraft({ ...current, attachments });
    console.error("Failed to send attachments", reason);
  };

  const dispatchMessage = (
    current: ComposerSubmission,
    attachments: readonly CompleteAttachment[],
    context: {
      readonly options: ComposerSendOptions | undefined;
      readonly runConfig: Record<string, unknown>;
    },
    isSubmission: boolean,
  ) => {
    const composedMessage: AppendMessage = {
      role: current.role,
      content: current.text
        ? [{ type: "text" as const, text: current.text }]
        : [],
      attachments,
      createdAt: new Date(),
      parentId: null,
      sourceId: null,
      runConfig: context.runConfig,
      startRun: context.options?.startRun,
      metadata: {
        custom: { ...(current.quote ? { quote: current.quote } : {}) },
      },
    };
    const sent: ComposerSubmission = { ...current, attachments };
    // edit sends carry a sourceId contract; only thread sends queue
    const queued = queue && type === "thread";
    if (isSubmission) {
      submissionSend.current = undefined;
      setSubmission(undefined);
    }
    // An edit keeps its draft, whose copies of these attachments are the
    // delivered ones now, so clearing that draft must not remove their uploads.
    if (isSubmission && type !== "thread") {
      const delivered = new Map(
        attachments.map((attachment) => [attachment.id, attachment]),
      );
      setAttachments((prev) =>
        prev.map((attachment) => delivered.get(attachment.id) ?? attachment),
      );
    }
    // A queued message has its own place in the UI, so only a thread send
    // stays in transit until the host shows it.
    const entry: InTransitEntry | undefined =
      isSubmission && type === "thread" && !queued
        ? { submission: sent, known: new Set(messageKeysRef.current) }
        : undefined;
    if (entry) setInTransit((prev) => [...prev, entry]);

    const failure = dispatchSafely(() => {
      if (queued) {
        if (context.options?.steer ?? isRunning) queue.steer(composedMessage);
        else queue.enqueue(composedMessage);
      } else {
        onSend?.(composedMessage);
      }
    });
    if (failure) {
      console.error("[assistant-ui] Failed to send the message", failure.error);
      if (entry)
        setInTransit((prev) => prev.filter((candidate) => candidate !== entry));
      returnToDraft(sent);
      return;
    }
    if (type === "edit") {
      attachmentAddOperations.cancelAll();
      setIsEditing(false);
    }
  };

  const prepareSubmission = async (generation: number) => {
    const context = submissionSend.current;
    if (!context) return;
    const { signal } = context.controller;
    if (signal.aborted) return;

    const uploads = (submissionRef.current?.attachments ?? []).flatMap(
      (attachment) => {
        const upload = attachmentAddOperations.whenSendable(attachment.id);
        return upload ? [upload] : [];
      },
    );
    if (uploads.length > 0) {
      // An attachment still uploading in `add()` cannot be finalized yet, so
      // the submission waits for its latest state.
      await Promise.all(uploads);
      if (generation !== sendGeneration.current || signal.aborted) return;
    }

    const current = submissionRef.current;
    if (!current) return;
    const sent = current.attachments.filter(
      (attachment) => !attachmentSends.isRemoved(attachment),
    );
    for (const attachment of sent)
      attachmentAddOperations.cancel(attachment.id);

    const settled = await Promise.allSettled(
      sent.map((attachment) =>
        attachmentSends.send(attachment, attachmentAdapter, signal),
      ),
    );
    if (generation !== sendGeneration.current || signal.aborted) return;

    const rejection = settled.find((result) => result.status === "rejected");
    if (rejection) {
      returnSubmissionToDraft(sent, settled, rejection.reason);
      return;
    }

    // An attachment removed mid-upload can't be cancelled, but it can still be
    // dropped from the outgoing message instead of silently being sent anyway.
    const finalAttachments = settled.flatMap((result, index) =>
      attachmentSends.isRemoved(sent[index]!) || result.status === "rejected"
        ? []
        : [result.value],
    );
    dispatchMessage(
      submissionRef.current ?? current,
      finalAttachments,
      context,
      true,
    );
  };

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
        const operation = attachmentAddOperations.start();
        try {
          await drainAttachmentAdd(
            attachmentAdapter.add({ file: fileOrAttachment }),
            (attachment) => {
              if (!attachmentAddOperations.accept(operation, attachment))
                return false;
              upsertAttachment(attachment);
              return true;
            },
          );
          attachmentAddOperations.finish(operation);
        } catch (error) {
          attachmentAddOperations.finish(operation);
          if (!attachmentAddOperations.isCancelled(operation)) throw error;
        }
      } else if (!isCreateAttachment(fileOrAttachment)) {
        const newAttachment: Attachment = {
          id: generateId(),
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
          id: fileOrAttachment.id ?? generateId(),
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
      attachmentAddOperations.cancelAll();
      const removed = attachmentsRef.current;
      if (submissionRef.current) {
        for (const attachment of removed)
          attachmentSends.markRemoved(attachment);
      }
      setAttachments([]);
      await removePendingAttachments(removed);
    },
    attachment: (selector) => {
      if ("id" in selector) {
        const submitted = submission?.attachments.some(
          (attachment) => attachment.id === selector.id,
        );
        const inDraft = attachments.some(
          (attachment) => attachment.id === selector.id,
        );
        if (submitted && !inDraft)
          return submittedAttachmentClients.get({ key: selector.id });
        return attachmentClients.get({ key: selector.id });
      }
      return attachmentClients.get(selector);
    },
    reset: async () => {
      attachmentAddOperations.cancelAll();
      sendGeneration.current++;
      const discarded = discardSubmission();
      const removed = attachmentsRef.current;
      setText("");
      setRole("user");
      setRunConfig({});
      setAttachments([]);
      setQuote(undefined);
      await Promise.all([removePendingAttachments(removed), discarded]);
    },
    send: (opts?: ComposerSendOptions) => {
      // An attachment whose removal is still awaiting the adapter is excluded
      // up front, or a send started mid-removal would upload and dispatch it.
      const currentAttachments = attachmentsRef.current.filter(
        (attachment) => !attachmentSends.isRemoved(attachment),
      );
      const isEmpty = !textRef.current.trim() && !currentAttachments.length;
      if (!isEditingRef.current) throw new Error("Composer is not available");
      if (isEmpty || isSendDisabled || submissionRef.current) return;

      const submitted: ComposerSubmission = {
        id: generateId(),
        role: roleRef.current,
        text: textRef.current,
        quote: quoteRef.current,
        attachments: currentAttachments,
      };
      const context = { options: opts, runConfig: runConfigRef.current };
      // Only a send whose attachments still need the adapter becomes a
      // submission; one with nothing left to prepare goes out right away, as
      // it always has, and never shows up as a row of its own.
      const complete = currentAttachments.filter(isAttachmentComplete);
      const ready = complete.length === currentAttachments.length;
      const controller = ready ? undefined : new AbortController();
      if (controller) {
        submissionSend.current = { ...context, controller };
        setSubmission(submitted);
      }
      if (type === "thread") {
        const detached = new Set(currentAttachments);
        setAttachments((prev) =>
          prev.filter((attachment) => !detached.has(attachment)),
        );
        setText("");
        setQuote(undefined);
      }
      const generation = ++sendGeneration.current;
      if (!controller) {
        dispatchMessage(submitted, complete, context, false);
        return;
      }
      const release = abortOnDestroy(destroySignal, controller);
      void prepareSubmission(generation).finally(release);
    },
    cancel: () => {
      // Stopping takes a send still being prepared back into the draft and
      // still stops a run that is going, so the one control never loses either.
      if (type === "thread" && submissionRef.current) {
        cancelSubmission();
        if (canCancel) onCancel?.();
        return;
      }
      // An edit session ends here, so its in-flight adapter adds must not
      // land in a later session; the thread composer's cancel stops the run
      // and leaves the draft (and its pending adds) alone.
      if (type === "edit") {
        attachmentAddOperations.cancelAll();
        sendGeneration.current++;
        void discardSubmission();
        const removed = attachmentsRef.current;
        setAttachments([]);
        removePendingAttachments(removed).catch((error) => {
          console.error("Failed to remove cancelled edit attachments", error);
        });
      }
      onCancel?.();
      if (type === "edit") setIsEditing(false);
    },
    beginEdit: () => {
      onBeginEdit?.();
      if (type === "thread") return;
      if (isEditingRef.current) throw new Error("Edit already in progress");
      setIsEditing(true);
      updateFromMessage();
    },
    startDictation: () => {},
    stopDictation: () => {},
    setQuote,
    queueItem: (selector: { index: number } | { id: string }) => {
      if ("id" in selector) {
        return queueItemClients.get({ key: selector.id });
      }
      return queueItemClients.get(selector);
    },
  };
};

const ComposerClientResource = resource(useComposerClientResource);

const createSpeechController = (
  notify: (speech: SpeechState | undefined) => void,
) => {
  let session: { messageId: string; cancel: () => void } | undefined;

  const clear = () => {
    if (!session) return;
    session.cancel();
    session = undefined;
    notify(undefined);
  };

  return {
    speak: (
      adapter: SpeechSynthesisAdapter,
      message: ExternalThreadMessage,
    ) => {
      clear();

      const utterance = adapter.speak(getThreadMessageText(message));
      let unsub: (() => void) | undefined;
      unsub = utterance.subscribe(() => {
        if (utterance.status.type === "ended") {
          unsub?.();
          session = undefined;
          notify(undefined);
        } else {
          notify({ messageId: message.id, status: utterance.status });
        }
      });

      if (utterance.status.type === "ended") {
        unsub();
        notify(undefined);
        return;
      }

      session = {
        messageId: message.id,
        cancel: () => {
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
  const messages = useMemo(
    () => dedupeMessagesById(messagesProp),
    [messagesProp],
  );

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
  const state = useMemo(() => {
    const messageStates =
      pendingClients.state.length === 0
        ? messageClients.state
        : [...messageClients.state, ...pendingClients.state];

    return {
      isEmpty: messageStates.length === 0 && !isLoading,
      isDisabled: false,
      isLoading,
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
    isLoading,
    canResume,
    resumePending,
    hasResume,
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
              parentId:
                message.parentId === undefined
                  ? (messages.at(-1)?.id ?? null)
                  : message.parentId,
              sourceId: message.sourceId ?? null,
              role: message.role ?? "user",
              content: message.content,
              attachments: message.attachments ?? [],
              metadata: message.metadata ?? { custom: {} },
              runConfig: message.runConfig ?? {},
              startRun: message.startRun,
            };
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
    resumeRun: () => {
      if (!onResume)
        throw new Error(
          "Runtime does not support resuming runs (onResume is not set).",
        );
      if (resumePendingRef.current) return resumePendingRef.current;
      const pending = Promise.resolve()
        .then(onResume)
        .finally(() => {
          resumePendingRef.current = null;
          setResumePending(false);
        });
      resumePendingRef.current = pending;
      setResumePending(true);
      return pending;
    },
    cancelRun: handleCancelRun,
    ...(onRefetchThread && { unstable_refetchThread: onRefetchThread }),
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
