import { ThreadMessage } from "../../types";

export type ConverterCallback<TIn> = (
  cache: ThreadMessage | undefined,
  message: TIn,
  idx: number,
) => ThreadMessage;

export class ThreadMessageConverter {
  private readonly cache = new WeakMap<WeakKey, ThreadMessage>();

  convertMessages<TIn extends WeakKey>(
    messages: TIn[],
    converter: ConverterCallback<TIn>,
    keyMapper: (m: TIn) => WeakKey = (key) => key,
  ): ThreadMessage[] {
    return messages.map((m, idx) => {
      const key = keyMapper(m);
      const cached = this.cache.get(key);
      const newMessage = converter(cached, m, idx);
      this.cache.set(key, newMessage);
      return newMessage;
    });
  }
}
