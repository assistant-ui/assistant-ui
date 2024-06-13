"use client";

import type { ThreadMessage } from "../../../utils/AssistantTypes";

export type ConverterCallback<TIn> = (
  message: TIn,
  cache: ThreadMessage | undefined,
) => ThreadMessage;

export class ThreadMessageConverter {
  private readonly cache = new WeakMap<WeakKey, ThreadMessage>();

  convertMessages<TIn extends WeakKey>(
    messages: TIn[],
    converter: ConverterCallback<TIn>,
    keyMapper: (m: TIn) => WeakKey = (key) => key,
  ): ThreadMessage[] {
    return messages.map((m) => {
      const key = keyMapper(m);
      const cached = this.cache.get(key);
      const newMessage = converter(m, cached);
      this.cache.set(key, newMessage);
      return newMessage;
    });
  }
}
