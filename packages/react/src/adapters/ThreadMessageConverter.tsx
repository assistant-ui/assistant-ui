"use client";
import type { ThreadMessage } from "../utils/context/stores/AssistantTypes";

export class ThreadMessageConverter<TIn extends WeakKey> {
  private readonly cache = new WeakMap<TIn, ThreadMessage>();

  constructor(private readonly converter: (message: TIn) => ThreadMessage) {}

  convertMessages(messages: TIn[]): ThreadMessage[] {
    return messages.map((m) => {
      const cached = this.cache.get(m);
      if (cached) return cached;
      const newMessage = this.converter(m);
      this.cache.set(m, newMessage);
      return newMessage;
    });
  }
}
