import { v4 as uuidv4 } from "uuid";
import type {
  LangGraphTupleMetadata,
  RemoveUIMessage,
  UIMessage,
} from "./types";

export type LangGraphStateAccumulatorConfig<TMessage> = {
  initialMessages?: TMessage[];
  initialUIMessages?: UIMessage[];
  appendMessage?: (prev: TMessage | undefined, curr: TMessage) => TMessage;
};

export class LangGraphMessageAccumulator<TMessage extends { id?: string }> {
  private messagesMap = new Map<string, TMessage>();
  private metadataMap = new Map<string, LangGraphTupleMetadata>();
  private uiMessages: UIMessage[] = [];
  private appendMessage: (
    prev: TMessage | undefined,
    curr: TMessage,
  ) => TMessage;

  constructor({
    initialMessages = [],
    initialUIMessages = [],
    appendMessage = ((_: TMessage | undefined, curr: TMessage) => curr) as (
      prev: TMessage | undefined,
      curr: TMessage,
    ) => TMessage,
  }: LangGraphStateAccumulatorConfig<TMessage> = {}) {
    this.appendMessage = appendMessage;
    this.addMessages(initialMessages);
    this.uiMessages = [...initialUIMessages];
  }

  private ensureMessageId(message: TMessage): TMessage {
    return message.id ? message : { ...message, id: uuidv4() };
  }

  public addMessages(newMessages: TMessage[]) {
    if (newMessages.length === 0) return this.getMessages();

    for (const message of newMessages.map(this.ensureMessageId)) {
      const messageId = message.id!; // ensureMessageId guarantees id exists
      const previous = this.messagesMap.get(messageId);
      this.messagesMap.set(messageId, this.appendMessage(previous, message));
    }
    return this.getMessages();
  }

  public addMessageWithMetadata(
    message: TMessage,
    metadata: LangGraphTupleMetadata,
  ) {
    const messageWithId = this.ensureMessageId(message);
    const messageId = messageWithId.id!;

    const previous = this.messagesMap.get(messageId);
    this.messagesMap.set(
      messageId,
      this.appendMessage(previous, messageWithId),
    );

    const existingMetadata = this.metadataMap.get(messageId);
    this.metadataMap.set(messageId, { ...existingMetadata, ...metadata });

    return this.getMessages();
  }

  public getMessages(): TMessage[] {
    return [...this.messagesMap.values()];
  }

  public getMetadataMap(): Map<string, LangGraphTupleMetadata> {
    return this.metadataMap;
  }

  public replaceMessages(newMessages: TMessage[]): TMessage[] {
    this.messagesMap.clear();
    this.metadataMap.clear();

    for (const message of newMessages.map(this.ensureMessageId)) {
      this.messagesMap.set(message.id!, message);
    }
    return this.getMessages();
  }

  // upsert-only: tuple-only messages (e.g. subgraph internals absent from parent `values`) are preserved
  public reconcileMessages(serverMessages: TMessage[]): TMessage[] {
    for (const message of serverMessages.map(this.ensureMessageId)) {
      this.messagesMap.set(message.id!, message);
    }
    return this.getMessages();
  }

  public applyUIUpdate(
    update:
      | UIMessage
      | RemoveUIMessage
      | readonly (UIMessage | RemoveUIMessage)[],
  ): UIMessage[] {
    const events = Array.isArray(update)
      ? update
      : [update as UIMessage | RemoveUIMessage];
    let newState = this.uiMessages.slice();
    for (const event of events) {
      if (event.type === "remove-ui") {
        newState = newState.filter((ui) => ui.id !== event.id);
        continue;
      }
      // newState.findIndex (not state): forward semantics avoids upstream batch aliasing
      const index = newState.findIndex((ui) => ui.id === event.id);
      if (index !== -1) {
        const shouldMerge =
          typeof event.metadata === "object" &&
          event.metadata != null &&
          event.metadata.merge === true;
        newState[index] = shouldMerge
          ? { ...event, props: { ...newState[index]!.props, ...event.props } }
          : event;
      } else {
        newState.push(event);
      }
    }
    this.uiMessages = newState;
    return this.getUIMessages();
  }

  public replaceUIMessages(newUIMessages: UIMessage[]): UIMessage[] {
    this.uiMessages = [...newUIMessages];
    return this.getUIMessages();
  }

  public getUIMessages(): UIMessage[] {
    return [...this.uiMessages];
  }

  public clear() {
    this.messagesMap.clear();
    this.metadataMap.clear();
    this.uiMessages = [];
  }
}
