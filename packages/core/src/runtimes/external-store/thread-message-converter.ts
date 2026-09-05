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
  private _reusablePrefixLength = 0;

  public get reusablePrefixLength() {
    return this._reusablePrefixLength;
  }

  public resetPrefix() {
    this.previousInput = [];
    this.previousOutput = [];
    this._reusablePrefixLength = 0;
  }

  convertMessages<TIn extends WeakKey>(
    messages: readonly TIn[],
    converter: ConverterCallback<TIn>,
  ): ThreadMessage[] {
    const maxLength = Math.min(this.previousInput.length, messages.length);
    let reusablePrefixLength = 0;
    while (
      reusablePrefixLength < maxLength &&
      this.previousInput[reusablePrefixLength] ===
        messages[reusablePrefixLength]
    ) {
      reusablePrefixLength++;
    }

    const result = this.previousOutput.slice(
      0,
      Math.min(reusablePrefixLength, messages.length),
    );
    for (let idx = result.length; idx < messages.length; idx++) {
      const m = messages[idx]!;
      const cached = this.cache.get(m);
      const newMessage = converter(cached, m, idx);
      this.cache.set(m, newMessage);
      result.push(newMessage);
    }
    this.previousInput = messages.slice();
    this.previousOutput = result;
    this._reusablePrefixLength = reusablePrefixLength;
    return result.slice();
  }
}
