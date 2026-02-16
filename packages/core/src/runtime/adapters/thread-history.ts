import type {
  ChatModelRunOptions,
  ChatModelRunResult,
} from "../shared/chat-model-adapter";
import type {
  ExportedMessageRepository,
  ExportedMessageRepositoryItem,
} from "../shared/message-repository";

// =============================================================================
// Message Format Adapter
// =============================================================================

export interface MessageStorageEntry<TPayload> {
  id: string;
  parent_id: string | null;
  format: string;
  content: TPayload;
}

export interface MessageFormatItem<TMessage> {
  parentId: string | null;
  message: TMessage;
}

export interface MessageFormatRepository<TMessage> {
  headId?: string | null;
  messages: MessageFormatItem<TMessage>[];
}

export interface MessageFormatAdapter<
  TMessage,
  TStorageFormat extends Record<string, unknown>,
> {
  format: string;
  encode(item: MessageFormatItem<TMessage>): TStorageFormat;
  decode(
    stored: MessageStorageEntry<TStorageFormat>,
  ): MessageFormatItem<TMessage>;
  getId(message: TMessage): string;
}

// =============================================================================
// Thread History Adapter
// =============================================================================

export type GenericThreadHistoryAdapter<TMessage> = {
  load(): Promise<MessageFormatRepository<TMessage>>;
  append(item: MessageFormatItem<TMessage>): Promise<void>;
  update?(
    item: MessageFormatItem<TMessage>,
    localMessageId: string,
  ): Promise<void>;
  reportTelemetry?(
    items: MessageFormatItem<TMessage>[],
    options?: {
      durationMs?: number;
      stepTimestamps?: { start_ms: number; end_ms: number }[];
    },
  ): void;
};

export type ThreadHistoryAdapter = {
  load(): Promise<ExportedMessageRepository & { unstable_resume?: boolean }>;
  resume?(
    options: ChatModelRunOptions,
  ): AsyncGenerator<ChatModelRunResult, void, unknown>;
  append(item: ExportedMessageRepositoryItem): Promise<void>;
  withFormat?<TMessage, TStorageFormat extends Record<string, unknown>>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ): GenericThreadHistoryAdapter<TMessage>;
};
