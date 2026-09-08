import type { ReadonlyJSONObject } from "assistant-stream/utils";
import type { AssistantCloud } from "./AssistantCloud";
import type { CloudMessage } from "./AssistantCloudThreadMessages";

const CLOUD_MESSAGE_PAGE_SIZE = 200;

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
  private idMapping = new Map<string, string | Promise<string>>();
  private getCloud: () => AssistantCloud;

  constructor(cloud: AssistantCloud);
  constructor(getCloud: () => AssistantCloud);
  constructor(cloud: AssistantCloud | (() => AssistantCloud)) {
    this.getCloud = typeof cloud === "function" ? cloud : () => cloud;
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
    const existing = this.idMapping.get(messageId);
    if (existing instanceof Promise) {
      await existing;
      return;
    }

    const task = (async () => {
      const parentEntry = parentId ? this.idMapping.get(parentId) : undefined;
      const resolvedParentId = parentId
        ? ((await parentEntry) ?? parentId)
        : null;
      const { message_id } = await cloud.threads.messages.create(threadId, {
        parent_id: resolvedParentId,
        format,
        content,
      });
      return message_id;
    })();

    this.idMapping.set(messageId, task);
    try {
      const remoteId = await task;
      if (this.idMapping.get(messageId) === task) {
        this.idMapping.set(messageId, remoteId);
      }
    } catch (err) {
      if (this.idMapping.get(messageId) === task) {
        this.idMapping.delete(messageId);
      }
      throw err;
    }
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
    const remoteId = await this.getRemoteId(messageId);
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
   */
  isPersisted(messageId: string): boolean {
    return this.idMapping.has(messageId);
  }

  /**
   * Get the remote ID for a local message ID (resolved).
   * Returns undefined if not persisted.
   */
  async getRemoteId(messageId: string): Promise<string | undefined> {
    const entry = this.idMapping.get(messageId);
    if (!entry) return undefined;
    return entry;
  }

  /**
   * Load messages from the cloud and populate the ID mapping.
   *
   * The list endpoint caps a response at 200 rows, so pages are followed by
   * message ID cursor until a short page and concatenated in server order.
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
    const messages: CloudMessage[] = [];
    const seen = new Set<string>();
    let after: string | undefined;

    while (true) {
      const page = await cloud.threads.messages.list(threadId, {
        ...(format ? { format } : undefined),
        limit: CLOUD_MESSAGE_PAGE_SIZE,
        ...(after ? { after } : undefined),
      });
      const last = page.messages.at(-1);
      if (!last) break;

      // A cursor the server cannot resolve drops the keyset filter and replays
      // an earlier page, so already-seen rows end the walk instead of repeating.
      const fresh = page.messages.filter((m) => !seen.has(m.id));
      if (fresh.length === 0) break;
      for (const m of fresh) seen.add(m.id);

      messages.push(...fresh);
      if (page.messages.length < CLOUD_MESSAGE_PAGE_SIZE) break;
      after = last.id;
    }

    // Populate ID mapping so isPersisted() recognizes loaded messages
    for (const m of messages) {
      this.idMapping.set(m.id, m.id);
    }
    return messages;
  }

  /**
   * Reset the ID mapping (call when switching threads).
   */
  reset() {
    this.idMapping.clear();
  }
}
