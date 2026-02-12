import type { ReadonlyJSONObject } from "assistant-stream/utils";
import type { AssistantCloud } from "./AssistantCloud";

/**
 * Shared persistence logic for cloud message storage.
 *
 * Handles ID mapping (local → remote) and parent_id chaining for both:
 * - AssistantCloudThreadHistoryAdapter (assistant-ui runtime)
 * - useCloudChat (standalone AI SDK hook)
 *
 * The promise-based ID resolution handles concurrent appends — if message B's
 * parent is message A, and A is still being created, we await A's promise
 * to get its remote ID before creating B.
 */
export class CloudMessagePersistence {
  private idMapping: Record<string, string | Promise<string>> = {};

  constructor(private cloud: AssistantCloud) {}

  /**
   * Persist a message to the cloud.
   *
   * @param threadId - Remote thread ID
   * @param messageId - Local message ID (used for tracking)
   * @param parentId - Local parent message ID (or null for first message)
   * @param format - Message format (e.g., "aui/v0", "ai-sdk/v6")
   * @param content - Message content (format-specific)
   */
  async append(
    threadId: string,
    messageId: string,
    parentId: string | null,
    format: string,
    content: ReadonlyJSONObject,
  ): Promise<void> {
    // Resolve parent's remote ID if it exists (may be a promise if concurrent)
    const resolvedParentId = parentId
      ? ((await this.idMapping[parentId]) ?? parentId)
      : null;

    const task = this.cloud.threads.messages
      .create(threadId, {
        parent_id: resolvedParentId,
        format,
        content,
      })
      .then(({ message_id }) => {
        this.idMapping[messageId] = message_id;
        return message_id;
      })
      .catch((err) => {
        // Only delete if we're still the active task (avoids clobbering a retry)
        if (this.idMapping[messageId] === task) {
          delete this.idMapping[messageId];
        }
        throw err;
      });

    // Store the promise immediately so concurrent appends can await it
    this.idMapping[messageId] = task;
    return task.then(() => {});
  }

  /**
   * Check if a message has been persisted (or is currently being persisted).
   */
  isPersisted(messageId: string): boolean {
    return messageId in this.idMapping;
  }

  /**
   * Get the remote ID for a local message ID (resolved).
   * Returns undefined if not persisted.
   */
  async getRemoteId(messageId: string): Promise<string | undefined> {
    const entry = this.idMapping[messageId];
    if (!entry) return undefined;
    return entry;
  }

  /**
   * Load messages from the cloud and populate the ID mapping.
   *
   * The ID mapping is populated so that `isPersisted()` returns true for
   * loaded messages, preventing re-persistence of already-stored messages.
   *
   * @param threadId - Remote thread ID
   * @param format - Optional format filter
   * @returns Array of cloud messages
   */
  async load(threadId: string, format?: string) {
    const { messages } = await this.cloud.threads.messages.list(
      threadId,
      format ? { format } : undefined,
    );
    // Populate ID mapping so isPersisted() recognizes loaded messages
    for (const m of messages) {
      this.idMapping[m.id] = m.id;
    }
    return messages;
  }

  /**
   * Reset the ID mapping (call when switching threads).
   */
  reset() {
    this.idMapping = {};
  }
}
