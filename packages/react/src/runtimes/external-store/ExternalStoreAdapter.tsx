import { AppendMessage, ThreadMessage } from "../../types";
import { AttachmentAdapter } from "../attachment";
import {
  AddToolResultOptions,
  ThreadSuggestion,
} from "../core/ThreadRuntimeCore";
import { FeedbackAdapter } from "../feedback/FeedbackAdapter";
import { SpeechSynthesisAdapter } from "../speech/SpeechAdapterTypes";
import { ThreadManagerMetadata } from "../core/ThreadManagerRuntimeCore";
import { ThreadMessageLike } from "./ThreadMessageLike";

export type ExternalStoreThreadManagerAdapter = {
  threadId?: string | undefined;
  threads?: readonly ThreadManagerMetadata[] | undefined;
  archivedThreads?: readonly ThreadManagerMetadata[] | undefined;
  onSwitchToNewThread?: (() => Promise<void> | void) | undefined;
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
   * @deprecated Use `adapters.threadManager.threadId` instead. This will be removed in 0.6.0.
   */
  threadId?: string | undefined;

  /**
   * @deprecated Use `adapters.threadManager.onSwitchToThread` instead. This will be removed in 0.6.0.
   */
  onSwitchToThread?: ((threadId: string) => Promise<void> | void) | undefined;
  /**
   * @deprecated Use `adapters.threadManager.onSwitchToNewThread` instead. This will be removed in 0.6.0.
   */
  onSwitchToNewThread?: (() => Promise<void> | void) | undefined;

  isDisabled?: boolean | undefined;
  isRunning?: boolean | undefined;
  messages: T[];
  suggestions?: readonly ThreadSuggestion[] | undefined;
  extras?: unknown;

  setMessages?: ((messages: T[]) => void) | undefined;
  onNew: (message: AppendMessage) => Promise<void>;
  onEdit?: ((message: AppendMessage) => Promise<void>) | undefined;
  onReload?: ((parentId: string | null) => Promise<void>) | undefined;
  onCancel?: (() => Promise<void>) | undefined;
  onAddToolResult?:
    | ((options: AddToolResultOptions) => Promise<void> | void)
    | undefined;
  convertMessage?: ExternalStoreMessageConverter<T> | undefined;
  adapters?:
    | {
        attachments?: AttachmentAdapter | undefined;
        speech?: SpeechSynthesisAdapter | undefined;
        feedback?: FeedbackAdapter | undefined;
        threadManager?: ExternalStoreThreadManagerAdapter | undefined;
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
