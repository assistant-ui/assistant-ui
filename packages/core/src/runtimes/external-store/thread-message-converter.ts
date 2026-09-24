import type { ThreadMessage } from "../../types/message";

export type ConverterCallback<TIn> = (
  cache: ThreadMessage | undefined,
  message: TIn,
  idx: number,
) => ThreadMessage;

export class ThreadMessageConverter {
  private readonly cache = new WeakMap<WeakKey, ThreadMessage>();
  private previousInput: readonly WeakKey[] = [];
  private previousOutput: readonly ThreadMessage[] = [];
  private previousReusedPrefix = false;

  /** Prefix reuse requires stable input identities and conversion context for the reused messages. */
  convertMessages<TIn extends WeakKey>(
    messages: readonly TIn[],
    converter: ConverterCallback<TIn>,
    reusePrefix = false,
  ): ThreadMessage[] {
    const maxPrefix =
      reusePrefix && this.previousReusedPrefix
        ? Math.min(this.previousInput.length - 1, messages.length - 1)
        : 0;
    let prefixLength = 0;
    while (
      prefixLength < maxPrefix &&
      this.previousInput[prefixLength] === messages[prefixLength]
    ) {
      prefixLength++;
    }

    const result = this.previousOutput.slice(0, prefixLength);
    for (let idx = prefixLength; idx < messages.length; idx++) {
      const m = messages[idx]!;
      const cached = this.cache.get(m);
      const newMessage = converter(cached, m, idx);
      this.cache.set(m, newMessage);
      result.push(newMessage);
    }
    this.previousInput = messages.slice();
    this.previousOutput = result.slice();
    this.previousReusedPrefix = reusePrefix;
    return result;
  }
}
