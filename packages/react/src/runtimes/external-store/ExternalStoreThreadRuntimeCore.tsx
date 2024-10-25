import {
  AddToolResultOptions,
  ThreadSuggestion,
} from "../core/ThreadRuntimeCore";

import { AppendMessage, ModelConfigProvider, ThreadMessage } from "../../types";
import { ExternalStoreAdapter } from "./ExternalStoreAdapter";
import {
  getExternalStoreMessage,
  symbolInnerMessage,
} from "./getExternalStoreMessage";
import { ThreadMessageConverter } from "./ThreadMessageConverter";
import { getAutoStatus, isAutoStatus } from "./auto-status";
import { fromThreadMessageLike } from "./ThreadMessageLike";
import { getThreadMessageText } from "../../utils/getThreadMessageText";
import {
  RuntimeCapabilities,
  ThreadRuntimeCore,
} from "../core/ThreadRuntimeCore";
import { BaseThreadRuntimeCore } from "../core/BaseThreadRuntimeCore";

const EMPTY_ARRAY = Object.freeze([]);

export const hasUpcomingMessage = (
  isRunning: boolean,
  messages: ThreadMessage[],
) => {
  return isRunning && messages[messages.length - 1]?.role !== "assistant";
};

export class ExternalStoreThreadRuntimeCore
  extends BaseThreadRuntimeCore
  implements ThreadRuntimeCore
{
  private assistantOptimisticId: string | null = null;

  private _capabilities: RuntimeCapabilities = {
    switchToBranch: false,
    edit: false,
    reload: false,
    cancel: false,
    unstable_copy: false,
    speech: false,
    attachments: false,
    feedback: false,
  };

  public get capabilities() {
    return this._capabilities;
  }

  public threadId!: string;
  private _messages!: ThreadMessage[];
  public isDisabled!: boolean;

  public override get messages() {
    return this._messages;
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
    configProvider: ModelConfigProvider,
    threadId: string,
    store: ExternalStoreAdapter<any>,
  ) {
    super(configProvider);
    this.threadId = threadId;
    this.setStore(store);
  }

  public setStore(store: ExternalStoreAdapter<any>) {
    if (this._store === store) return;

    const isRunning = store.isRunning ?? false;
    this.isDisabled = store.isDisabled ?? false;

    const oldStore = this._store as ExternalStoreAdapter<any> | undefined;
    this._store = store;
    this.extras = store.extras;
    this.suggestions = store.suggestions ?? EMPTY_ARRAY;
    this._capabilities = {
      switchToBranch: this._store.setMessages !== undefined,
      edit: this._store.onEdit !== undefined,
      reload: this._store.onReload !== undefined,
      cancel: this._store.onCancel !== undefined,
      speech: this._store.adapters?.speech !== undefined,
      unstable_copy: this._store.unstable_capabilities?.copy !== false, // default true
      attachments: !!this._store.adapters?.attachments,
      feedback: !!this._store.adapters?.feedback,
    };

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

    const messages = !store.convertMessage
      ? store.messages
      : this._converter.convertMessages(store.messages, (cache, m, idx) => {
          if (!store.convertMessage) return m;

          const isLast = idx === store.messages.length - 1;
          const autoStatus = getAutoStatus(isLast, isRunning);

          if (
            cache &&
            (cache.role !== "assistant" ||
              !isAutoStatus(cache.status) ||
              cache.status === autoStatus)
          )
            return cache;

          const newMessage = fromThreadMessageLike(
            store.convertMessage(m, idx),
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

    if (this.assistantOptimisticId) {
      this.repository.deleteMessage(this.assistantOptimisticId);
      this.assistantOptimisticId = null;
    }

    if (hasUpcomingMessage(isRunning, messages)) {
      this.assistantOptimisticId = this.repository.appendOptimisticMessage(
        messages.at(-1)?.id ?? null,
        {
          role: "assistant",
          content: [],
        },
      );
    }

    this.repository.resetHead(
      this.assistantOptimisticId ?? messages.at(-1)?.id ?? null,
    );

    this._messages = this.repository.getMessages();
    this._notifySubscribers();
  }

  public override switchToBranch(branchId: string): void {
    if (!this._store.setMessages)
      throw new Error("Runtime does not support switching branches.");

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

  public async startRun(parentId: string | null): Promise<void> {
    if (!this._store.onReload)
      throw new Error("Runtime does not support reloading messages.");

    await this._store.onReload(parentId);
  }

  public cancelRun(): void {
    if (!this._store.onCancel)
      throw new Error("Runtime does not support cancelling runs.");

    this._store.onCancel();

    if (this.assistantOptimisticId) {
      this.repository.deleteMessage(this.assistantOptimisticId);
      this.assistantOptimisticId = null;
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
    if (!this._store.onAddToolResult)
      throw new Error("Runtime does not support tool results.");
    this._store.onAddToolResult(options);
  }

  private updateMessages = (messages: ThreadMessage[]) => {
    this._store.setMessages?.(
      messages.flatMap(getExternalStoreMessage).filter((m) => m != null),
    );
  };
}
