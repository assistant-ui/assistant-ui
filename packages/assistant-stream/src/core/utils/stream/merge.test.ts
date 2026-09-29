import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import { createMergeStream } from "./merge";

const textDelta = (textDelta: string): AssistantStreamChunk => ({
  type: "text-delta",
  path: [0],
  textDelta,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createMergeStream", () => {
  it("does not create readers for ordered raw chunks", async () => {
    const getReader = vi.spyOn(ReadableStream.prototype, "getReader");
    const merger = createMergeStream();
    const received: AssistantStreamChunk[] = [];

    merger.enqueue(textDelta("a"));
    merger.enqueue(textDelta("b"));
    merger.enqueue(textDelta("c"));

    expect(getReader).not.toHaveBeenCalled();

    merger.seal();
    await merger.readable.pipeTo(
      new WritableStream({
        write(chunk) {
          received.push(chunk);
        },
      }),
    );

    expect(received).toEqual([textDelta("a"), textDelta("b"), textDelta("c")]);
  });

  it("preserves raw chunk order around a merged stream", async () => {
    const merger = createMergeStream();
    const received: AssistantStreamChunk[] = [];

    merger.enqueue(textDelta("before-1"));
    merger.enqueue(textDelta("before-2"));
    merger.addStream(
      new ReadableStream({
        start(controller) {
          controller.enqueue(textDelta("child"));
          controller.close();
        },
      }),
    );
    merger.enqueue(textDelta("after"));
    merger.seal();

    await merger.readable.pipeTo(
      new WritableStream({
        write(chunk) {
          received.push(chunk);
        },
      }),
    );

    expect(received).toEqual([
      textDelta("before-1"),
      textDelta("before-2"),
      textDelta("child"),
      textDelta("after"),
    ]);
  });

  it("keeps an immediately ready child ahead of a later raw chunk", async () => {
    const merger = createMergeStream();
    const received: AssistantStreamChunk[] = [];

    merger.addStream(
      new ReadableStream({
        start(controller) {
          controller.enqueue(textDelta("child"));
          controller.close();
        },
      }),
    );
    merger.enqueue(textDelta("raw"));
    merger.seal();

    await merger.readable.pipeTo(
      new WritableStream({
        write(chunk) {
          received.push(chunk);
        },
      }),
    );

    expect(received).toEqual([textDelta("child"), textDelta("raw")]);
  });

  it("preserves child readiness between raw chunks", async () => {
    let childController!: ReadableStreamDefaultController<AssistantStreamChunk>;
    const merger = createMergeStream();
    const received: AssistantStreamChunk[] = [];

    merger.addStream(
      new ReadableStream({
        start(controller) {
          childController = controller;
        },
      }),
    );
    merger.enqueue(textDelta("before"));
    childController.enqueue(textDelta("child"));
    childController.close();
    merger.enqueue(textDelta("after"));
    merger.seal();

    await merger.readable.pipeTo(
      new WritableStream({
        write(chunk) {
          received.push(chunk);
        },
      }),
    );

    expect(received).toEqual([
      textDelta("before"),
      textDelta("child"),
      textDelta("after"),
    ]);
  });

  it("does not block raw chunks on a delayed child", async () => {
    let childController!: ReadableStreamDefaultController<AssistantStreamChunk>;
    const merger = createMergeStream();
    const received: AssistantStreamChunk[] = [];

    merger.enqueue(textDelta("before"));
    merger.addStream(
      new ReadableStream({
        start(controller) {
          childController = controller;
        },
      }),
    );
    merger.enqueue(textDelta("after"));
    merger.seal();

    const drain = merger.readable.pipeTo(
      new WritableStream({
        write(chunk) {
          received.push(chunk);
        },
      }),
    );
    await vi.waitFor(() => {
      expect(received).toEqual([textDelta("before"), textDelta("after")]);
    });

    childController.enqueue(textDelta("child"));
    childController.close();
    await drain;

    expect(received).toEqual([
      textDelta("before"),
      textDelta("after"),
      textDelta("child"),
    ]);
  });

  it("propagates child errors while raw chunks are pending", async () => {
    const error = new Error("child failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    let childController!: ReadableStreamDefaultController<AssistantStreamChunk>;
    const child = new ReadableStream<AssistantStreamChunk>({
      start(controller) {
        childController = controller;
      },
    });
    const merger = createMergeStream();

    merger.enqueue(textDelta("before"));
    merger.addStream(child);
    merger.enqueue(textDelta("after"));
    merger.seal();

    const drain = merger.readable.pipeTo(new WritableStream());
    childController.error(error);

    await expect(drain).rejects.toBe(error);
    await vi.waitFor(() => expect(child.locked).toBe(false));
    expect(consoleError).toHaveBeenCalledWith(error);
  });

  it("discards raw chunks after cancellation", async () => {
    const getReader = vi.spyOn(ReadableStream.prototype, "getReader");
    const merger = createMergeStream();

    merger.enqueue(textDelta("before"));
    await merger.readable.cancel();
    merger.enqueue(textDelta("after"));

    expect(merger.isCancelled()).toBe(true);
    expect(getReader).not.toHaveBeenCalled();
  });

  it("releases child readers after successful completion", async () => {
    const child = new ReadableStream<never>({
      start(controller) {
        controller.close();
      },
    });
    const merger = createMergeStream();

    merger.addStream(child);
    merger.seal();

    await merger.readable.pipeTo(new WritableStream());

    expect(child.locked).toBe(false);
  });

  it("waits for every child reader to finish cancellation", async () => {
    let finishCleanup = () => {};
    const cleanup = new Promise<void>((resolve) => {
      finishCleanup = resolve;
    });
    const delayedCancel = vi.fn(() => cleanup);
    const rejectedCancel = vi.fn(() => Promise.reject(new Error("failed")));
    const merger = createMergeStream();

    const delayedStream = new ReadableStream({ cancel: delayedCancel });
    const rejectedStream = new ReadableStream({ cancel: rejectedCancel });
    merger.addStream(delayedStream);
    merger.addStream(rejectedStream);

    let cancelSettled = false;
    const cancel = merger.readable
      .getReader()
      .cancel()
      .then(() => {
        cancelSettled = true;
      });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(delayedCancel).toHaveBeenCalledOnce();
    expect(rejectedCancel).toHaveBeenCalledOnce();
    expect(cancelSettled).toBe(false);

    finishCleanup();
    await expect(cancel).resolves.toBeUndefined();
    expect(cancelSettled).toBe(true);
    expect(delayedStream.locked).toBe(false);
    expect(rejectedStream.locked).toBe(false);
  });

  it("cancels streams rejected after sealing", async () => {
    const cancelSource = vi.fn();
    const merger = createMergeStream();
    merger.seal();

    expect(() =>
      merger.addStream(new ReadableStream({ cancel: cancelSource })),
    ).toThrow("Cannot add streams after the run callback has settled.");

    await vi.waitFor(() => expect(cancelSource).toHaveBeenCalledOnce());
  });
});

describe("createMergeStream seal", () => {
  it("is idempotent once the underlying stream has closed", async () => {
    const merger = createMergeStream();
    merger.seal();

    const reader = merger.readable.getReader();
    while (!(await reader.read()).done) {
      // drain
    }

    expect(() => merger.seal()).not.toThrow();
    expect(merger.isSealed()).toBe(true);
  });
});
