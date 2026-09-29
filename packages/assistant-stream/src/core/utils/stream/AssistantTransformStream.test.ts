import { describe, expect, it, vi } from "vitest";
import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import { AssistantTransformStream } from "./AssistantTransformStream";
import { promiseWithResolvers } from "../../../utils/promiseWithResolvers";

const createIdleChild = (emitFirstChunk = false) => {
  const cancel = vi.fn();
  const stream = new ReadableStream<AssistantStreamChunk>({
    start(controller) {
      if (emitFirstChunk) {
        controller.enqueue({
          type: "part-start",
          path: [],
          part: { type: "text" },
        });
      }
    },
    cancel,
  });
  return { stream, cancel };
};

describe("AssistantTransformStream", () => {
  it("cancels a stream before its first output is read", async () => {
    const child = createIdleChild();
    const transform = new AssistantTransformStream({
      start(controller) {
        controller.merge(child.stream);
      },
    });
    await transform.readable.cancel();
    expect(child.cancel).toHaveBeenCalledOnce();
    expect(child.stream.locked).toBe(false);
  });

  it("waits for child cleanup while cancelling a pending read", async () => {
    const cleanup = promiseWithResolvers<void>();
    const cancel = vi.fn(() => cleanup.promise);
    const child = new ReadableStream<AssistantStreamChunk>({ cancel });
    const transform = new AssistantTransformStream({
      start(controller) {
        controller.merge(child);
      },
    });
    const reader = transform.readable.getReader();
    const reading = reader.read();
    const finished = vi.fn();
    const cancelling = reader.cancel("stop").then(finished);
    await vi.waitFor(() => expect(cancel).toHaveBeenCalledOnce());
    expect(finished).not.toHaveBeenCalled();
    cleanup.resolve();
    await cancelling;
    expect(await reading).toEqual({ done: true, value: undefined });
    expect(child.locked).toBe(false);
    expect(finished).toHaveBeenCalledOnce();
    reader.releaseLock();
  });

  it("cleans up merged streams when start throws synchronously", async () => {
    const child = createIdleChild();
    const error = new Error("start failed");
    expect(
      () =>
        new AssistantTransformStream({
          start(controller) {
            controller.merge(child.stream);
            throw error;
          },
        }),
    ).toThrow(error);
    await vi.waitFor(() => {
      expect(child.cancel).toHaveBeenCalledOnce();
      expect(child.stream.locked).toBe(false);
    });
  });

  it("cancels idle merged streams when the consumer cancels", async () => {
    const child = createIdleChild(true);
    const transform = new AssistantTransformStream({
      start(controller) {
        controller.merge(child.stream);
      },
    });
    const reader = transform.readable.getReader();
    await reader.read();
    await reader.cancel("consumer stopped");
    await vi.waitFor(() => {
      expect(child.cancel).toHaveBeenCalledOnce();
      expect(child.stream.locked).toBe(false);
    });
    reader.releaseLock();
  });

  it("cancels idle merged streams when the input is aborted", async () => {
    const child = createIdleChild();
    const transform = new AssistantTransformStream({
      start(controller) {
        controller.merge(child.stream);
      },
    });
    const error = new Error("input aborted");
    await transform.writable.abort(error);
    await vi.waitFor(() => {
      expect(child.cancel).toHaveBeenCalledOnce();
      expect(child.stream.locked).toBe(false);
    });
    await expect(transform.readable.getReader().read()).rejects.toBe(error);
  });

  it.each(["start", "transform", "flush"] as const)(
    "cancels merged streams when %s rejects",
    async (phase) => {
      const child = createIdleChild();
      const error = new Error(`${phase} failed`);
      const transform = new AssistantTransformStream({
        async start(controller) {
          controller.merge(child.stream);
          if (phase === "start") throw error;
        },
        async transform() {
          if (phase === "transform") throw error;
        },
        async flush() {
          if (phase === "flush") throw error;
        },
      });
      const reader = transform.readable.getReader();
      const reading = expect(reader.read()).rejects.toBe(error);
      if (phase === "transform") {
        const writer = transform.writable.getWriter();
        await expect(writer.write("input")).rejects.toBe(error);
        writer.releaseLock();
      } else if (phase === "flush") {
        await expect(transform.writable.close()).rejects.toBe(error);
      }
      await reading;
      await vi.waitFor(() => {
        expect(child.cancel).toHaveBeenCalledOnce();
        expect(child.stream.locked).toBe(false);
      });
      reader.releaseLock();
    },
  );

  it("flushes normal output without cancelling merged streams", async () => {
    const cancel = vi.fn();
    const transform = new AssistantTransformStream<string>({
      start(controller) {
        controller.appendText("start");
      },
      transform(chunk, controller) {
        controller.appendText(chunk);
      },
      flush(controller) {
        controller.appendText("end");
        controller.merge(
          new ReadableStream({
            start(child) {
              child.close();
            },
            cancel,
          }),
        );
      },
    });
    const chunks: AssistantStreamChunk[] = [];
    const consuming = transform.readable.pipeTo(
      new WritableStream({
        write(chunk) {
          chunks.push(chunk);
        },
      }),
    );
    const writer = transform.writable.getWriter();
    await writer.write("middle");
    await writer.close();
    await consuming;
    expect(chunks.filter((chunk) => chunk.type === "text-delta")).toEqual([
      { type: "text-delta", path: [0], textDelta: "start" },
      { type: "text-delta", path: [0], textDelta: "middle" },
      { type: "text-delta", path: [0], textDelta: "end" },
    ]);
    expect(cancel).not.toHaveBeenCalled();
    writer.releaseLock();
  });
});
