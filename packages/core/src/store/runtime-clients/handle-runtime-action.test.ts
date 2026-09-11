import { describe, expect, it, vi } from "vitest";
import { ThreadListAdapterChangedError } from "../../runtimes/remote-thread-list/adapter-changed";
import { handleRuntimeAction } from "./handle-runtime-action";

describe("handleRuntimeAction", () => {
  it("does not log a silent adapter-change cancellation", async () => {
    const error = new ThreadListAdapterChangedError();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      await expect(
        handleRuntimeAction("thread list archive", () => Promise.reject(error)),
      ).rejects.toBe(error);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("logs an ordinary rejection", async () => {
    const error = new Error("archive failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      await expect(
        handleRuntimeAction("thread list archive", () => Promise.reject(error)),
      ).rejects.toBe(error);
      expect(consoleError).toHaveBeenCalledExactlyOnceWith(
        "[assistant-ui] thread list archive failed:",
        error,
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
