import type { Chat } from "@ai-sdk/react";
import type { UIMessage } from "@ai-sdk/react";
import type { ChatMeta } from "../../types";

export class ChatMultiplexer {
  private chatByKey = new Map<string, Chat<UIMessage>>();
  private metaByKey = new Map<string, ChatMeta>();
  private keyByThreadId = new Map<string, string>();

  constructor(private createChatFn: (chatKey: string) => Chat<UIMessage>) {}

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

  get(chatKey: string): Chat<UIMessage> | undefined {
    return this.chatByKey.get(chatKey);
  }

  getMeta(chatKey: string): ChatMeta | undefined {
    return this.metaByKey.get(chatKey);
  }

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

  setThreadId(chatKey: string, threadId: string): void {
    const meta = this.ensureMeta(chatKey);
    meta.threadId = threadId;
    this.keyByThreadId.set(threadId, chatKey);
  }

  getChatKeyForThread(threadId: string): string | undefined {
    return this.keyByThreadId.get(threadId);
  }
}
