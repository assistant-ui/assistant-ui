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

export type ExternalStoreThreadData<TState extends "regular" | "archived"> = {
  status: TState;
  id: string;
  remoteId?: string | undefined;
  externalId?: string | undefined;
  title?: string | undefined;
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
  onArchive?: ((threadId: string) => Promise<void> | void) | undefined;
  onUnarchive?: ((threadId: string) => Promise<void> | void) | undefined;
  onDelete?: ((threadId: string) => Promise<void> | void) | undefined;
};

export type ExternalStoreMessageConverter<T> = (
  message: T,
  idx: number,
) => ThreadMessageLike;

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
  /**
   * IDs of messages that were present in a previous `messages` snapshot but
   * have been transient placeholders (e.g. an AI SDK `useChat` client-side
   * id that was replaced mid-stream by a server-provided id). On the next
   * sync, the runtime drops these ids from the in-memory message repository
   * instead of keeping them as sibling branches, so `BranchPicker` does not
   * inflate to `2/2` on turns the user never branched.
   *
   * Default sync behavior is additive: ids that disappear from `messages`
   * remain in the repository as branch siblings. Provide this set to opt
   * specific ids out of branch tracking. The set is consumed and not
   * persisted, so the adapter is responsible for re-emitting until the id
   * is no longer in the repository.
   */
  unstable_temporaryMessageIds?: ReadonlySet<string> | undefined;
  suggestions?: readonly ThreadSuggestion[] | undefined;
  state?: ReadonlyJSONValue | undefined;
  extras?: unknown;

  setMessages?: ((messages: readonly T[]) => void) | undefined;
  onImport?: ((messages: readonly ThreadMessage[]) => void) | undefined;
  onExportExternalState?: (() => any) | undefined;
  onLoadExternalState?: ((state: any) => void) | undefined;
  onNew: (message: AppendMessage) => Promise<void>;
  onEdit?: ((message: AppendMessage) => Promise<void>) | undefined;
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
