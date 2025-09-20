import { v4 as uuidv4 } from "uuid";

export type A2AStateAccumulatorConfig<TMessage> = {
  initialMessages?: TMessage[];
  appendMessage?: (prev: TMessage | undefined, curr: TMessage) => TMessage;
};

export class A2AMessageAccumulator<TMessage extends { id?: string }> {
  private messagesMap = new Map<string, TMessage>();
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
  }: A2AStateAccumulatorConfig<TMessage> = {}) {
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

  public getMessages(): TMessage[] {
    return [...this.messagesMap.values()];
  }

  public clear() {
    this.messagesMap.clear();
  }
}
