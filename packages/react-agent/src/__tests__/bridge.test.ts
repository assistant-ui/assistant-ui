import { describe, it, expect } from "vitest";
import { AsyncEventQueue } from "../bridge/AsyncEventQueue";

describe("AsyncEventQueue", () => {
  it("yields pushed items", async () => {
    const queue = new AsyncEventQueue<number>();
    queue.push(1);
    queue.push(2);
    queue.close();

    const results: number[] = [];
    for await (const item of queue) {
      results.push(item);
    }

    expect(results).toEqual([1, 2]);
  });

  it("yields items pushed after iteration starts", async () => {
    const queue = new AsyncEventQueue<string>();

    const results: string[] = [];
    const done = (async () => {
      for await (const item of queue) {
        results.push(item);
      }
    })();

    // Push after iteration has started
    queue.push("a");
    queue.push("b");

    // Give microtasks a chance to process
    await new Promise((r) => setTimeout(r, 10));

    queue.close();
    await done;

    expect(results).toEqual(["a", "b"]);
  });

  it("close() terminates iteration", async () => {
    const queue = new AsyncEventQueue<number>();

    const results: number[] = [];
    const done = (async () => {
      for await (const item of queue) {
        results.push(item);
      }
    })();

    queue.push(1);
    await new Promise((r) => setTimeout(r, 10));
    queue.close();
    await done;

    expect(results).toEqual([1]);
  });

  it("push after close is ignored", async () => {
    const queue = new AsyncEventQueue<number>();
    queue.push(1);
    queue.close();
    queue.push(2); // should be ignored

    const results: number[] = [];
    for await (const item of queue) {
      results.push(item);
    }

    expect(results).toEqual([1]);
  });

  it("empty queue with immediate close yields nothing", async () => {
    const queue = new AsyncEventQueue<number>();
    queue.close();

    const results: number[] = [];
    for await (const item of queue) {
      results.push(item);
    }

    expect(results).toEqual([]);
  });
});
