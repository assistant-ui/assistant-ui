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

describe("asAsyncIterableStream", () => {
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
