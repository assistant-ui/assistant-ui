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
  StartRunConfig,
  ResumeRunConfig,
  ThreadSuggestion,
} from "../../runtime/interfaces/thread-runtime-core";
import type { ExportedMessageRepository } from "../../runtime/utils/message-repository";
import type { ReadonlyJSONValue } from "assistant-stream/utils";

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
  isDisabled?: boolean | undefined;
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
};

export type ExternalStoreAdapter<T = ThreadMessage> =
  ExternalStoreAdapterBase<T> &
    (T extends ThreadMessage
      ? object
      : ExternalStoreMessageConverterAdapter<T>);
