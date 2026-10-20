import { describe, expect, it } from "vitest";
import { createHistoryWriteChain } from "./history-write-chain";

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("createHistoryWriteChain", () => {
  it("starts the first write synchronously and serializes later writes for the same id", async () => {
    const writes = createHistoryWriteChain();
    const firstGate = deferred();
    const secondGate = deferred();
    const calls: string[] = [];

    const first = writes.chain("one", () => {
      calls.push("first");
      return firstGate.promise;
    });
    expect(calls).toEqual(["first"]);

    const second = writes.chain("one", () => {
      calls.push("second");
      return secondGate.promise;
    });
    const third = writes.chain("one", () => {
      calls.push("third");
      return Promise.resolve();
    });
    expect(calls).toEqual(["first"]);
    expect(writes.pending("one")).toBe(third);

    firstGate.resolve();
    await first;
    expect(calls).toEqual(["first", "second"]);
    expect(writes.pending("one")).toBe(third);

    secondGate.resolve();
    await Promise.all([second, third]);
    expect(calls).toEqual(["first", "second", "third"]);
    expect(writes.pending("one")).toBeUndefined();
  });

  it("starts writes for different ids concurrently", async () => {
    const writes = createHistoryWriteChain();
    const firstGate = deferred();
    const calls: string[] = [];

    const first = writes.chain("one", () => {
      calls.push("one");
      return firstGate.promise;
    });
    const second = writes.chain("two", () => {
      calls.push("two");
      return Promise.resolve();
    });

    expect(calls).toEqual(["one", "two"]);
    await second;
    expect(writes.pending("one")).toBe(first);
    expect(writes.pending("two")).toBeUndefined();

    firstGate.resolve();
    await first;
    expect(writes.pending("one")).toBeUndefined();
  });

  it("runs the next write after a rejection", async () => {
    const writes = createHistoryWriteChain();
    const firstGate = deferred();
    const error = new Error("write failed");
    const calls: string[] = [];

    const first = writes.chain("one", () => firstGate.promise);
    const second = writes.chain("one", () => {
      calls.push("second");
      return Promise.resolve();
    });
    firstGate.reject(error);

    await expect(first).rejects.toBe(error);
    await expect(second).resolves.toBeUndefined();
    expect(calls).toEqual(["second"]);
    expect(writes.pending("one")).toBeUndefined();
  });

  it("turns a synchronous throw into a rejected promise and permits a later write", async () => {
    const writes = createHistoryWriteChain();
    const error = new Error("write failed");
    const first = writes.chain("one", () => {
      throw error;
    });
    const second = writes.chain("one", () => Promise.resolve());

    await expect(first).rejects.toBe(error);
    await expect(second).resolves.toBeUndefined();
    expect(writes.pending("one")).toBeUndefined();
  });

  it("allows an in-flight entry to move to another id", async () => {
    const writes = createHistoryWriteChain();
    const firstGate = deferred();
    const first = writes.chain("old", () => firstGate.promise);

    expect(writes.move("old", "new")).toBe(first);
    const second = writes.chain("new", () => Promise.resolve());

    expect(writes.pending("old")).toBeUndefined();
    expect(writes.pending("new")).toBe(second);
    firstGate.resolve();
    await Promise.all([first, second]);
    expect(writes.pending("new")).toBeUndefined();
  });

  it("drops an in-flight entry moved to no id", () => {
    const writes = createHistoryWriteChain();
    const first = writes.chain("old", () => new Promise<void>(() => {}));

    expect(writes.move("old", undefined)).toBe(first);
    expect(writes.pending("old")).toBeUndefined();
    expect(writes.move("old", "new")).toBeUndefined();
  });
});
