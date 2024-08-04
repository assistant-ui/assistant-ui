import { ReactThreadRuntime } from "../core";
import { MessageRepository } from "../utils/MessageRepository";
import { AppendMessage, ThreadMessage, Unsubscribe } from "../../types";
import { ExternalStoreAdapter } from "./ExternalStoreAdapter";
import { AddToolResultOptions } from "../../context";
import {
  getExternalStoreMessage,
  symbolInnerMessage,
} from "./getExternalStoreMessage";
import {
  ConverterCallback,
  ThreadMessageConverter,
} from "./ThreadMessageConverter";
import { getAutoStatus, isAutoStatus } from "./auto-status";
import { fromThreadMessageLike } from "./ThreadMessageLike";

export const hasUpcomingMessage = (
  isRunning: boolean,
  messages: ThreadMessage[],
) => {
  return isRunning && messages[messages.length - 1]?.role !== "assistant";
};

export class ExternalStoreThreadRuntime implements ReactThreadRuntime {
  private _subscriptions = new Set<() => void>();
  private repository = new MessageRepository();
  private assistantOptimisticId: string | null = null;

  public get capabilities() {
    return {
      switchToBranch: this._store.setMessages !== undefined,
      edit: this._store.onEdit !== undefined,
      reload: this._store.onReload !== undefined,
      cancel: this._store.onCancel !== undefined,
      copy: this._store.onCopy !== null,
    };
  }

  public messages: ThreadMessage[] = [];
  public isDisabled = false;
  public isRunning = false;
  public converter = new ThreadMessageConverter();

  private _store;

  constructor(store: ExternalStoreAdapter<any>) {
    this._store = store;
  }

  public set store(store: ExternalStoreAdapter<any>) {
    const oldStore = this._store;
    this._store = store;

    // flush the converter cache when the convertMessage prop changes
    if (oldStore.convertMessage !== store.convertMessage) {
      this.converter = new ThreadMessageConverter();
    } else if (
      oldStore.isDisabled === store.isDisabled &&
      oldStore.isRunning === store.isRunning &&
      oldStore.messages === store.messages
    ) {
      // no update needed
      return;
    }

    const isRunning = store.isRunning ?? false;
    const isDisabled = store.isDisabled ?? false;

    const convertCallback: ConverterCallback<any> = (cache, m, idx) => {
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
    };

    const messages = this.converter.convertMessages(
      store.messages,
      convertCallback,
    );

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

    this.messages = this.repository.getMessages();
    this.isDisabled = isDisabled;
    this.isRunning = isRunning;

    for (const callback of this._subscriptions) callback();
  }

  public getBranches(messageId: string): string[] {
    return this.repository.getBranches(messageId);
  }

  public switchToBranch(branchId: string): void {
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

    // resync messages (for reloading, to restore the previous branch)
    setTimeout(() => {
      this.updateMessages(messages);
    }, 0);
  }

  public subscribe(callback: () => void): Unsubscribe {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }

  private updateMessages = (messages: ThreadMessage[]) => {
    this._store.setMessages?.(
      messages.flatMap(getExternalStoreMessage).filter((m) => m != null),
    );
  };

  addToolResult(options: AddToolResultOptions) {
    if (!this._store.onAddToolResult)
      throw new Error("Runtime does not support tool results.");
    this._store.onAddToolResult(options);
  }
}
