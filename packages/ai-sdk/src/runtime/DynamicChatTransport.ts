import type { AssistantRuntime } from "@assistant-ui/core";
import type { UIMessage } from "@ai-sdk/react";
import type { ChatTransport } from "ai";
import {
  AssistantChatTransport,
  type InitializableThreadListItem,
} from "../transport/AssistantChatTransport";

const getResumableStorage = <UI_MESSAGE extends UIMessage>(
  transport: ChatTransport<UI_MESSAGE>,
) => {
  if (transport instanceof AssistantChatTransport) {
    return transport.getResumableAdapter()?.storage;
  }
  const getAdapter = (
    transport as {
      getResumableAdapter?: () => { storage?: unknown } | undefined;
    }
  ).getResumableAdapter;
  return typeof getAdapter === "function"
    ? getAdapter.call(transport)?.storage
    : undefined;
};

export class DynamicChatTransport<
  UI_MESSAGE extends UIMessage,
> implements ChatTransport<UI_MESSAGE> {
  private readonly listeners = new Set<() => void>();
  private hasPendingNotification = false;
  private runtime: AssistantRuntime | undefined;
  private getThreadListItem:
    | (() => InitializableThreadListItem | undefined)
    | undefined;

  constructor(private transport: ChatTransport<UI_MESSAGE>) {}

  public readonly sendMessages: ChatTransport<UI_MESSAGE>["sendMessages"] = (
    options,
  ) => this.transport.sendMessages(options);

  public readonly reconnectToStream: ChatTransport<UI_MESSAGE>["reconnectToStream"] =
    (options) => this.transport.reconnectToStream(options);

  public readonly getCurrentTransport = () => this.transport;

  public readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public setTransport(transport: ChatTransport<UI_MESSAGE>) {
    if (this.transport === transport) return;
    const previousStorage = getResumableStorage(this.transport);
    this.transport = transport;
    this.wireTransport();
    if (previousStorage !== getResumableStorage(transport)) {
      this.hasPendingNotification = true;
    }
  }

  public flushTransportChange() {
    if (!this.hasPendingNotification) return;
    this.hasPendingNotification = false;
    for (const listener of this.listeners) listener();
  }

  public setRuntime(runtime: AssistantRuntime) {
    this.runtime = runtime;
    this.wireTransport();
  }

  public setGetThreadListItem(
    getThreadListItem: () => InitializableThreadListItem | undefined,
  ) {
    this.getThreadListItem = getThreadListItem;
    this.wireTransport();
  }

  private wireTransport() {
    if (!(this.transport instanceof AssistantChatTransport)) return;
    if (this.runtime) this.transport.setRuntime(this.runtime);
    if (this.getThreadListItem) {
      this.transport.__internal_setGetThreadListItem(this.getThreadListItem);
    }
  }
}
