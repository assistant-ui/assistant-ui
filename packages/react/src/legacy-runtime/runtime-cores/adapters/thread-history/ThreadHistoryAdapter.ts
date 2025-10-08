import { ChatModelRunOptions, ChatModelRunResult } from "../../local";
import {
  ExportedMessageRepository,
  ExportedMessageRepositoryItem,
} from "../../utils/MessageRepository";
import {
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
} from "./MessageFormatAdapter";

export type GenericThreadHistoryAdapter<TMessage> = {
  load(): Promise<MessageFormatRepository<TMessage>>;
  append(item: MessageFormatItem<TMessage>): Promise<void>;
};

export type ThreadHistoryAdapter = {
  /**
   * Load all messages for the current thread. Return messages in order with parent references. Called when thread is opened or refreshed.
   */
  load(): Promise<ExportedMessageRepository & { unstable_resume?: boolean }>;

  /**
   * Optional. Resume an interrupted assistant response. Used for reconnecting to in-progress generations.
   */
  resume?(
    options: ChatModelRunOptions,
  ): AsyncGenerator<ChatModelRunResult, void, unknown>;

  /**
   * Save a new message to the thread. May be called before thread initialization - handle missing remoteId gracefully. Called after each message is added.
   */
  append(item: ExportedMessageRepositoryItem): Promise<void>;

  withFormat?<TMessage, TStorageFormat>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ): GenericThreadHistoryAdapter<TMessage>;
};
