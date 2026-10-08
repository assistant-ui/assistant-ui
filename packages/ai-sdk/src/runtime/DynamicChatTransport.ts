import type { AssistantRuntime } from "@assistant-ui/core";
import type { UIMessage } from "@ai-sdk/react";
import type { ChatTransport } from "ai";
import {
  AssistantChatTransport,
  type InitializableThreadListItem,
} from "../transport/AssistantChatTransport";
import type { ResumableClientStorage } from "../transport/resumable";
import { getResumableAdapter } from "./getResumableAdapter";

const resumedStreamIdsByStorage = new WeakMap<
  ResumableClientStorage,
  Set<string>
>();

export const getResumedStreamIds = (
  storage: ResumableClientStorage | undefined,
) => {
  if (!storage) return new Set<string>();
  let resumedStreamIds = resumedStreamIdsByStorage.get(storage);
  if (!resumedStreamIds) {
    resumedStreamIds = new Set();
    resumedStreamIdsByStorage.set(storage, resumedStreamIds);
  }
  return resumedStreamIds;
};

type ResumableStorageSubscription = {
  listener: () => void;
  threadId: string | undefined;
  unsubscribe: (() => void) | undefined;
};

class DynamicResumableStorage implements ResumableClientStorage {
  private readonly subscriptions = new Set<ResumableStorageSubscription>();
  private storage: ResumableClientStorage | undefined;
  private resumedStreamIds: Set<string>;
  private hasPendingNotification = false;

  constructor(storage: ResumableClientStorage | undefined) {
    this.storage = storage;
    this.resumedStreamIds = getResumedStreamIds(storage);
  }

  public setStorage(storage: ResumableClientStorage | undefined) {
    if (this.storage === storage) return;
    this.storage = storage;
    const nextResumedStreamIds = getResumedStreamIds(storage);
    for (const streamId of this.resumedStreamIds) {
      nextResumedStreamIds.add(streamId);
    }
    this.resumedStreamIds = nextResumedStreamIds;
    this.hasPendingNotification = true;
  }

  public flushChange() {
    if (!this.hasPendingNotification) return;
    this.hasPendingNotification = false;
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe?.();
      subscription.unsubscribe = this.storage?.subscribe?.(
        subscription.listener,
        subscription.threadId,
      );
      subscription.listener();
    }
  }

  public getResumedStreamIds() {
    return this.resumedStreamIds;
  }

  public getStreamId(threadId?: string) {
    return this.storage?.getStreamId(threadId) ?? null;
  }

  public setStreamId(id: string, threadId?: string) {
    this.storage?.setStreamId(id, threadId);
  }

  public clear(threadId?: string) {
    this.storage?.clear(threadId);
  }

  public subscribe(listener: () => void, threadId?: string) {
    const subscription: ResumableStorageSubscription = {
      listener,
      threadId,
      unsubscribe: this.storage?.subscribe?.(listener, threadId),
    };
    this.subscriptions.add(subscription);
    return () => {
      this.subscriptions.delete(subscription);
      subscription.unsubscribe?.();
    };
  }
}

type ThreadTransportContext<UI_MESSAGE extends UIMessage> = {
  owner: object;
  sourceTransport?: ChatTransport<UI_MESSAGE> | undefined;
  transport?: ChatTransport<UI_MESSAGE> | undefined;
  runtime?: AssistantRuntime | undefined;
  getThreadListItem?:
    | (() => InitializableThreadListItem | undefined)
    | undefined;
};

type ThreadTransportBinding = {
  runtime: AssistantRuntime;
  getThreadListItem: () => InitializableThreadListItem | undefined;
};

export class DynamicChatTransport<
  UI_MESSAGE extends UIMessage,
> implements ChatTransport<UI_MESSAGE> {
  private readonly threadContexts = new Map<
    string,
    ThreadTransportContext<UI_MESSAGE>
  >();
  private transport: ChatTransport<UI_MESSAGE>;
  private readonly resumableStorage: DynamicResumableStorage;

  constructor(transport: ChatTransport<UI_MESSAGE>) {
    this.transport = transport;
    this.resumableStorage = new DynamicResumableStorage(
      getResumableAdapter(transport)?.storage,
    );
  }

  public readonly sendMessages: ChatTransport<UI_MESSAGE>["sendMessages"] = (
    options,
  ) => this.getTransport(options.chatId).sendMessages(options);

  public readonly reconnectToStream: ChatTransport<UI_MESSAGE>["reconnectToStream"] =
    (options) => this.getTransport(options.chatId).reconnectToStream(options);

  public readonly getCurrentTransport = (chatId: string) =>
    this.getThreadTransport(this.threadContexts.get(chatId)) ?? this.transport;

  public readonly getCurrentResumableStorage = () => this.resumableStorage;

  public readonly getResumedStreamIds = () =>
    this.resumableStorage.getResumedStreamIds();

  public createThreadProxy(
    owner: object,
    getBinding: () => ThreadTransportBinding,
  ): ChatTransport<UI_MESSAGE> {
    return {
      sendMessages: (options) =>
        this.getOrCreateBoundTransport(
          options.chatId,
          owner,
          getBinding,
        ).sendMessages(options),
      reconnectToStream: (options) =>
        this.getOrCreateBoundTransport(
          options.chatId,
          owner,
          getBinding,
        ).reconnectToStream(options),
    };
  }

  public setTransport(transport: ChatTransport<UI_MESSAGE>) {
    if (this.transport === transport) return;
    this.transport = transport;
    this.resumableStorage.setStorage(getResumableAdapter(transport)?.storage);
  }

  public flushTransportChange() {
    this.resumableStorage.flushChange();
  }

  public registerThread(chatId: string, owner: object) {
    const existing = this.threadContexts.get(chatId);
    if (existing?.owner === owner) return;
    this.threadContexts.set(chatId, {
      owner,
    });
  }

  public setThreadContext(
    chatId: string,
    owner: object,
    runtime: AssistantRuntime,
    getThreadListItem: () => InitializableThreadListItem | undefined,
  ) {
    this.registerThread(chatId, owner);
    const context = this.threadContexts.get(chatId)!;
    context.runtime = runtime;
    context.getThreadListItem = getThreadListItem;
    if (context.transport === undefined) {
      this.getThreadTransport(context);
      return;
    }
    if (
      context.sourceTransport === this.transport &&
      context.transport !== undefined
    ) {
      this.wireTransport(context, context.transport);
    }
  }

  public unregisterThread(chatId: string, owner: object) {
    if (this.threadContexts.get(chatId)?.owner === owner) {
      this.threadContexts.delete(chatId);
    }
  }

  private getTransport(chatId: string) {
    const context = this.threadContexts.get(chatId);
    if (!context) {
      throw new Error(
        `DynamicChatTransport has no registered context for chat "${chatId}"`,
      );
    }
    return this.getThreadTransport(context)!;
  }

  private getBoundTransport(
    chatId: string,
    owner: object,
    binding: ThreadTransportBinding,
  ) {
    this.registerThread(chatId, owner);
    const context = this.threadContexts.get(chatId)!;
    context.runtime = binding.runtime;
    context.getThreadListItem = binding.getThreadListItem;
    return this.getThreadTransport(context)!;
  }

  private getOrCreateBoundTransport(
    chatId: string,
    owner: object,
    getBinding: () => ThreadTransportBinding,
  ) {
    const context = this.threadContexts.get(chatId);
    return context?.owner === owner
      ? this.getThreadTransport(context)!
      : this.getBoundTransport(chatId, owner, getBinding());
  }

  private getThreadTransport(
    context: ThreadTransportContext<UI_MESSAGE> | undefined,
  ) {
    if (!context) return undefined;
    if (context.sourceTransport !== this.transport) {
      context.transport = this.createThreadTransport(this.transport);
      context.sourceTransport = this.transport;
    }
    this.wireTransport(context, context.transport!);
    return context.transport!;
  }

  private createThreadTransport(transport: ChatTransport<UI_MESSAGE>) {
    return transport instanceof AssistantChatTransport
      ? transport.__internal_clone()
      : transport;
  }

  private wireTransport(
    context: ThreadTransportContext<UI_MESSAGE>,
    transport: ChatTransport<UI_MESSAGE>,
  ) {
    if (!(transport instanceof AssistantChatTransport)) return;
    if (context.runtime) transport.setRuntime(context.runtime);
    if (context.getThreadListItem) {
      transport.__internal_setGetThreadListItem(context.getThreadListItem);
    }
  }
}
