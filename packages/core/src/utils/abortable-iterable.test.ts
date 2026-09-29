import { describe, expect, it, vi } from "vitest";
import { abortableIterable, openAbortableIterable } from "./abortable-iterable";

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
  it.each([false, true])(
    "releases the opening abort listener on rejection=%s",
    async (fails) => {
      const controller = new AbortController();
      const added = vi.spyOn(controller.signal, "addEventListener");
      const removed = vi.spyOn(controller.signal, "removeEventListener");
      const source: AsyncIterable<number> = {
        async *[Symbol.asyncIterator]() {
          yield 1;
        },
      };
      const opening = openAbortableIterable(
        fails ? Promise.reject(new Error("opening failed")) : source,
        controller.signal,
      );
      if (fails) await expect(opening).rejects.toThrow("opening failed");
      else await expect(opening).resolves.toBe(source);
      expect(added).toHaveBeenCalledTimes(1);
      expect(removed).toHaveBeenCalledWith("abort", added.mock.calls[0]![1]);
    },
  );

  it("finalizes once when an aborted read later rejects", async () => {
    let rejectRead!: (error: unknown) => void;
    const read = new Promise<IteratorResult<number>>((_, reject) => {
      rejectRead = reject;
    });
    const finalize = vi.fn(async () => ({
      done: true as const,
      value: undefined,
    }));
    const source: AsyncIterable<number> = {
      [Symbol.asyncIterator]: () => ({ next: () => read, return: finalize }),
    };
    const controller = new AbortController();
    const iterator = abortableIterable(source, controller.signal)[
      Symbol.asyncIterator
    ]();
    const pending = iterator.next();
    controller.abort();
    await expect(pending).resolves.toEqual({ done: true, value: undefined });
    expect(finalize).toHaveBeenCalledTimes(1);
    rejectRead(new Error("late failure"));
    await read.catch(() => {});
    await iterator.return?.();
    expect(finalize).toHaveBeenCalledTimes(1);
  });

  it("releases the listener and finalizes after a synchronous read failure", async () => {
    const controller = new AbortController();
    const added = vi.spyOn(controller.signal, "addEventListener");
    const removed = vi.spyOn(controller.signal, "removeEventListener");
    const error = new Error("read failed");
    const finalize = vi.fn(async () => ({
      done: true as const,
      value: undefined,
    }));
    const source: AsyncIterable<number> = {
      [Symbol.asyncIterator]: () => ({
        next: () => {
          throw error;
        },
        return: finalize,
      }),
    };
    await expect(
      collect(abortableIterable(source, controller.signal)),
    ).rejects.toBe(error);
    expect(removed).toHaveBeenCalledWith("abort", added.mock.calls[0]![1]);
    expect(finalize).toHaveBeenCalledTimes(1);
    controller.abort();
    expect(finalize).toHaveBeenCalledTimes(1);
  });

  it("does not read or finalize again after the consumer returns", async () => {
    const next = vi.fn(async () => ({ done: false as const, value: 1 }));
    const finalize = vi.fn(async () => ({
      done: true as const,
      value: undefined,
    }));
    const source: AsyncIterable<number> = {
      [Symbol.asyncIterator]: () => ({ next, return: finalize }),
    };
    const iterator = abortableIterable(source, new AbortController().signal)[
      Symbol.asyncIterator
    ]();
    await iterator.return?.();
    await iterator.return?.();
    await expect(iterator.next()).resolves.toEqual({
      done: true,
      value: undefined,
    });
    expect(next).not.toHaveBeenCalled();
    expect(finalize).toHaveBeenCalledTimes(1);
  });

  it("does not finalize a naturally exhausted source", async () => {
    const next = vi.fn(async () => ({ done: true as const, value: undefined }));
    const finalize = vi.fn(async () => ({
      done: true as const,
      value: undefined,
    }));
    const source: AsyncIterable<number> = {
      [Symbol.asyncIterator]: () => ({ next, return: finalize }),
    };
    const iterator = abortableIterable(source, new AbortController().signal)[
      Symbol.asyncIterator
    ]();
    await iterator.next();
    await iterator.next();
    await iterator.return?.();
    expect(next).toHaveBeenCalledTimes(1);
    expect(finalize).not.toHaveBeenCalled();
  });

  it("settles an opening stream on abort and finalizes a late iterable", async () => {
    const opened = deferred<AsyncIterable<number>>();
    const finalize = vi.fn(async () => ({
      done: true as const,
      value: undefined,
    }));
    const controller = new AbortController();

    const opening = openAbortableIterable(opened.promise, controller.signal);
    controller.abort();

    await expect(opening).resolves.toBeUndefined();
    opened.resolve({
      [Symbol.asyncIterator]: () => ({
        next: () => Promise.resolve({ done: true, value: undefined }),
        return: finalize,
      }),
    });
    await vi.waitFor(() => expect(finalize).toHaveBeenCalledTimes(1));
  });

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

  it("finalizes a source after its next call rejects", async () => {
    const finalize = vi.fn(async () => ({
      done: true as const,
      value: undefined,
    }));
    const source: AsyncIterable<number> = {
      [Symbol.asyncIterator]: () => ({
        next: () => Promise.reject(new Error("stream failed")),
        return: finalize,
      }),
    };
    const controller = new AbortController();

    await expect(
      collect(abortableIterable(source, controller.signal)),
    ).rejects.toThrow("stream failed");
    expect(finalize).toHaveBeenCalledTimes(1);
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
