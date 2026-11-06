import { describe, expect, it } from "vitest";
import { ThreadMutationQueue } from "./thread-mutation-queue";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("ThreadMutationQueue", () => {
  it("rejects a cancelled handle before its callback can overlap a sibling", async () => {
    const queue = new ThreadMutationQueue();
    const first = queue.reserve("thread");
    first.cancel();
    const second = queue.reserve("thread");
    const gate = deferred();
    const order: string[] = [];

    const cancelledRun = first.run(async () => {
      order.push("cancelled:start");
      await gate.promise;
      order.push("cancelled:end");
    });
    const siblingRun = second.run(async () => {
      order.push("sibling:start");
    });
    const outcomes = Promise.allSettled([cancelledRun, siblingRun]);
    await Promise.resolve();
    const whilePending = [...order];
    gate.resolve();
    await outcomes;

    expect(whilePending).toEqual(["sibling:start"]);
    await expect(cancelledRun).rejects.toThrow(
      "Thread mutation already cancelled or run",
    );
    await expect(siblingRun).resolves.toBeUndefined();
  });

  it("rejects a second run while the first call keeps its sibling queued", async () => {
    const queue = new ThreadMutationQueue();
    const first = queue.reserve("thread");
    const gate = deferred();
    const order: string[] = [];

    const firstRun = first.run(async () => {
      order.push("first:start");
      await gate.promise;
      order.push("first:end");
    });
    const duplicateRun = first.run(async () => {
      order.push("duplicate:start");
    });
    const second = queue.reserve("thread");
    const siblingRun = second.run(async () => {
      order.push("sibling:start");
    });
    const outcomes = Promise.allSettled([firstRun, duplicateRun, siblingRun]);
    await Promise.allSettled([duplicateRun]);
    await Promise.resolve();
    const whilePending = [...order];
    gate.resolve();
    await outcomes;

    expect(whilePending).toEqual(["first:start"]);
    expect(order).toEqual(["first:start", "first:end", "sibling:start"]);
    await expect(firstRun).resolves.toBeUndefined();
    await expect(duplicateRun).rejects.toThrow(
      "Thread mutation already cancelled or run",
    );
    await expect(siblingRun).resolves.toBeUndefined();
  });

  it("allows cleanup with cancel after run completes", async () => {
    const queue = new ThreadMutationQueue();
    const first = queue.reserve("thread");
    const second = queue.reserve("thread");
    const gate = deferred();
    const order: string[] = [];

    const firstRun = (async () => {
      try {
        await first.run(async () => {
          order.push("first:start");
          await gate.promise;
          order.push("first:end");
        });
      } finally {
        first.cancel();
      }
    })();
    const siblingRun = second.run(async () => {
      order.push("sibling:start");
    });
    await Promise.resolve();
    const whilePending = [...order];
    gate.resolve();
    await Promise.all([firstRun, siblingRun]);

    expect(whilePending).toEqual(["first:start"]);
    expect(order).toEqual(["first:start", "first:end", "sibling:start"]);
  });
});
