import type {
  ChatModelRunOptions,
  ChatModelRunResult,
} from "../runtime/utils/chat-model-adapter";
import type {
  ExportedMessageRepository,
  ExportedMessageRepositoryItem,
} from "../runtime/utils/message-repository";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import type { ThreadMessage } from "../types";

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

export type GenericThreadHistoryAdapter<TMessage> = {
  load(): Promise<MessageFormatRepository<TMessage>>;
  /** Snapshot the current thread so later writes survive a switch. */
  pin?(): void;
  append(item: MessageFormatItem<TMessage>): Promise<void>;
  update?(
    item: MessageFormatItem<TMessage>,
    localMessageId: string,
  ): Promise<void>;
  delete?(items: MessageFormatItem<TMessage>[]): Promise<void>;
  reportTelemetry?(
    items: MessageFormatItem<TMessage>[],
    options?: {
      durationMs?: number;
      stepTimestamps?: { start_ms: number; end_ms: number }[];
      /** The thread message the items were persisted from; its status and timing complete a report the stored format cannot carry. */
      message?: ThreadMessage;
    },
  ): void;
};

export type ThreadHistoryAdapter = {
  /**
   * Stable identity for the storage scope read by LocalRuntime. Keep it the
   * same when recreating the adapter for one thread, account, or workspace,
   * and change it before loading a different scope. Adapters that omit it are
   * treated as sharing one scope. External-history runtimes do not read it.
   */
  scopeId?: string | undefined;
  /**
   * Keeps a copy of messages whose source of truth is the runtime's backend.
   * `branch` is the conversation from its first message to its last, and
   * `messageIds` names the ones in it that are new or changed; the adapter
   * stores those, and first any earlier message of the branch it does not hold
   * yet, keyed by each message's own id. It is undefined while the adapter
   * keeps no copies, so the runtime then neither copies nor records tool
   * interactions.
   *
   * @deprecated Experimental since 2024-09-01. Not scheduled for removal; the API may change in any release.
   */
  unstable_copy?:
    | ((
        branch: readonly ThreadMessage[],
        messageIds: readonly string[],
      ) => Promise<void>)
    | undefined;
  load(): Promise<
    ExportedMessageRepository & {
      state?: ReadonlyJSONValue;
      /** @deprecated Experimental since 2025-03-31. Not scheduled for removal; the API may change in any release. */
      unstable_resume?: boolean;
    }
  >;
  resume?(
    options: ChatModelRunOptions,
  ): AsyncGenerator<ChatModelRunResult, void, unknown>;
  append(item: ExportedMessageRepositoryItem): Promise<void>;
  /**
   * Rewrites a previously appended message in place, keyed by its message id. Adapters that implement this let a runtime persist a run paused for tool approval, finalize the same message once the run resumes, and record a tool result that arrives after the message settled, which can be a message later turns follow. Without it, a paused run is appended when it ends or when a later turn follows its message while the run is still open; anything that run adds after the append is not stored. An update may arrive for an id whose earlier write failed; treat it as an upsert keyed on the message id rather than assuming the entry exists.
   */
  update?(item: ExportedMessageRepositoryItem): Promise<void>;
  /**
   * Deletes messages from history. The runtime may send a second delete for the same message after a write it issued before the delete lands; treat deleting a missing entry as success.
   */
  delete?(items: ExportedMessageRepositoryItem[]): Promise<void>;
  /** Required when used with `useAISDKRuntime` / `useChatRuntime`. */
  withFormat?<TMessage, TStorageFormat extends Record<string, unknown>>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ): GenericThreadHistoryAdapter<TMessage>;
};
