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
  private idMapping = new Map<string, Map<string, string | Promise<string>>>();
  private getCloud: () => AssistantCloud;

  constructor(cloud: AssistantCloud);
  constructor(getCloud: () => AssistantCloud);
  constructor(cloud: AssistantCloud | (() => AssistantCloud)) {
    this.getCloud = typeof cloud === "function" ? cloud : () => cloud;
  }

  private getThreadMapping(
    threadId: string,
  ): Map<string, string | Promise<string>> {
    let mapping = this.idMapping.get(threadId);
    if (!mapping) {
      mapping = new Map();
      this.idMapping.set(threadId, mapping);
    }
    return mapping;
  }

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
    const cloud = this.getCloud();
    const mapping = this.getThreadMapping(threadId);
    // Resolve parent's remote ID if it exists (may be a promise if concurrent)
    const resolvedParentId = parentId
      ? ((await mapping.get(parentId)) ?? parentId)
      : null;

    const task = cloud.threads.messages
      .create(threadId, {
        parent_id: resolvedParentId,
        format,
        content,
      })
      .then(({ message_id }) => {
        mapping.set(messageId, message_id);
        return message_id;
      })
      .catch((err) => {
        // Only delete if we're still the active task (avoids clobbering a retry)
        if (mapping.get(messageId) === task) {
          mapping.delete(messageId);
          if (mapping.size === 0) {
            this.idMapping.delete(threadId);
          }
        }
        throw err;
      });

    // Store the promise immediately so concurrent appends can await it
    mapping.set(messageId, task);
    return task.then(() => {});
  }

  /**
   * Update an already-persisted message in the cloud.
   */
  async update(
    threadId: string,
    messageId: string,
    _format: string,
    content: ReadonlyJSONObject,
  ): Promise<void> {
    const cloud = this.getCloud();
    const remoteId = await this.getRemoteId(threadId, messageId);
    if (!remoteId) {
      console.warn(
        `Skipping update for message ${messageId}: no remote id is mapped.`,
      );
      return;
    }
    await cloud.threads.messages.update(threadId, remoteId, { content });
  }

  /**
   * Check if a message has been persisted (or is currently being persisted).
   * Pass a thread ID to disambiguate local IDs reused across threads.
   */
  isPersisted(messageId: string): boolean;
  isPersisted(threadId: string, messageId: string): boolean;
  isPersisted(threadIdOrMessageId: string, messageId?: string): boolean {
    if (messageId !== undefined) {
      return this.idMapping.get(threadIdOrMessageId)?.has(messageId) ?? false;
    }

    for (const mapping of this.idMapping.values()) {
      if (mapping.has(threadIdOrMessageId)) return true;
    }
    return false;
  }

  /**
   * Get the remote ID for a local message ID (resolved).
   * Pass a thread ID to disambiguate local IDs reused across threads.
   * Returns undefined if not persisted.
   */
  async getRemoteId(messageId: string): Promise<string | undefined>;
  async getRemoteId(
    threadId: string,
    messageId: string,
  ): Promise<string | undefined>;
  async getRemoteId(
    threadIdOrMessageId: string,
    messageId?: string,
  ): Promise<string | undefined> {
    let entry: string | Promise<string> | undefined;
    if (messageId !== undefined) {
      entry = this.idMapping.get(threadIdOrMessageId)?.get(messageId);
    } else {
      for (const mapping of this.idMapping.values()) {
        entry = mapping.get(threadIdOrMessageId);
        if (entry) break;
      }
    }

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
    const cloud = this.getCloud();
    const { messages } = await cloud.threads.messages.list(
      threadId,
      format ? { format } : undefined,
    );
    // Populate ID mapping so isPersisted() recognizes loaded messages
    const mapping = this.getThreadMapping(threadId);
    for (const m of messages) {
      mapping.set(m.id, m.id);
    }
    return messages;
  }

  /**
   * Reset one thread's ID mapping, or all mappings when no thread is provided.
   */
  reset(threadId?: string) {
    if (threadId !== undefined) {
      this.idMapping.delete(threadId);
    } else {
      this.idMapping.clear();
    }
  }
}
