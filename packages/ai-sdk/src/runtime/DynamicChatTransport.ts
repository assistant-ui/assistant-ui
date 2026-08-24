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
  transport: ChatTransport<UI_MESSAGE>;
  runtime?: AssistantRuntime | undefined;
  getThreadListItem?:
    | (() => InitializableThreadListItem | undefined)
    | undefined;
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
    this.threadContexts.get(chatId)?.transport ?? this.transport;

  public readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public setTransport(transport: ChatTransport<UI_MESSAGE>) {
    if (this.transport === transport) return;
    this.transport = transport;
    for (const context of this.threadContexts.values()) {
      const previousStorage = getResumableAdapter(context.transport)?.storage;
      context.transport = this.createThreadTransport(transport);
      this.wireTransport(context);
      if (previousStorage !== getResumableAdapter(context.transport)?.storage) {
        this.hasPendingNotification = true;
      }
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
      transport: this.createThreadTransport(this.transport),
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
    this.wireTransport(context);
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
    return context.transport;
  }

  private createThreadTransport(transport: ChatTransport<UI_MESSAGE>) {
    return transport instanceof AssistantChatTransport
      ? transport.__internal_clone()
      : transport;
  }

  private wireTransport(context: ThreadTransportContext<UI_MESSAGE>) {
    if (!(context.transport instanceof AssistantChatTransport)) return;
    if (context.runtime) context.transport.setRuntime(context.runtime);
    if (context.getThreadListItem) {
      context.transport.__internal_setGetThreadListItem(
        context.getThreadListItem,
      );
    }
  }
}
