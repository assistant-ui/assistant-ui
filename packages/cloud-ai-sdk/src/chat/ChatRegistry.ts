import type { Chat } from "@ai-sdk/react";
import type { UIMessage } from "@ai-sdk/react";
import type { ChatMeta } from "../types";

export class ChatRegistry {
  private chatByKey = new Map<string, Chat<UIMessage>>();
  private metaByKey = new Map<string, ChatMeta>();
  private keyByThreadId = new Map<string, string>();

  private createChatFn: (chatKey: string) => Chat<UIMessage>;

  constructor(createChatFn: (chatKey: string) => Chat<UIMessage>) {
    this.createChatFn = createChatFn;
  }

  getOrCreate(chatKey: string, threadId?: string | null): Chat<UIMessage> {
    const existing = this.chatByKey.get(chatKey);
    if (existing) {
      if (threadId) {
        this.getOrCreateMeta(chatKey, threadId);
      }
      return existing;
    }

    const chatInstance = this.createChatFn(chatKey);
    this.chatByKey.set(chatKey, chatInstance);
    this.getOrCreateMeta(chatKey, threadId);
    return chatInstance;
  }

  get(chatKey: string): Chat<UIMessage> | undefined {
    return this.chatByKey.get(chatKey);
  }

  register(
    chatKey: string,
    threadId: string | null,
    chat: Chat<UIMessage>,
  ): void {
    this.chatByKey.set(chatKey, chat);
    this.getOrCreateMeta(chatKey, threadId);
  }

  getMeta(chatKey: string): ChatMeta | undefined {
    return this.metaByKey.get(chatKey);
  }

  getOrCreateMeta(chatKey: string, threadId?: string | null): ChatMeta {
    const existing = this.metaByKey.get(chatKey);
    if (existing) {
      if (threadId && !existing.threadId) {
        existing.threadId = threadId;
      }
      return existing;
    }

    const created: ChatMeta = {
      threadId: threadId ?? null,
      creatingThread: null,
      loading: null,
      loaded: false,
    };
    this.metaByKey.set(chatKey, created);
    return created;
  }

  setThreadId(chatKey: string, threadId: string): void {
    const meta = this.getOrCreateMeta(chatKey);
    meta.threadId = threadId;
    this.keyByThreadId.set(threadId, chatKey);
  }

  getChatKeyForThread(threadId: string): string | undefined {
    return this.keyByThreadId.get(threadId);
  }

  // The maps stay populated: stopping emits onFinish(isAbort) whose
  // persistence path resolves this registry's meta, so the aborted partial
  // run still saves through the scope it belongs to.
  async stopAll(): Promise<void> {
    await Promise.allSettled(
      [...this.chatByKey.values()].map(async (chat) => {
        await chat.stop();
      }),
    );
  }
}
