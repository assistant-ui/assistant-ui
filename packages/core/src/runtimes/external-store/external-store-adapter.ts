import type { AppendMessage, ThreadMessage } from "../../types/message";
import type { ThreadMessageLike } from "../../runtime/utils/thread-message-like";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type {
  SpeechSynthesisAdapter,
  DictationAdapter,
} from "../../adapters/speech";
import type { RealtimeVoiceAdapter } from "../../adapters/voice";
import type { FeedbackAdapter } from "../../adapters/feedback";
import type {
  AddToolResultOptions,
  RespondToToolApprovalOptions,
  StartRunConfig,
  ResumeRunConfig,
  ThreadSuggestion,
} from "../../runtime/interfaces/thread-runtime-core";
import type { ExportedMessageRepository } from "../../runtime/utils/message-repository";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import type { ToolExecutionStatus } from "../tool-invocations/ToolInvocationTracker";
import type { ExternalThreadQueueAdapter } from "../../runtime/queue/external-thread-queue-adapter";

export type ExternalStoreThreadData<TState extends "regular" | "archived"> = {
  status: TState;
  id: string;
  remoteId?: string | undefined;
  externalId?: string | undefined;
  forkedFrom?:
    | {
        readonly threadId: string;
        readonly messageId?: string | undefined;
      }
    | undefined;
  title?: string | undefined;
  custom?: Record<string, unknown> | undefined;
};

export type ExternalStoreThreadListAdapter = {
  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  threadId?: string | undefined;
  isLoading?: boolean | undefined;
  threads?: readonly ExternalStoreThreadData<"regular">[] | undefined;
  archivedThreads?: readonly ExternalStoreThreadData<"archived">[] | undefined;
  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  onSwitchToNewThread?: (() => Promise<void> | void) | undefined;
  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  onSwitchToThread?: ((threadId: string) => Promise<void> | void) | undefined;
  onRename?: (
    threadId: string,
    newTitle: string,
  ) => (Promise<void> | void) | undefined;
  onUpdateCustom?:
    | ((
        threadId: string,
        custom: Record<string, unknown> | undefined,
      ) => Promise<void> | void)
    | undefined;
  onArchive?: ((threadId: string) => Promise<void> | void) | undefined;
  onUnarchive?: ((threadId: string) => Promise<void> | void) | undefined;
  onDelete?: ((threadId: string) => Promise<void> | void) | undefined;
  onFork?:
    | ((
        threadId: string,
        options?: { fromMessageId?: string | undefined },
      ) => Promise<{ threadId: string }> | { threadId: string })
    | undefined;
};

export type ExternalStoreMessageConverter<T> = (
  message: T,
  idx: number,
) => ThreadMessageLike;

/**
 * @deprecated This API is still under active development and might change without notice.
 */
export type ExternalStoreBranchChange = {
  headId: string | null;
  visibleMessageIds: readonly string[];
};

type ExternalStoreMessageConverterAdapter<T> = {
  convertMessage: ExternalStoreMessageConverter<T>;
};

type ExternalStoreAdapterBase<T> = {
  /**
   * Whether the entire thread is disabled. When `true`, the composer's input
   * is also disabled (the user cannot type, attach files, or submit). For a
   * narrower gate that keeps the input usable but blocks only sending, use
   * `isSendDisabled`.
   */
  isDisabled?: boolean | undefined;
  /**
   * Whether sending new messages is currently disabled. When `true`, the
   * thread composer's input remains usable but `send()` becomes a no-op
   * and the thread composer's `canSend` is `false`. Use this to gate
   * sending on external React state (e.g. while tool config is loading)
   * without disabling the input itself the way `isDisabled` does. Edit
   * composers (saving message edits) intentionally ignore this flag.
   */
  isSendDisabled?: boolean | undefined;
  /**
   * Whether the thread is running. When provided, this value flows directly
   * to `thread.isRunning`, letting the application keep the thread in a
   * running state even after the last assistant message has completed (for
   * example while non-message stream chunks like suggestions or metadata
   * updates are still arriving). When omitted, `thread.isRunning` falls back
   * to the last-message-status heuristic.
   */
  isRunning?: boolean | undefined;
  isLoading?: boolean | undefined;
  messages?: readonly T[];
  messageRepository?: ExportedMessageRepository;
  suggestions?: readonly ThreadSuggestion[] | undefined;
  state?: ReadonlyJSONValue | undefined;
  extras?: unknown;

  setMessages?: ((messages: readonly T[]) => void) | undefined;
  /**
   * Fires when the user explicitly switches branches via the runtime's
   * `switchToBranch` action (e.g. a BranchPicker click). It does not fire on
   * adapter resync, `append`, edit/regenerate, content-only updates, or while
   * the thread is running. Consecutive switches that resolve to the same
   * canonical head are de-duped.
   *
   * `headId` is the canonical (persisted) head of the now-visible branch —
   * optimistic/transient ids are never surfaced. `visibleMessageIds` lists the
   * visible path in order.
   *
   * This complements `setMessages` rather than replacing it: switching still
   * requires `setMessages`, and this callback does not on its own enable branch
   * switching.
   *
   * @deprecated This API is still under active development and might change without notice.
   */
  unstable_onBranchChange?:
    | ((event: ExternalStoreBranchChange) => void)
    | undefined;
  onImport?: ((messages: readonly ThreadMessage[]) => void) | undefined;
  onExportExternalState?: (() => any) | undefined;
  onLoadExternalState?: ((state: any) => void) | undefined;
  onNew: (message: AppendMessage) => Promise<void>;
  /** Opt in to message queuing. Typically produced by `createMessageQueue`. */
  queue?: ExternalThreadQueueAdapter | undefined;
  onEdit?: ((message: AppendMessage) => Promise<void>) | undefined;
  onDelete?: ((messageId: string) => Promise<void> | void) | undefined;
  onReload?: // TODO: remove parentId in 0.12.0
    | ((parentId: string | null, config: StartRunConfig) => Promise<void>)
    | undefined;
  onResume?: ((config: ResumeRunConfig) => Promise<void>) | undefined;
  onCancel?: (() => Promise<void>) | undefined;
  onAddToolResult?:
    | ((options: AddToolResultOptions) => Promise<void> | void)
    | undefined;
  onResumeToolCall?:
    | ((options: { toolCallId: string; payload: unknown }) => void)
    | undefined;
  onRespondToToolApproval?:
    | ((options: RespondToToolApprovalOptions) => Promise<void> | void)
    | undefined;
  convertMessage?: ExternalStoreMessageConverter<T> | undefined;
  adapters?:
    | {
        attachments?: AttachmentAdapter | undefined;
        speech?: SpeechSynthesisAdapter | undefined;
        dictation?: DictationAdapter | undefined;
        voice?: RealtimeVoiceAdapter | undefined;
        feedback?: FeedbackAdapter | undefined;
        /**
         * @deprecated This API is still under active development and might change without notice.
         */
        threadList?: ExternalStoreThreadListAdapter | undefined;
      }
    | undefined;
  unstable_capabilities?:
    | {
        copy?: boolean | undefined;
      }
    | undefined;
  /**
   * Opt in to the built-in client-side tool-invocations pipeline
   * (`streamCall` / `execute` / tool-status tracking) for this thread.
   *
   * Defaults to `false` — the runtime does *not* drive client-side tool
   * callbacks on its own. Set to `true` to have the runtime construct a
   * `ToolInvocationTracker` and feed every snapshot through it, so tool
   * callbacks fire automatically for tool-call parts in `messages`.
   *
   * Opt-in by default because most external-store runtimes either run
   * tools entirely server-side, or already wire their own client-side
   * dispatch path. Enabling the embedded tracker on top of an existing
   * dispatch path would cause tool callbacks to run twice.
   *
   * When enabled, client-side tool results (from `execute()` returning,
   * or from `streamCall` resolving) flow back through
   * `adapter.onAddToolResult` like any other tool result, with
   * `modelContent` populated when present.
   */
  unstable_enableToolInvocations?: boolean | undefined;
  /**
   * Receives the current per-tool-call execution status map whenever it
   * changes. Only invoked when `unstable_enableToolInvocations` is `true`
   * — the runtime maintains the map via the embedded tracker.
   *
   * Wire this into local React state and feed it into the converter's
   * `metadata.toolStatuses` so the UI can render `executing` spinners
   * and human-input prompts.
   */
  setToolStatuses?:
    | ((statuses: Record<string, ToolExecutionStatus>) => void)
    | undefined;
};

export type ExternalStoreAdapter<T = ThreadMessage> =
  ExternalStoreAdapterBase<T> &
    (T extends ThreadMessage
      ? object
      : ExternalStoreMessageConverterAdapter<T>);
