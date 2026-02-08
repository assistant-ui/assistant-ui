import type { UIMessage } from "@ai-sdk/react";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import {
  CloudMessagePersistence,
  createFormattedPersistence,
  type MessageFormatAdapter,
} from "assistant-cloud";
import type { AssistantCloud } from "assistant-cloud";
import { encode, MESSAGE_FORMAT } from "../internal/messageFormat";

/**
 * Format adapter for AI SDK v6 messages.
 */
const aiSdkFormatAdapter: MessageFormatAdapter<UIMessage, ReadonlyJSONObject> =
  {
    format: MESSAGE_FORMAT,
    encode: ({ message }) => encode(message),
    decode: (stored) => ({
      parentId: stored.parent_id,
      message: { id: stored.id, ...stored.content } as UIMessage,
    }),
    getId: (message) => message.id,
  };

type FormattedPersistence = ReturnType<
  typeof createFormattedPersistence<UIMessage, ReadonlyJSONObject>
>;

/**
 * Handles message persistence for cloud-backed chats.
 *
 * Manages:
 * - Persistence instances per thread
 * - Message encoding/decoding
 * - Deduplication (via isPersisted checks)
 * - Error handling
 */
export class MessagePersistence {
  private persistenceByThread = new Map<string, CloudMessagePersistence>();
  private formattedByThread = new Map<string, FormattedPersistence>();

  constructor(
    private cloud: AssistantCloud,
    private onError: (err: unknown) => void,
  ) {}

  /**
   * Get the raw persistence instance for a thread.
   */
  private getPersistence(threadId: string): CloudMessagePersistence {
    const existing = this.persistenceByThread.get(threadId);
    if (existing) return existing;

    const created = new CloudMessagePersistence(this.cloud);
    this.persistenceByThread.set(threadId, created);
    return created;
  }

  /**
   * Get the formatted persistence wrapper for a thread.
   * This handles encoding/decoding between UIMessage and cloud format.
   */
  getFormattedPersistence(threadId: string): FormattedPersistence {
    const existing = this.formattedByThread.get(threadId);
    if (existing) return existing;

    const created = createFormattedPersistence(
      this.getPersistence(threadId),
      aiSdkFormatAdapter,
    );
    this.formattedByThread.set(threadId, created);
    return created;
  }

  /**
   * Persist messages to cloud.
   * Only persists messages that haven't been persisted yet.
   */
  async persistMessages(
    threadId: string,
    messages: UIMessage[],
    mountedRef: { current: boolean },
  ): Promise<void> {
    const formatted = this.getFormattedPersistence(threadId);

    const appendTasks = messages.map((msg, idx) => {
      if (formatted.isPersisted(msg.id)) return null;

      const parentId = idx > 0 ? messages[idx - 1]!.id : null;

      return formatted
        .append(threadId, { parentId, message: msg })
        .catch((err) => {
          if (mountedRef.current) {
            this.onError(err);
          }
          return null;
        });
    });

    const pending = appendTasks.filter(
      (task): task is Promise<void | null> => task !== null,
    );
    if (pending.length > 0) {
      await Promise.all(pending);
    }
  }

  /**
   * Load messages from cloud for a thread.
   */
  async loadMessages(threadId: string): Promise<UIMessage[]> {
    const formatted = this.getFormattedPersistence(threadId);
    const { messages } = await formatted.load(threadId);
    return messages.map((item) => item.message);
  }
}
