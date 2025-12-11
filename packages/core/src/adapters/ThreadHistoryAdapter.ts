import type {
  ExportedMessageRepository,
  ExportedMessageRepositoryItem,
} from "../runtime/MessageRepository";
import type {
  ChatModelRunOptions,
  ChatModelRunResult,
} from "./ChatModelAdapter";

/**
 * Storage entry format for messages in persistent storage.
 */
export interface MessageStorageEntry<TPayload> {
  id: string;
  parent_id: string | null;
  format: string;
  content: TPayload;
}

/**
 * Item format for messages during processing.
 */
export interface MessageFormatItem<TMessage> {
  parentId: string | null;
  message: TMessage;
}

/**
 * Repository format for a collection of messages.
 */
export interface MessageFormatRepository<TMessage> {
  headId?: string | null;
  messages: MessageFormatItem<TMessage>[];
}

/**
 * Adapter for converting between message formats.
 */
export interface MessageFormatAdapter<TMessage, TStorageFormat> {
  format: string;
  encode(item: MessageFormatItem<TMessage>): TStorageFormat;
  decode(
    stored: MessageStorageEntry<TStorageFormat>,
  ): MessageFormatItem<TMessage>;
  getId(message: TMessage): string;
}

/**
 * Generic thread history adapter for custom message formats.
 */
export type GenericThreadHistoryAdapter<TMessage> = {
  load(): Promise<MessageFormatRepository<TMessage>>;
  append(item: MessageFormatItem<TMessage>): Promise<void>;
};

/**
 * Interface for persisting and loading thread history.
 *
 * ThreadHistoryAdapter enables saving conversation history to external storage
 * and resuming conversations from where they left off.
 */
export type ThreadHistoryAdapter = {
  /**
   * Loads the thread history from storage.
   *
   * @returns Promise resolving to the exported message repository
   */
  load(): Promise<ExportedMessageRepository & { unstable_resume?: boolean }>;

  /**
   * Resumes a conversation from a previous state.
   *
   * @param options - The chat model run options
   * @returns AsyncGenerator yielding chat results
   */
  resume?(
    options: ChatModelRunOptions,
  ): AsyncGenerator<ChatModelRunResult, void, unknown>;

  /**
   * Appends a new message to the thread history.
   *
   * @param item - The message item to append
   */
  append(item: ExportedMessageRepositoryItem): Promise<void>;

  /**
   * Creates a generic adapter with custom message format.
   *
   * @param formatAdapter - The format adapter for message conversion
   * @returns A generic thread history adapter
   */
  withFormat?<TMessage, TStorageFormat>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ): GenericThreadHistoryAdapter<TMessage>;
};
