"use client";

import type { ThreadMessage } from "../../../utils/AssistantTypes";

export type ConverterCallback<TIn> = (
  message: TIn,
  cache: ThreadMessage | undefined,
) => ThreadMessage;

export class ThreadMessageConverter {
  private readonly cache = new WeakMap<WeakKey, ThreadMessage>();

  convertMessages<TIn extends WeakKey>(
    converter: ConverterCallback<TIn>,
    messages: TIn[],
  ): ThreadMessage[] {
    return messages.map((m) => {
      const cached = this.cache.get(m);
      const newMessage = converter(m, cached);
      this.cache.set(m, newMessage);
      return newMessage;
    });
  }
}
