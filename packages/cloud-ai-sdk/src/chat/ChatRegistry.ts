import type { Chat } from "@ai-sdk/react";
import type { UIMessage } from "@ai-sdk/react";
import type { ChatMeta } from "../types";

export class ChatRegistry {
  private chatByKey = new Map<string, Chat<UIMessage>>();
  private metaByKey = new Map<string, ChatMeta>();
  private keyByThreadId = new Map<string, string>();
  private disposed = false;
  private stopAllPromise: Promise<void> | undefined;

  private createChatFn: (chatKey: string) => Chat<UIMessage>;

  constructor(createChatFn: (chatKey: string) => Chat<UIMessage>) {
    this.createChatFn = createChatFn;
  }

  getOrCreate(chatKey: string, threadId?: string | null): Chat<UIMessage> {
    this.throwIfDisposed();
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
    this.throwIfDisposed();
    this.chatByKey.set(chatKey, chat);
    this.getOrCreateMeta(chatKey, threadId);
  }

  getMeta(chatKey: string): ChatMeta | undefined {
    return this.metaByKey.get(chatKey);
  }

  getOrCreateMeta(chatKey: string, threadId?: string | null): ChatMeta {
    this.throwIfDisposed();
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

  get isDisposed(): boolean {
    return this.disposed;
  }

  private throwIfDisposed(): void {
    if (!this.disposed) return;
    const error = new Error("Chat registry is disposed");
    error.name = "AbortError";
    throw error;
  }

  stopAll(): Promise<void> {
    if (this.stopAllPromise) return this.stopAllPromise;

    this.disposed = true;
    const chats = [...this.chatByKey.values()];

    this.stopAllPromise = Promise.allSettled(
      chats.map(async (chat) => await chat.stop()),
    ).then(() => undefined);
    return this.stopAllPromise;
  }
}
