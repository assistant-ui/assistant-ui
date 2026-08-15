import { describe, expect, it, vi } from "vitest";
import { createMergeStream } from "./merge";

describe("createMergeStream", () => {
  it("waits for every child reader to finish cancellation", async () => {
    let finishCleanup = () => {};
    const cleanup = new Promise<void>((resolve) => {
      finishCleanup = resolve;
    });
    const delayedCancel = vi.fn(() => cleanup);
    const rejectedCancel = vi.fn(() => Promise.reject(new Error("failed")));
    const merger = createMergeStream();

    merger.addStream(new ReadableStream({ cancel: delayedCancel }));
    merger.addStream(new ReadableStream({ cancel: rejectedCancel }));

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
