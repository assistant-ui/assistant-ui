import { v4 as uuidv4 } from "uuid";
import type { LangGraphTupleMetadata } from "./types";

export type LangGraphStateAccumulatorConfig<TMessage> = {
  initialMessages?: TMessage[];
  appendMessage?: (prev: TMessage | undefined, curr: TMessage) => TMessage;
};

export class LangGraphMessageAccumulator<TMessage extends { id?: string }> {
  private messagesMap = new Map<string, TMessage>();
  private metadataMap = new Map<string, LangGraphTupleMetadata>();
  private appendMessage: (
    prev: TMessage | undefined,
    curr: TMessage,
  ) => TMessage;

  constructor({
    initialMessages = [],
    appendMessage = ((_: TMessage | undefined, curr: TMessage) => curr) as (
      prev: TMessage | undefined,
      curr: TMessage,
    ) => TMessage,
  }: LangGraphStateAccumulatorConfig<TMessage> = {}) {
    this.appendMessage = appendMessage;
    this.addMessages(initialMessages);
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

  public clear() {
    this.messagesMap.clear();
    this.metadataMap.clear();
  }
}
