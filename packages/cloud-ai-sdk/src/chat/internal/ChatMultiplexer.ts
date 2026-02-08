import type { Chat } from "@ai-sdk/react";
import type { UIMessage } from "@ai-sdk/react";
import type { ChatMeta } from "../../types";

/**
 * Manages multiple Chat instances with associated metadata.
 *
 * Handles the mapping between:
 * - Chat keys (unique identifiers for chat instances)
 * - Thread IDs (cloud-persisted thread identifiers)
 * - Chat instances (AI SDK Chat objects)
 * - Metadata (loading state, thread creation promises, etc.)
 */
export class ChatMultiplexer {
  private chatByKey = new Map<string, Chat<UIMessage>>();
  private metaByKey = new Map<string, ChatMeta>();
  private keyByThreadId = new Map<string, string>();

  constructor(private createChatFn: (chatKey: string) => Chat<UIMessage>) {}

  /**
   * Get an existing chat instance or create a new one.
   * Optionally associates the chat with a thread ID.
   */
  getOrCreate(chatKey: string, threadIdHint?: string | null): Chat<UIMessage> {
    const existing = this.chatByKey.get(chatKey);
    if (existing) {
      if (threadIdHint) {
        this.ensureMeta(chatKey, threadIdHint);
      }
      return existing;
    }

    const chatInstance = this.createChatFn(chatKey);
    this.chatByKey.set(chatKey, chatInstance);
    this.ensureMeta(chatKey, threadIdHint);
    return chatInstance;
  }

  /**
   * Get a chat instance by key without creating.
   */
  get(chatKey: string): Chat<UIMessage> | undefined {
    return this.chatByKey.get(chatKey);
  }

  /**
   * Get metadata for a chat key.
   */
  getMeta(chatKey: string): ChatMeta | undefined {
    return this.metaByKey.get(chatKey);
  }

  /**
   * Get or create metadata for a chat key.
   * If threadIdHint is provided and metadata exists without a threadId,
   * updates the existing metadata with the thread ID.
   */
  ensureMeta(chatKey: string, threadIdHint?: string | null): ChatMeta {
    const existing = this.metaByKey.get(chatKey);
    if (existing) {
      if (threadIdHint && !existing.threadId) {
        existing.threadId = threadIdHint;
      }
      return existing;
    }

    const created: ChatMeta = {
      threadId: threadIdHint ?? null,
      creatingThread: null,
      loading: null,
      loaded: false,
    };
    this.metaByKey.set(chatKey, created);
    return created;
  }

  /**
   * Associate a thread ID with a chat key.
   * Creates reverse lookup for finding chat key by thread ID.
   */
  setThreadId(chatKey: string, threadId: string): void {
    const meta = this.ensureMeta(chatKey);
    meta.threadId = threadId;
    this.keyByThreadId.set(threadId, chatKey);
  }

  /**
   * Look up the chat key associated with a thread ID.
   */
  getChatKeyForThread(threadId: string): string | undefined {
    return this.keyByThreadId.get(threadId);
  }
}
