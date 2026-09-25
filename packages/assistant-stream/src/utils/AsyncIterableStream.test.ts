import { describe, expect, it, vi } from "vitest";
import { asAsyncIterableStream } from "./AsyncIterableStream";

const forcePolyfilledIterator = <T>(
  stream: ReadableStream<T>,
): AsyncIterable<T> & ReadableStream<T> => {
  Object.defineProperty(stream, Symbol.asyncIterator, {
    configurable: true,
    value: undefined,
    writable: true,
  });
  return asAsyncIterableStream(stream);
};

const getIterator = <T>(stream: AsyncIterable<T>) =>
  stream[Symbol.asyncIterator]();

describe("asAsyncIterableStream", () => {
  it("preserves the native iterator", () => {
    const stream = new ReadableStream();
    const iterator = stream[Symbol.asyncIterator];
    expect(asAsyncIterableStream(stream)[Symbol.asyncIterator]).toBe(iterator);
  });

  it("cancels the source when iteration stops early", async () => {
    const cancel = vi.fn();
    const stream = forcePolyfilledIterator(
      new ReadableStream<string>({
        start(controller) {
          controller.enqueue("first");
          controller.enqueue("second");
        },
        cancel,
      }),
    );

    const values: string[] = [];
    for await (const value of stream) {
      values.push(value);
      break;
    }

    expect(values).toEqual(["first"]);
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
  });

  it("does not cancel a fully consumed source", async () => {
    const cancel = vi.fn();
    const stream = forcePolyfilledIterator(
      new ReadableStream<string>({
        start(controller) {
          controller.enqueue("first");
          controller.enqueue("second");
          controller.close();
        },
        cancel,
      }),
    );

    const values: string[] = [];
    for await (const value of stream) {
      values.push(value);
    }

    expect(values).toEqual(["first", "second"]);
    expect(cancel).not.toHaveBeenCalled();
    expect(stream.locked).toBe(false);
  });
});

describe.each(["native", "polyfilled"] as const)(
  "%s stream iterator",
  (kind) => {
    const createStream = <T>(source: UnderlyingDefaultSource<T>) => {
      const stream = new ReadableStream(source);
      return kind === "polyfilled" ? forcePolyfilledIterator(stream) : stream;
    };

    it("cancels before the first read and forwards the return value", async () => {
      const reason = { message: "stop" };
      const cancel = vi.fn();
      const stream = createStream({ cancel });
      const iterator = getIterator(stream);

      expect(stream.locked).toBe(true);
      await expect(iterator.return!(reason)).resolves.toEqual({
        done: true,
        value: reason,
      });
      expect(cancel).toHaveBeenCalledExactlyOnceWith(reason);
      expect(stream.locked).toBe(false);
      await expect(iterator.return!("again")).resolves.toEqual({
        done: true,
        value: "again",
      });
      await expect(iterator.next()).resolves.toEqual({
        done: true,
        value: undefined,
      });
      expect(cancel).toHaveBeenCalledOnce();
    });

    it("forwards the cancellation reason after a read", async () => {
      const cancel = vi.fn();
      const stream = createStream({
        start(controller) {
          controller.enqueue("first");
        },
        cancel,
      });
      const iterator = getIterator(stream);
      await expect(iterator.next()).resolves.toEqual({
        done: false,
        value: "first",
      });
      await expect(iterator.return!("stop")).resolves.toEqual({
        done: true,
        value: "stop",
      });
      expect(cancel).toHaveBeenCalledExactlyOnceWith("stop");
      expect(stream.locked).toBe(false);
    });

    it("releases the lock when cancellation rejects", async () => {
      const error = new Error("cancel failed");
      const cancel = vi.fn(() => Promise.reject(error));
      const stream = createStream({ cancel });
      const iterator = getIterator(stream);
      await expect(iterator.return!("stop")).rejects.toBe(error);
      expect(stream.locked).toBe(false);
      await expect(iterator.next()).resolves.toEqual({
        done: true,
        value: undefined,
      });
      await expect(iterator.return!("again")).resolves.toEqual({
        done: true,
        value: "again",
      });
      expect(cancel).toHaveBeenCalledExactlyOnceWith("stop");
    });

    it("queues return after pending reads", async () => {
      let controller!: ReadableStreamDefaultController<string>;
      const cancel = vi.fn();
      const stream = createStream<string>({
        start(value) {
          controller = value;
        },
        cancel,
      });
      const iterator = getIterator(stream);
      const first = iterator.next();
      const second = iterator.next();
      const returned = iterator.return!("stop");
      controller.enqueue("first");
      await expect(first).resolves.toEqual({ done: false, value: "first" });
      expect(cancel).not.toHaveBeenCalled();
      controller.enqueue("second");
      await expect(second).resolves.toEqual({ done: false, value: "second" });
      await expect(returned).resolves.toEqual({ done: true, value: "stop" });
      expect(cancel).toHaveBeenCalledExactlyOnceWith("stop");
      expect(stream.locked).toBe(false);
    });

    it("releases the lock while cancellation is pending", async () => {
      let notify!: () => void;
      let finish!: () => void;
      const invoked = new Promise<void>((resolve) => {
        notify = resolve;
      });
      const cancellation = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const stream = createStream({
        start(controller) {
          controller.enqueue("first");
        },
        cancel() {
          notify();
          return cancellation;
        },
      });
      const iterator = getIterator(stream);
      await iterator.next();
      let returned = false;
      const result = iterator.return!("stop").then((value) => {
        returned = true;
        return value;
      });
      await invoked;
      expect(stream.locked).toBe(false);
      expect(returned).toBe(false);
      finish();
      await expect(result).resolves.toEqual({ done: true, value: "stop" });
    });

    it("finishes queued operations after a read error without cancelling", async () => {
      const error = new Error("read failed");
      const cancel = vi.fn();
      const stream = createStream({
        start(controller) {
          controller.error(error);
        },
        cancel,
      });
      const iterator = getIterator(stream);
      const first = iterator.next();
      const second = iterator.next();
      const returned = iterator.return!("stop");
      await expect(first).rejects.toBe(error);
      await expect(second).resolves.toEqual({ done: true, value: undefined });
      await expect(returned).resolves.toEqual({ done: true, value: "stop" });
      expect(cancel).not.toHaveBeenCalled();
      expect(stream.locked).toBe(false);
    });

    it("finishes queued operations after natural completion without cancelling", async () => {
      const cancel = vi.fn();
      const stream = createStream({
        start(controller) {
          controller.close();
        },
        cancel,
      });
      const iterator = getIterator(stream);
      const first = iterator.next();
      const second = iterator.next();
      const returned = iterator.return!("stop");
      await expect(first).resolves.toEqual({ done: true, value: undefined });
      await expect(second).resolves.toEqual({ done: true, value: undefined });
      await expect(returned).resolves.toEqual({ done: true, value: "stop" });
      expect(cancel).not.toHaveBeenCalled();
      expect(stream.locked).toBe(false);
    });
    it.each([false, true])(
      "disposes the iterator (completed: %s)",
      async (completed) => {
        const cancel = vi.fn();
        const stream = createStream({
          start(controller) {
            if (completed) controller.close();
          },
          cancel,
        });
        const iterator = stream[Symbol.asyncIterator]();
        if (completed) await iterator.next();
        await iterator[Symbol.asyncDispose]();
        expect(stream.locked).toBe(false);
        expect(cancel).toHaveBeenCalledTimes(completed ? 0 : 1);
        if (!completed) expect(cancel).toHaveBeenCalledWith(undefined);
      },
    );
  },
);

describe("polyfilled iterator throw", () => {
  it("queues throw after a pending read", async () => {
    let controller!: ReadableStreamDefaultController<string>;
    const cancel = vi.fn();
    const stream = forcePolyfilledIterator(
      new ReadableStream<string>({
        start(value) {
          controller = value;
        },
        cancel,
      }),
    );
    const iterator = getIterator(stream);
    const next = iterator.next();
    const error = new Error("stop");
    const thrown = expect(iterator.throw!(error)).rejects.toBe(error);
    expect(cancel).not.toHaveBeenCalled();
    controller.enqueue("first");
    await expect(next).resolves.toEqual({ done: false, value: "first" });
    await thrown;
    expect(cancel).toHaveBeenCalledExactlyOnceWith(undefined);
    expect(stream.locked).toBe(false);
  });

  it("releases the lock when cancellation during throw rejects", async () => {
    const error = new Error("cancel failed");
    const stream = forcePolyfilledIterator(
      new ReadableStream({
        cancel: () => Promise.reject(error),
      }),
    );
    const iterator = getIterator(stream);
    await expect(iterator.throw!(new Error("stop"))).rejects.toBe(error);
    expect(stream.locked).toBe(false);
    await expect(iterator.next()).resolves.toEqual({
      done: true,
      value: undefined,
    });
  });
  it.each([false, true])(
    "cancels and releases the lock (started: %s)",
    async (started) => {
      const cancel = vi.fn();
      const stream = forcePolyfilledIterator(
        new ReadableStream({
          start(controller) {
            controller.enqueue("first");
          },
          cancel,
        }),
      );
      const iterator = stream[Symbol.asyncIterator]();
      if (started) await iterator.next();
      const error = new Error("stop");
      await expect(iterator.throw!(error)).rejects.toBe(error);
      expect(cancel).toHaveBeenCalledExactlyOnceWith(undefined);
      expect(stream.locked).toBe(false);
      await expect(iterator.next()).resolves.toEqual({
        done: true,
        value: undefined,
      });
      await expect(iterator.throw!(error)).rejects.toBe(error);
      expect(cancel).toHaveBeenCalledOnce();
    },
  );
});
