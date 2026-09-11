import { describe, expect, it, vi } from "vitest";
import { createMergeStream } from "./merge";

describe("createMergeStream", () => {
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
