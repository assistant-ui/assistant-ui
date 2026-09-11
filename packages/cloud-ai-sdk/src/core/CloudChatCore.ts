import { Chat } from "@ai-sdk/react";
import type { UIMessage } from "@ai-sdk/react";
import type { ChatTransport, UIMessageChunk } from "ai";
import type { AssistantCloud } from "assistant-cloud";
import type { UseCloudChatOptions, UseThreadsResult } from "../types";
import type { ChatRegistry } from "../chat/ChatRegistry";
import { MessagePersistence } from "../chat/MessagePersistence";
import { ThreadSessionManager } from "./ThreadSessionManager";
import { TitlePolicy } from "./TitlePolicy";
import {
  CloudTelemetryReporter,
  type TelemetryFinishEvent,
  type TelemetryRunTiming,
} from "./CloudTelemetryReporter";
import { CloudEngagementReporter } from "./CloudEngagementReporter";

export type CloudChatConfig = Omit<
  UseCloudChatOptions,
  "threads" | "cloud" | "onSyncError"
>;

export type CloudChatCoreOptions = {
  threads: UseThreadsResult;
  chatConfig: CloudChatConfig;
  onSyncError?: ((error: Error) => void) | undefined;
};

type ActiveTelemetryTiming = {
  startedAt: number;
  firstTokenMs?: number;
  error?: unknown;
};

const throwIfRegistryDisposed = (registry: ChatRegistry): void => {
  if (!registry.isDisposed) return;
  const error = new Error("Chat registry is disposed");
  error.name = "AbortError";
  throw error;
};

export class CloudChatCore {
  readonly cloud: AssistantCloud;
  readonly persistence: MessagePersistence;
  readonly sessionManager: ThreadSessionManager;
  readonly titlePolicy: TitlePolicy;
  readonly telemetryReporter: CloudTelemetryReporter;
  readonly engagementReporter: CloudEngagementReporter;

  options: CloudChatCoreOptions;
  /** Set by the React wrapper. */
  mountedRef: { current: boolean } = { current: true };
  private baseTransport: ChatTransport<UIMessage>;
  private telemetryTimings = new Map<string, ActiveTelemetryTiming>();

  constructor(
    cloud: AssistantCloud,
    options: CloudChatCoreOptions,
    baseTransport: ChatTransport<UIMessage>,
  ) {
    this.cloud = cloud;
    this.options = options;
    this.baseTransport = baseTransport;
    this.persistence = new MessagePersistence(
      cloud,
      this.handleSyncError.bind(this),
    );
    this.sessionManager = new ThreadSessionManager();
    this.titlePolicy = new TitlePolicy();
    this.telemetryReporter = new CloudTelemetryReporter(cloud);
    this.engagementReporter = new CloudEngagementReporter(
      cloud,
      (threadId, messageId) =>
        this.persistence.getResolvedRemoteId(threadId, messageId),
    );
  }

  updateOptions(
    options: CloudChatCoreOptions,
    baseTransport: ChatTransport<UIMessage>,
  ): void {
    this.options = options;
    this.baseTransport = baseTransport;
  }

  async ensureThreadId(
    chatKey: string,
    registry: ChatRegistry,
  ): Promise<string> {
    return this.sessionManager.ensureThreadId(
      chatKey,
      registry,
      async () => {
        const res = await this.options.threads.cloud.threads.create({
          last_message_at: new Date(),
        });
        return res.thread_id;
      },
      (threadId) => {
        this.titlePolicy.markNewThread(threadId);
        this.options.threads.selectThread(threadId);
        void this.options.threads.refresh();
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
    finishEvent?: TelemetryFinishEvent,
    timing?: TelemetryRunTiming,
  ): Promise<void> {
    const meta = registry.getMeta(chatKey);
    const threadId = meta?.threadId;
    if (!threadId) return;

    const chatInstance = registry.get(chatKey);
    if (!chatInstance) return;

    const messages = chatInstance.messages;
    await this.persist(threadId, messages);

    this.telemetryReporter
      .reportFromMessages(
        threadId,
        messages,
        finishEvent,
        timing,
        (messageId) =>
          this.persistence.getResolvedRemoteId(threadId, messageId),
      )
      .catch(() => {});

    if (this.titlePolicy.shouldGenerateTitle(threadId, messages)) {
      this.titlePolicy.markTitleGenerationStarted(threadId);
      void this.options.threads
        .generateTitle(threadId, { automatic: true })
        .then(
          (title) => {
            if (title) {
              this.titlePolicy.markTitleGenerated(threadId);
            } else {
              this.titlePolicy.markTitleGenerationFailed(threadId);
            }
          },
          () => {
            this.titlePolicy.markTitleGenerationFailed(threadId);
          },
        );
    }
  }

  trackRunStopped(threadId: string | null): void {
    if (threadId) this.engagementReporter.runStopped(threadId);
  }

  trackRegenerated(threadId: string | null, messages: UIMessage[]): void {
    if (threadId) {
      this.engagementReporter.messageRegenerated(threadId, messages);
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
    if (!cancelledRef.cancelled) {
      meta.loading = null;
    }
  }

  createTransport(
    chatKey: string,
    registry: ChatRegistry,
  ): ChatTransport<UIMessage> {
    return {
      sendMessages: async (opts) => {
        throwIfRegistryDisposed(registry);
        const currentThreadId = await this.ensureThreadId(chatKey, registry);
        throwIfRegistryDisposed(registry);

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
        throwIfRegistryDisposed(registry);
        if (
          opts.trigger === "submit-message" &&
          opts.messages.at(-1)?.role === "user"
        ) {
          this.engagementReporter.messageSent(
            currentThreadId,
            messagesForDurableUserPersist,
          );
        }

        const timing: ActiveTelemetryTiming = { startedAt: Date.now() };
        this.telemetryTimings.set(chatKey, timing);
        const stream = await this.baseTransport.sendMessages({
          ...opts,
          body: {
            ...opts.body,
            id: currentThreadId,
          },
        });
        return this.observeTelemetryStream(stream, timing);
      },
      reconnectToStream: (opts) => this.baseTransport.reconnectToStream(opts),
    };
  }

  createChat(
    chatKey: string,
    registry: ChatRegistry,
    chatConfig: CloudChatConfig = this.options.chatConfig,
  ): Chat<UIMessage> {
    const {
      onFinish: _onFinish,
      onData: _onData,
      onError: _onError,
      onToolCall: _onToolCall,
      sendAutomaticallyWhen: _sendAutomaticallyWhen,
      id: _id,
      ...chatInit
    } = chatConfig;

    return new Chat<UIMessage>({
      ...chatInit,
      id: chatKey,
      transport: this.createTransport(chatKey, registry),
      onFinish: (event) => {
        try {
          this.options.chatConfig.onFinish?.(event);
        } finally {
          const activeTiming = this.telemetryTimings.get(chatKey);
          const timing = activeTiming
            ? {
                durationMs: Date.now() - activeTiming.startedAt,
                ...(activeTiming.firstTokenMs !== undefined
                  ? { firstTokenMs: activeTiming.firstTokenMs }
                  : undefined),
              }
            : undefined;
          this.telemetryTimings.delete(chatKey);
          if (!registry.isDisposed) {
            const threadId = registry.getMeta(chatKey)?.threadId;
            const chatInstance = registry.get(chatKey);
            if (threadId && chatInstance) {
              if (event.isAbort) this.engagementReporter.runStopped(threadId);
              if (event.isError || event.finishReason === "error") {
                this.engagementReporter.errorShown(
                  threadId,
                  chatInstance.messages,
                );
              }
            }
          }
          const threadId = registry.getMeta(chatKey)?.threadId;
          const chatInstance = registry.get(chatKey);
          const finishEvent =
            activeTiming?.error === undefined
              ? event
              : { ...event, error: activeTiming.error };
          const persist = registry.isDisposed
            ? threadId && chatInstance
              ? this.persist(threadId, chatInstance.messages)
              : Promise.resolve()
            : timing
              ? this.persistChatMessages(chatKey, registry, finishEvent, timing)
              : this.persistChatMessages(chatKey, registry, finishEvent);
          void persist.catch((error) => {
            this.handleSyncError(error);
          });
        }
      },
      onError: (error) => {
        const activeTiming = this.telemetryTimings.get(chatKey);
        if (activeTiming) activeTiming.error = error;
        const threadId = registry.getMeta(chatKey)?.threadId;
        const chatInstance = registry.get(chatKey);
        if (threadId && chatInstance) {
          this.engagementReporter.errorShown(threadId, chatInstance.messages);
        }
        this.options.chatConfig.onError?.(error);
      },
      onData: (data) => {
        this.options.chatConfig.onData?.(data);
      },
      onToolCall: (toolCall) => {
        return this.options.chatConfig.onToolCall?.(toolCall);
      },
      sendAutomaticallyWhen: (arg) =>
        this.options.chatConfig.sendAutomaticallyWhen?.(arg) ?? false,
    });
  }

  private observeTelemetryStream(
    stream: ReadableStream<UIMessageChunk>,
    timing: ActiveTelemetryTiming,
  ): ReadableStream<UIMessageChunk> {
    // Read eagerly until the first token so its timing reflects arrival rather than downstream consumption.
    const reader = stream.getReader();
    let observeFirstToken = timing.firstTokenMs === undefined;
    let cancelled = false;
    let readerReleased = false;
    let eagerRead: Promise<void> | undefined;

    const releaseReader = () => {
      if (readerReleased) return;
      readerReleased = true;
      reader.releaseLock();
    };
    const forwardNext = async (
      controller: ReadableStreamDefaultController<UIMessageChunk>,
    ) => {
      try {
        const { done, value } = await reader.read();
        if (cancelled) return false;
        if (done) {
          releaseReader();
          controller.close();
          return false;
        }
        if (
          observeFirstToken &&
          (value.type === "text-delta" || value.type === "reasoning-delta")
        ) {
          timing.firstTokenMs = Date.now() - timing.startedAt;
          observeFirstToken = false;
        }
        controller.enqueue(value);
        return true;
      } catch (error) {
        releaseReader();
        if (!cancelled) controller.error(error);
        return false;
      }
    };
    const readUntilFirstToken = async (
      controller: ReadableStreamDefaultController<UIMessageChunk>,
    ) => {
      while (observeFirstToken && (await forwardNext(controller))) {}
    };

    return new ReadableStream<UIMessageChunk>({
      start(controller) {
        eagerRead = readUntilFirstToken(controller);
      },
      async pull(controller) {
        if (eagerRead) {
          await eagerRead;
          eagerRead = undefined;
        } else {
          await forwardNext(controller);
        }
      },
      async cancel(reason) {
        cancelled = true;
        try {
          if (!readerReleased) {
            await reader.cancel(reason);
          }
        } finally {
          releaseReader();
        }
      },
    });
  }

  private handleSyncError(err: unknown): void {
    const error = err instanceof Error ? err : new Error(String(err));
    const onSyncError = this.options.onSyncError;
    if (!onSyncError) return;

    const reportCallbackError = (callbackError: unknown) => {
      console.error(
        "[cloud-ai-sdk] onSyncError callback threw an error",
        callbackError,
      );
    };

    try {
      const result = onSyncError(error) as unknown;
      if (
        result !== null &&
        (typeof result === "object" || typeof result === "function") &&
        "then" in result &&
        typeof result.then === "function"
      ) {
        void Promise.resolve(result).catch(reportCallbackError);
      }
    } catch (callbackError) {
      reportCallbackError(callbackError);
    }
  }
}
