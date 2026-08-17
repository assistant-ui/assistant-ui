import { afterEach, describe, expect, it, vi } from "vitest";
import { handleAttachmentRemove } from "./attachment-runtime-client";

describe("handleAttachmentRemove", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports a rejected removal", async () => {
    const error = new Error("storage unavailable");
    const task = Promise.reject(error);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = handleAttachmentRemove(() => task);

    expect(result).toBe(task);
    await expect(result).rejects.toBe(error);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] attachment remove failed:",
      error,
    );
  });

  it("preserves synchronous failures", () => {
    const error = new Error("attachment unavailable");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      handleAttachmentRemove(() => {
        throw error;
      }),
    ).toThrow(error);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("does not leak an ignored removal as an unhandled rejection", async () => {
    const error = new Error("remove failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const rejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => {
      rejections.push(reason);
    };
    const priorListeners = process.listeners("unhandledRejection");
    process.removeAllListeners("unhandledRejection");
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      handleAttachmentRemove(() => Promise.reject(error));
      await new Promise((resolve) => setTimeout(resolve, 20));
    } finally {
      process.removeListener("unhandledRejection", onUnhandledRejection);
      for (const listener of priorListeners) {
        process.on("unhandledRejection", listener);
      }
    }

    expect(rejections).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] attachment remove failed:",
      error,
    );
  });
});
