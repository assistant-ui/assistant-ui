import { describe, expect, it, vi } from "vitest";
import { abortableIterable } from "./abortableIterable";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const collect = async <T>(iterable: AsyncIterable<T>) => {
  const seen: T[] = [];
  for await (const value of iterable) seen.push(value);
  return seen;
};

describe("abortableIterable", () => {
  it("passes a stream that completes on its own through untouched", async () => {
    async function* source() {
      yield 1;
      yield 2;
    }
    const controller = new AbortController();

    expect(
      await collect(abortableIterable(source(), controller.signal)),
    ).toEqual([1, 2]);
  });

  // the reason this wrapper exists: the source ignores the signal and parks on
  // its own work, so nothing but the abort can end the loop
  it("ends the loop while the source is parked mid-chunk", async () => {
    const hang = deferred<void>();
    const finallyRan = vi.fn();
    async function* source() {
      try {
        yield 1;
        await hang.promise;
        yield 2;
      } finally {
        finallyRan();
      }
    }
    const controller = new AbortController();

    const seen: number[] = [];
    const consuming = (async () => {
      for await (const value of abortableIterable(
        source(),
        controller.signal,
      )) {
        seen.push(value);
      }
    })();
    // let the loop take the first chunk and park awaiting the second
    await new Promise((resolve) => setTimeout(resolve, 0));

    controller.abort();

    // settles even though the source never does
    await consuming;
    expect(seen).toEqual([1]);
    expect(finallyRan).not.toHaveBeenCalled();
  });

  it("finalizes a source still suspended at a yield when the signal aborts", async () => {
    const finallyRan = vi.fn();
    async function* source() {
      try {
        yield 1;
        yield 2;
      } finally {
        finallyRan();
      }
    }
    const controller = new AbortController();

    const seen: number[] = [];
    for await (const value of abortableIterable(source(), controller.signal)) {
      seen.push(value);
      controller.abort();
    }

    expect(seen).toEqual([1]);
    expect(finallyRan).toHaveBeenCalledTimes(1);
  });

  it("reports a stream aborted before the first read as exhausted", async () => {
    const next = vi.fn();
    const controller = new AbortController();
    controller.abort();

    const seen = await collect(
      abortableIterable(
        {
          [Symbol.asyncIterator]: () => ({ next }),
        } as AsyncIterable<number>,
        controller.signal,
      ),
    );

    expect(seen).toEqual([]);
    expect(next).not.toHaveBeenCalled();
  });

  it("propagates a source failure", async () => {
    async function* source() {
      yield 1;
      throw new Error("stream failed");
    }
    const controller = new AbortController();

    await expect(
      collect(abortableIterable(source(), controller.signal)),
    ).rejects.toThrow("stream failed");
  });

  it("finalizes the source when the consumer breaks out", async () => {
    const finallyRan = vi.fn();
    async function* source() {
      try {
        yield 1;
        yield 2;
      } finally {
        finallyRan();
      }
    }
    const controller = new AbortController();

    for await (const _ of abortableIterable(source(), controller.signal)) {
      break;
    }

    // finalized without the break waiting on it
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(finallyRan).toHaveBeenCalledTimes(1);
  });

  it("does not let a source that parks in its own cleanup stall the break", async () => {
    const hang = deferred<void>();
    async function* source() {
      try {
        yield 1;
        yield 2;
      } finally {
        await hang.promise;
      }
    }
    const controller = new AbortController();

    // resolves even though the source's finally never does
    for await (const _ of abortableIterable(source(), controller.signal)) {
      break;
    }
  });

  it("releases its abort listener after each chunk", async () => {
    const controller = new AbortController();
    const added = vi.spyOn(controller.signal, "addEventListener");
    const removed = vi.spyOn(controller.signal, "removeEventListener");
    async function* source() {
      yield 1;
      yield 2;
      yield 3;
    }

    await collect(abortableIterable(source(), controller.signal));

    expect(added).toHaveBeenCalledTimes(removed.mock.calls.length);
    expect(added.mock.calls.length).toBeGreaterThan(0);
  });
});
