import { Chat } from "@ai-sdk/react";
import type { UIMessage } from "@ai-sdk/react";
import type { ChatTransport } from "ai";
import type { AssistantCloud } from "assistant-cloud";
import type { UseCloudChatOptions, UseThreadsResult } from "../types";
import type { ChatRegistry } from "../chat/ChatRegistry";
import { MessagePersistence } from "../chat/MessagePersistence";
import { ThreadSessionManager } from "./ThreadSessionManager";
import { TitlePolicy } from "./TitlePolicy";

export type CloudChatConfig = Omit<
  UseCloudChatOptions,
  "threads" | "cloud" | "onSyncError"
>;

export type CloudChatCoreOptions = {
  threadStore: UseThreadsResult;
  chatConfig: CloudChatConfig;
  onSyncError?: ((error: Error) => void) | undefined;
};

export class CloudChatCore {
  readonly cloud: AssistantCloud;
  readonly persistence: MessagePersistence;
  readonly sessionManager: ThreadSessionManager;
  readonly titlePolicy: TitlePolicy;

  /** Updated by the React wrapper each render. */
  options: CloudChatCoreOptions;
  /** Set by the React wrapper. */
  mountedRef: { current: boolean } = { current: true };
  /** Set by the React wrapper. */
  baseTransport!: ChatTransport<UIMessage>;

  constructor(cloud: AssistantCloud, options: CloudChatCoreOptions) {
    this.cloud = cloud;
    this.options = options;
    this.persistence = new MessagePersistence(
      cloud,
      this.handleSyncError.bind(this),
    );
    this.sessionManager = new ThreadSessionManager();
    this.titlePolicy = new TitlePolicy();
  }

  async ensureThreadId(
    chatKey: string,
    registry: ChatRegistry,
  ): Promise<string> {
    return this.sessionManager.ensureThreadId(
      chatKey,
      registry,
      async () => {
        const res = await this.options.threadStore.cloud.threads.create({
          last_message_at: new Date(),
        });
        return res.thread_id;
      },
      (threadId) => {
        this.titlePolicy.markNewThread(threadId);
        this.options.threadStore.selectThread(threadId);
        void this.options.threadStore.refresh();
      },
    );
  }

  async persist(
    threadId: string,
    messages: UIMessage[],
    options?: { roles?: UIMessage["role"][]; strict?: boolean },
  ): Promise<void> {
    await this.persistence.persist(
      threadId,
      messages,
      this.mountedRef,
      options,
    );
  }

  async load(threadId: string): Promise<UIMessage[]> {
    return this.persistence.loadMessages(threadId);
  }

  async persistChatMessages(
    chatKey: string,
    registry: ChatRegistry,
  ): Promise<void> {
    const meta = registry.getMeta(chatKey);
    const threadId = meta?.threadId;
    if (!threadId) return;

    const chatInstance = registry.get(chatKey);
    if (!chatInstance) return;

    const messages = chatInstance.messages;
    await this.persist(threadId, messages);

    if (this.titlePolicy.shouldGenerateTitle(threadId, messages)) {
      this.titlePolicy.markTitleGenerated(threadId);
      void this.options.threadStore.generateTitle(threadId);
    }
  }

  async loadThreadMessages(
    threadId: string,
    chatKey: string,
    registry: ChatRegistry,
    cancelledRef: { cancelled: boolean },
  ): Promise<void> {
    const meta = registry.getOrCreateMeta(chatKey, threadId);
    try {
      const messages = await this.load(threadId);
      if (cancelledRef.cancelled) return;

      const chatInstance = registry.getOrCreate(chatKey, threadId);
      chatInstance.messages = messages;
      meta.loaded = true;
    } catch (err) {
      if (!cancelledRef.cancelled) {
        this.handleSyncError(err);
      }
    }
    meta.loading = null;
  }

  createTransport(
    chatKey: string,
    registry: ChatRegistry,
  ): ChatTransport<UIMessage> {
    return {
      sendMessages: async (opts) => {
        const currentThreadId = await this.ensureThreadId(chatKey, registry);

        if (!currentThreadId) {
          throw new Error("useCloudChat: Failed to resolve thread id");
        }

        const chatInstance = registry.get(chatKey);
        const messagesForDurableUserPersist =
          chatInstance?.messages ?? opts.messages;
        await this.persist(currentThreadId, messagesForDurableUserPersist, {
          roles: ["user"],
          strict: true,
        });

        return await this.baseTransport.sendMessages({
          ...opts,
          body: {
            ...opts.body,
            id: currentThreadId ?? opts.chatId,
          },
        });
      },
      reconnectToStream: (opts) => this.baseTransport.reconnectToStream(opts),
    };
  }

  createChat(chatKey: string, registry: ChatRegistry): Chat<UIMessage> {
    const {
      onFinish: _onFinish,
      onData: _onData,
      onError: _onError,
      onToolCall: _onToolCall,
      sendAutomaticallyWhen: _sendAutomaticallyWhen,
      id: _id,
      ...chatInit
    } = this.options.chatConfig;

    return new Chat<UIMessage>({
      ...chatInit,
      id: chatKey,
      transport: this.createTransport(chatKey, registry),
      onFinish: async (event) => {
        try {
          this.options.chatConfig.onFinish?.(event);
        } finally {
          await this.persistChatMessages(chatKey, registry);
        }
      },
      onError: (error) => {
        this.options.chatConfig.onError?.(error);
      },
      onData: (data) => {
        this.options.chatConfig.onData?.(data);
      },
      onToolCall: (toolCall) => {
        this.options.chatConfig.onToolCall?.(toolCall);
      },
      sendAutomaticallyWhen: (arg) =>
        this.options.chatConfig.sendAutomaticallyWhen?.(arg) ?? false,
    });
  }

  private handleSyncError(err: unknown): void {
    const error = err instanceof Error ? err : new Error(String(err));
    this.options.onSyncError?.(error);
  }
}
