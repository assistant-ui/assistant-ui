import { createTapRoot, flushTapSync, useResource } from "@assistant-ui/tap";
import {
  HarnessResource,
  type HarnessApi,
  type HarnessMethods,
  type HarnessOptions,
  type HarnessSnapshot,
  type SendMessageInput,
} from "./HarnessResource";
import type { HarnessCommand } from "./types";

/**
 * Framework-agnostic harness: drives the HarnessResource tap tree outside of
 * React. Reads are live and writes flush synchronously, so the optimistic
 * update lands in the same tick.
 */
export class Harness<TExtras = unknown> implements HarnessMethods {
  readonly #root: ReturnType<typeof createTapRoot<HarnessApi>>;

  constructor(options: HarnessOptions) {
    this.#root = createTapRoot(function HarnessRoot() {
      return useResource(HarnessResource(options));
    });
  }

  get id(): string {
    return this.#root.getValue().id;
  }

  getState(): HarnessSnapshot<TExtras> {
    return this.#root.getValue() as HarnessSnapshot<TExtras>;
  }

  subscribe(listener: () => void): () => void {
    return this.#root.subscribe(listener);
  }

  dispose(): void {
    this.#root.unmount();
  }

  sendMessage(input: SendMessageInput): void {
    this.#call((h) => h.sendMessage(input));
  }

  addToolResult(input: {
    toolCallId: string;
    output: unknown;
    isError?: boolean;
  }): void {
    this.#call((h) => h.addToolResult(input));
  }

  resume(interruptId: string, value: unknown): void {
    this.#call((h) => h.resume(interruptId, value));
  }

  stop(): void {
    this.#call((h) => h.stop());
  }

  cancelQueued(id: string): void {
    this.#call((h) => h.cancelQueued(id));
  }

  sendNow(id: string): void {
    this.#call((h) => h.sendNow(id));
  }

  sendCommand(command: HarnessCommand): void {
    this.#call((h) => h.sendCommand(command));
  }

  #call(fn: (methods: HarnessMethods) => void): void {
    flushTapSync(() => fn(this.#root.getValue()));
  }
}
