import type { AssistantRuntime } from "@assistant-ui/core";
import type { UIMessage } from "@ai-sdk/react";
import type { ChatTransport } from "ai";
import {
  AssistantChatTransport,
  type InitializableThreadListItem,
} from "../transport/AssistantChatTransport";
import { getResumableAdapter } from "./getResumableAdapter";

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
  private readonly listeners = new Set<() => void>();
  private readonly threadContexts = new Map<
    string,
    ThreadTransportContext<UI_MESSAGE>
  >();
  private hasPendingNotification = false;
  private transport: ChatTransport<UI_MESSAGE>;

  constructor(transport: ChatTransport<UI_MESSAGE>) {
    this.transport = transport;
  }

  public readonly sendMessages: ChatTransport<UI_MESSAGE>["sendMessages"] = (
    options,
  ) => this.getTransport(options.chatId).sendMessages(options);

  public readonly reconnectToStream: ChatTransport<UI_MESSAGE>["reconnectToStream"] =
    (options) => this.getTransport(options.chatId).reconnectToStream(options);

  public readonly getCurrentTransport = (chatId: string) =>
    this.getThreadTransport(this.threadContexts.get(chatId)) ?? this.transport;

  public readonly getCurrentSourceTransport = () => this.transport;

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

  public readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public setTransport(transport: ChatTransport<UI_MESSAGE>) {
    if (this.transport === transport) return;
    const previousStorage = getResumableAdapter(this.transport)?.storage;
    this.transport = transport;
    if (previousStorage !== getResumableAdapter(transport)?.storage) {
      this.hasPendingNotification = true;
    }
  }

  public flushTransportChange() {
    if (!this.hasPendingNotification) return;
    this.hasPendingNotification = false;
    for (const listener of this.listeners) listener();
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
    this.getBoundTransport(chatId, owner, {
      runtime,
      getThreadListItem,
    });
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
      context.sourceTransport = this.transport;
      context.transport = this.createThreadTransport(this.transport);
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
