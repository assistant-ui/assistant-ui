import { afterEach, describe, expect, it, vi } from "vitest";
import { handleThreadListAction } from "./handle-thread-list-action";

describe("handleThreadListAction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports a rejected task", async () => {
    const error = new Error("unavailable");
    const task = Promise.reject(error);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = handleThreadListAction("delete", () => task);

    expect(result).toBe(task);
    await expect(result).rejects.toBe(error);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] thread list delete failed:",
      error,
    );
  });

  it("preserves synchronous failures", () => {
    const error = new Error("invalid thread");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      handleThreadListAction("switch", () => {
        throw error;
      }),
    ).toThrow(error);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("does not leak an ignored action as an unhandled rejection", async () => {
    const error = new Error("delete failed");
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
      handleThreadListAction("delete", () => Promise.reject(error));
      await new Promise((resolve) => setTimeout(resolve, 20));
    } finally {
      process.removeListener("unhandledRejection", onUnhandledRejection);
      for (const listener of priorListeners) {
        process.on("unhandledRejection", listener);
      }
    }

    expect(rejections).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] thread list delete failed:",
      error,
    );
  });
});
