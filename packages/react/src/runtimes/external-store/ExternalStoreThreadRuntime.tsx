import { type StoreApi, type UseBoundStore, create } from "zustand";
import { ReactThreadRuntime } from "../core";
import { MessageRepository } from "../utils/MessageRepository";
import { AppendMessage, ThreadMessage, Unsubscribe } from "../../types";
import { ExternalStoreAdapter } from "./ExternalStoreAdapter";
import { AddToolResultOptions } from "../../context";
import { getExternalStoreMessage } from "./getExternalStoreMessage";
import { useExternalStoreSync } from "./useExternalStoreSync";

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

  private useStore: UseBoundStore<
    StoreApi<{ store: ExternalStoreAdapter<any> }>
  >;

  public get capabilities() {
    return {
      edit: this.store.onEdit !== undefined,
      reload: this.store.onReload !== undefined,
      cancel: this.store.onCancel !== undefined,
      copy: true,
    };
  }

  public messages: ThreadMessage[] = [];
  public isRunning = false;

  constructor(public store: ExternalStoreAdapter<any>) {
    this.useStore = create(() => ({
      store,
    }));
  }

  public getBranches(messageId: string): string[] {
    return this.repository.getBranches(messageId);
  }

  public switchToBranch(branchId: string): void {
    this.repository.switchToBranch(branchId);
    this.updateMessages(this.repository.getMessages());
  }

  public async append(message: AppendMessage): Promise<void> {
    if (message.parentId !== (this.messages.at(-1)?.id ?? null)) {
      if (!this.store.onEdit)
        throw new Error("Runtime does not support editing messages.");
      await this.store.onEdit(message);
    } else {
      await this.store.onNew(message);
    }
  }

  public async startRun(parentId: string | null): Promise<void> {
    if (!this.store.onReload)
      throw new Error("Runtime does not support reloading messages.");

    await this.store.onReload(parentId);
  }

  public cancelRun(): void {
    if (!this.store.onCancel)
      throw new Error("Runtime does not support cancelling runs.");

    this.store.onCancel();

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
    this.store.setMessages?.(
      messages.flatMap(getExternalStoreMessage).filter((m) => m != null),
    );
  };

  public onStoreUpdated() {
    if (this.useStore.getState().store !== this.store) {
      this.useStore.setState({ store: this.store });
    }
  }

  private updateData = (isRunning: boolean, vm: ThreadMessage[]) => {
    for (let i = 0; i < vm.length; i++) {
      const message = vm[i]!;
      const parent = vm[i - 1];
      this.repository.addOrUpdateMessage(parent?.id ?? null, message);
    }

    if (this.assistantOptimisticId) {
      this.repository.deleteMessage(this.assistantOptimisticId);
      this.assistantOptimisticId = null;
    }

    if (hasUpcomingMessage(isRunning, vm)) {
      this.assistantOptimisticId = this.repository.appendOptimisticMessage(
        vm.at(-1)?.id ?? null,
        {
          role: "assistant",
          content: [],
        },
      );
    }

    this.repository.resetHead(
      this.assistantOptimisticId ?? vm.at(-1)?.id ?? null,
    );

    this.messages = this.repository.getMessages();
    this.isRunning = isRunning;

    for (const callback of this._subscriptions) callback();
  };

  unstable_synchronizer = () => {
    const { store } = this.useStore();

    useExternalStoreSync(store, this.updateData);

    return null;
  };

  addToolResult(options: AddToolResultOptions) {
    if (!this.store.onAddToolResult)
      throw new Error("Runtime does not support tool results.");
    this.store.onAddToolResult(options);
  }
}
