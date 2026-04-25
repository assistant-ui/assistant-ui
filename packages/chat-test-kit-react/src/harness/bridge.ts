import type { AssistantEvent } from "@assistant-ui/chat-test-kit-core";

type Resolver = (value: AssistantEvent | "end") => void;

export class EventBridge {
  private queue: AssistantEvent[] = [];
  private ended = false;
  private waiting: Resolver | null = null;

  push(event: AssistantEvent): void {
    if (this.ended) {
      throw new Error("EventBridge: push() after end()");
    }
    if (this.waiting) {
      const resolve = this.waiting;
      this.waiting = null;
      resolve(event);
      return;
    }
    this.queue.push(event);
  }

  end(): void {
    if (this.ended) return;
    this.ended = true;
    if (this.waiting) {
      const resolve = this.waiting;
      this.waiting = null;
      resolve("end");
    }
  }

  reset(): void {
    this.queue = [];
    this.ended = false;
    this.waiting = null;
  }

  async *consume(): AsyncGenerator<AssistantEvent, void> {
    for (;;) {
      if (this.queue.length > 0) {
        yield this.queue.shift()!;
        continue;
      }
      if (this.ended) return;
      const next = await new Promise<AssistantEvent | "end">((resolve) => {
        this.waiting = resolve;
      });
      if (next === "end") return;
      yield next;
    }
  }
}
