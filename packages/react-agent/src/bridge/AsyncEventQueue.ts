/**
 * Async queue that converts push-based callbacks to pull-based async iteration.
 */
export class AsyncEventQueue<T> {
  private queue: T[] = [];
  private resolve: (() => void) | null = null;
  private closed = false;

  push(item: T): void {
    if (this.closed) return;
    this.queue.push(item);
    this.resolve?.();
    this.resolve = null;
  }

  close(): void {
    this.closed = true;
    this.resolve?.();
    this.resolve = null;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<T, void> {
    while (true) {
      while (this.queue.length > 0) {
        yield this.queue.shift()!;
      }
      if (this.closed) return;
      await new Promise<void>((r) => {
        this.resolve = r;
      });
    }
  }
}
