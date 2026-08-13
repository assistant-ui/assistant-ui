import { afterEach, describe, expect, it, vi } from "vitest";
import { handleThreadListAction } from "./handle-thread-list-action";

describe("handleThreadListAction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports a rejected task while preserving its promise", async () => {
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

  it("reports synchronous failures as rejected promises", async () => {
    const error = new Error("invalid thread");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = handleThreadListAction("switch", () => {
      throw error;
    });

    await expect(result).rejects.toBe(error);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] thread list switch failed:",
      error,
    );
  });
});
