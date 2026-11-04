import { describe, expect, it } from "vitest";
import { ThreadMutationQueue } from "./thread-mutation-queue";

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

describe("ThreadMutationQueue", () => {
  it("keeps a queued mutation in line when a cancelled one runs afterwards", async () => {
    const queue = new ThreadMutationQueue();
    const first = queue.reserve("thread");
    const second = queue.reserve("thread");

    // Callers do `finally { mutation.cancel() }`, so the same handle can be
    // both cancelled and run; the second bookkeeping pass must not evict the
    // mutations that are still queued behind it.
    first.cancel();
    await first.run(async () => {});

    const third = queue.reserve("thread");
    const order: string[] = [];
    const running = second.run(async () => {
      order.push("second:start");
      await delay(20);
      order.push("second:end");
    });
    await third.run(async () => {
      order.push("third");
    });
    await running;

    expect(order).toEqual(["second:start", "second:end", "third"]);
  });
});
