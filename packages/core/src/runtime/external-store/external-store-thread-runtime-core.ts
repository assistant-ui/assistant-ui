import type { AppendMessage, ThreadMessage } from "../../types";
import type {
  AddToolResultOptions,
  ResumeRunConfig,
  ResumeToolCallOptions,
  StartRunConfig,
  ThreadSuggestion,
} from "../core/thread-runtime-core";

import type { ExternalStoreAdapter } from "./external-store-adapter";
import {
  getExternalStoreMessage,
  symbolInnerMessage,
} from "../shared/external-store-message";
import { ThreadMessageConverter } from "./thread-message-converter";
import { getAutoStatus, isAutoStatus } from "../shared/auto-status";
import {
  fromThreadMessageLike,
  type ThreadMessageLike,
} from "../shared/thread-message-like";
import { getThreadMessageText } from "../../utils/text";
import type {
  RuntimeCapabilities,
  ThreadRuntimeCore,
} from "../core/thread-runtime-core";
import { BaseThreadRuntimeCore } from "../base/base-thread-runtime-core";
import type { ModelContextProvider } from "../../model-context";
import {
  ExportedMessageRepository,
  MessageRepository,
} from "../shared/message-repository";

const EMPTY_ARRAY = Object.freeze([]);

export const hasUpcomingMessage = (
  isRunning: boolean,
  messages: readonly ThreadMessage[],
) => {
  return isRunning && messages[messages.length - 1]?.role !== "assistant";
};

export class ExternalStoreThreadRuntimeCore
  extends BaseThreadRuntimeCore
  implements ThreadRuntimeCore
{
  private _assistantOptimisticId: string | null = null;

  private _capabilities: RuntimeCapabilities = {
    switchToBranch: false,
    switchBranchDuringRun: false,
    edit: false,
    reload: false,
    cancel: false,
    unstable_copy: false,
    speech: false,
    dictation: false,
    attachments: false,
    feedback: false,
  };

  public get capabilities() {
    return this._capabilities;
  }

  private _messages!: readonly ThreadMessage[];
  public isDisabled!: boolean;
  public get isLoading() {
    return this._store.isLoading ?? false;
  }

  public override get messages() {
    return this._messages;
  }

  public override get state() {
    return this._store.state ?? super.state;
  }

  public get adapters() {
    return this._store.adapters;
  }

  public suggestions: readonly ThreadSuggestion[] = [];
  public extras: unknown = undefined;

  private _converter = new ThreadMessageConverter();

  private _store!: ExternalStoreAdapter<any>;

  public override beginEdit(messageId: string) {
    if (!this._store.onEdit)
      throw new Error("Runtime does not support editing.");

    super.beginEdit(messageId);
  }

  constructor(
    contextProvider: ModelContextProvider,
    store: ExternalStoreAdapter<any>,
  ) {
    super(contextProvider);
    this.__internal_setAdapter(store);
  }

  public __internal_setAdapter(store: ExternalStoreAdapter<any>) {
    if (this._store === store) return;

    const isRunning = store.isRunning ?? false;
    this.isDisabled = store.isDisabled ?? false;

    const oldStore = this._store as ExternalStoreAdapter<any> | undefined;
    this._store = store;
    this.extras = store.extras;
    this.suggestions = store.suggestions ?? EMPTY_ARRAY;
    this._capabilities = {
      switchToBranch: this._store.setMessages !== undefined,
      switchBranchDuringRun: false, // External store never supports branch switching during run
      edit: this._store.onEdit !== undefined,
      reload: this._store.onReload !== undefined,
      cancel: this._store.onCancel !== undefined,
      speech: this._store.adapters?.speech !== undefined,
      dictation: this._store.adapters?.dictation !== undefined,
      unstable_copy: this._store.unstable_capabilities?.copy !== false, // default true
      attachments: !!this._store.adapters?.attachments,
      feedback: !!this._store.adapters?.feedback,
    };

    let messages: readonly ThreadMessage[];

    if (store.messageRepository) {
      // Handle messageRepository
      if (
        oldStore &&
        oldStore.isRunning === store.isRunning &&
        oldStore.messageRepository === store.messageRepository
      ) {
        this._notifySubscribers();
        return;
      }

      // Clear and import the message repository
      this.repository.clear();
      this._assistantOptimisticId = null;
      this.repository.import(store.messageRepository);

      messages = this.repository.getMessages();
    } else if (store.messages) {
      // Handle messages array

      if (oldStore) {
        // flush the converter cache when the convertMessage prop changes
        if (oldStore.convertMessage !== store.convertMessage) {
          this._converter = new ThreadMessageConverter();
        } else if (
          oldStore.isRunning === store.isRunning &&
          oldStore.messages === store.messages
        ) {
          this._notifySubscribers();
          // no conversion update
          return;
        }
      }

      messages = !store.convertMessage
        ? store.messages
        : this._converter.convertMessages(store.messages, (cache, m, idx) => {
            if (!store.convertMessage) return m;

            const isLast = idx === (store.messages?.length ?? 0) - 1;
            const autoStatus = getAutoStatus(
              isLast,
              isRunning,
              false,
              false,
              undefined,
            );

            if (
              cache &&
              (cache.role !== "assistant" ||
                !isAutoStatus(cache.status) ||
                cache.status === autoStatus)
            )
              return cache;

            const messageLike = store.convertMessage(m, idx);
            const newMessage = fromThreadMessageLike(
              messageLike,
              idx.toString(),
              autoStatus,
            );
            (newMessage as any)[symbolInnerMessage] = m;
            return newMessage;
          });

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i]!;
        const parent = messages[i - 1];
        this.repository.addOrUpdateMessage(parent?.id ?? null, message);
      }
    } else {
      throw new Error(
        "ExternalStoreAdapter must provide either 'messages' or 'messageRepository'",
      );
    }

    // Common logic for both paths
    if (messages.length > 0) this.ensureInitialized();

    if ((oldStore?.isRunning ?? false) !== (store.isRunning ?? false)) {
      if (store.isRunning) {
        this._notifyEventSubscribers("runStart");
      } else {
        this._notifyEventSubscribers("runEnd");
      }
    }

    if (this._assistantOptimisticId) {
      this.repository.deleteMessage(this._assistantOptimisticId);
      this._assistantOptimisticId = null;
    }

    if (hasUpcomingMessage(isRunning, messages)) {
      this._assistantOptimisticId = this.repository.appendOptimisticMessage(
        messages.at(-1)?.id ?? null,
        {
          role: "assistant",
          content: [],
        },
      );
    }

    this.repository.resetHead(
      this._assistantOptimisticId ?? messages.at(-1)?.id ?? null,
    );

    this._messages = this.repository.getMessages();
    this._notifySubscribers();
  }

  public override switchToBranch(branchId: string): void {
    if (!this._store.setMessages)
      throw new Error("Runtime does not support switching branches.");

    // Silently ignore branch switches while running
    if (this._store.isRunning) {
      return;
    }

    this.repository.switchToBranch(branchId);
    this.updateMessages(this.repository.getMessages());
  }

  public async append(message: AppendMessage): Promise<void> {
    if (message.parentId !== (this.messages.at(-1)?.id ?? null)) {
      if (!this._store.onEdit)
        throw new Error("Runtime does not support editing messages.");
      await this._store.onEdit(message);
    } else {
      await this._store.onNew(message);
    }
  }

  public async startRun(config: StartRunConfig): Promise<void> {
    if (!this._store.onReload)
      throw new Error("Runtime does not support reloading messages.");

    await this._store.onReload(config.parentId, config);
  }

  public async resumeRun(config: ResumeRunConfig): Promise<void> {
    if (!this._store.onResume)
      throw new Error("Runtime does not support resuming runs.");

    await this._store.onResume(config);
  }

  public exportExternalState(): any {
    if (!this._store.onExportExternalState)
      throw new Error("Runtime does not support exporting external states.");

    return this._store.onExportExternalState();
  }

  public importExternalState(state: any): void {
    if (!this._store.onLoadExternalState)
      throw new Error("Runtime does not support importing external states.");

    this._store.onLoadExternalState(state);
  }

  public unstable_loadExternalState(state: any): void {
    this.importExternalState(state);
  }

  public cancelRun(): void {
    if (!this._store.onCancel)
      throw new Error("Runtime does not support cancelling runs.");

    this._store.onCancel();

    if (this._assistantOptimisticId) {
      this.repository.deleteMessage(this._assistantOptimisticId);
      this._assistantOptimisticId = null;
    }

    let messages = this.repository.getMessages();
    const previousMessage = messages[messages.length - 1];
    if (
      previousMessage?.role === "user" &&
      previousMessage.id === messages.at(-1)?.id // ensure the previous message is a leaf node
    ) {
      this.repository.deleteMessage(previousMessage.id);
      if (!this.composer.text.trim()) {
        this.composer.setText(getThreadMessageText(previousMessage));
      }

      messages = this.repository.getMessages();
    } else {
      this._notifySubscribers();
    }

    // resync messages (for reloading, to restore the previous branch)
    setTimeout(() => {
      this.updateMessages(messages);
    }, 0);
  }

  public addToolResult(options: AddToolResultOptions) {
    if (!this._store.onAddToolResult && !this._store.onAddToolResult)
      throw new Error("Runtime does not support tool results.");
    this._store.onAddToolResult?.(options);
  }

  public resumeToolCall(options: ResumeToolCallOptions) {
    if (!this._store.onResumeToolCall)
      throw new Error("Runtime does not support resuming tool calls.");
    this._store.onResumeToolCall(options);
  }

  public override reset(initialMessages?: readonly ThreadMessageLike[]) {
    const repo = new MessageRepository();
    repo.import(ExportedMessageRepository.fromArray(initialMessages ?? []));
    this.updateMessages(repo.getMessages());
  }

  public override import(data: ExportedMessageRepository) {
    this._assistantOptimisticId = null;

    super.import(data);

    if (this._store.onImport) {
      this._store.onImport(this.repository.getMessages());
    }
  }

  private updateMessages = (messages: readonly ThreadMessage[]) => {
    const hasConverter = this._store.convertMessage !== undefined;
    if (hasConverter) {
      this._store.setMessages?.(
        messages.flatMap(getExternalStoreMessage).filter((m) => m != null),
      );
    } else {
      // TODO mark this as readonly in v0.12.0
      this._store.setMessages?.(messages as ThreadMessage[]);
    }
  };
}
