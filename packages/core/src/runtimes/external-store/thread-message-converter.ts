import type { ThreadMessage } from "../../types/message";

export type ConverterCallback<TIn> = (
  cache: ThreadMessage | undefined,
  message: TIn,
  idx: number,
) => ThreadMessage;

export class ThreadMessageConverter {
  private readonly cache = new WeakMap<WeakKey, ThreadMessage>();

  setCachedMessage(message: WeakKey, converted: ThreadMessage): void {
    this.cache.set(message, converted);
  }

  deleteCachedMessage(message: WeakKey): void {
    this.cache.delete(message);
  }

  convertMessages<TIn extends WeakKey>(
    messages: readonly TIn[],
    converter: ConverterCallback<TIn>,
  ): ThreadMessage[] {
    return messages.map((m, idx) => {
      const cached = this.cache.get(m);
      const newMessage = converter(cached, m, idx);
      this.cache.set(m, newMessage);
      return newMessage;
    });
  }
}
