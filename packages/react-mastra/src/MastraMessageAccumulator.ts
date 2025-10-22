import { v4 as uuidv4 } from "uuid";
import type { MastraStateAccumulatorConfig } from "./types";

export class MastraMessageAccumulator<TMessage extends { id?: string }> {
  private messagesMap = new Map<string, TMessage>();
  private appendMessage: (
    prev: TMessage | undefined,
    curr: TMessage,
  ) => TMessage;
  private onMessageUpdate?: (message: TMessage) => void;
  private maxMessages: number;
  private messageOrder: string[] = [];

  constructor({
    initialMessages = [],
    appendMessage = ((_: TMessage | undefined, curr: TMessage) => curr) as (
      prev: TMessage | undefined,
      curr: TMessage,
    ) => TMessage,
    onMessageUpdate,
    maxMessages = 1000, // Prevent memory leaks
  }: MastraStateAccumulatorConfig<TMessage> & { maxMessages?: number } = {}) {
    this.appendMessage = appendMessage;
    this.maxMessages = maxMessages;
    if (onMessageUpdate) {
      this.onMessageUpdate = onMessageUpdate;
    }
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
      const updatedMessage = this.appendMessage(previous, message);
      this.messagesMap.set(messageId, updatedMessage);

      // Track message order for LRU cleanup
      if (!previous) {
        this.messageOrder.push(messageId);
      } else {
        // Move to end (most recently used)
        const index = this.messageOrder.indexOf(messageId);
        if (index > -1) {
          this.messageOrder.splice(index, 1);
          this.messageOrder.push(messageId);
        }
      }

      // Call the update callback if provided
      if (this.onMessageUpdate) {
        this.onMessageUpdate(updatedMessage);
      }
    }

    // Enforce memory limit by removing oldest messages
    this.enforceMemoryLimit();

    return this.getMessages();
  }

  private enforceMemoryLimit() {
    while (this.messagesMap.size > this.maxMessages) {
      const oldestMessageId = this.messageOrder.shift();
      if (oldestMessageId) {
        this.messagesMap.delete(oldestMessageId);
      }
    }
  }

  public getMessages(): TMessage[] {
    // Return messages in order of most recent to oldest
    return this.messageOrder
      .map((id) => this.messagesMap.get(id))
      .filter((msg): msg is TMessage => msg !== undefined);
  }

  /**
   * Reset the accumulator with a new set of messages
   * Used when messages are deleted (e.g., during editing)
   */
  public reset(messages: TMessage[]): void {
    this.messagesMap.clear();
    this.messageOrder = [];

    // Add all messages and rebuild the map, enforcing capacity limits
    for (const message of messages.map(this.ensureMessageId)) {
      const messageId = message.id!; // ensureMessageId guarantees id exists
      this.messagesMap.set(messageId, message);
      this.messageOrder.push(messageId);
    }

    // Enforce memory limit after reset
    this.enforceMemoryLimit();
  }

  public clear() {
    this.messagesMap.clear();
    this.messageOrder = [];
  }

  public cleanup(): void {
    this.clear();
  }

  public getMemoryUsage(): {
    count: number;
    maxCapacity: number;
    utilization: number;
  } {
    return {
      count: this.messagesMap.size,
      maxCapacity: this.maxMessages,
      utilization: this.messagesMap.size / this.maxMessages,
    };
  }
}
