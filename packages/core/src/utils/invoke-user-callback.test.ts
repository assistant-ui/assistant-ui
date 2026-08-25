import { afterEach, describe, expect, it, vi } from "vitest";
import { invokeUserCallback } from "./invoke-user-callback";

describe("invokeUserCallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("invokes a callback synchronously with its arguments", () => {
    const callback = vi.fn((left: number, right: number) => left + right);

    expect(invokeUserCallback("test", "onSuccess", callback, 2, 3)).toBe(
      undefined,
    );
    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(2, 3);
  });

  it("reports and swallows a synchronous throw", () => {
    const error = new Error("sync failure");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      invokeUserCallback("test", "onError", () => {
        throw error;
      }),
    ).not.toThrow();
    expect(consoleError).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      "[test] onError callback threw an error",
      error,
    );
  });

  it("reports an asynchronous rejection and resolves", async () => {
    const error = new Error("async failure");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(
      invokeUserCallback("test", "onError", async () => {
        throw error;
      }),
    ).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      "[test] onError callback threw an error",
      error,
    );
  });

  it("resolves only after an asynchronous callback settles", async () => {
    let settleCallback: (() => void) | undefined;
    const callbackPromise = new Promise<void>((resolve) => {
      settleCallback = resolve;
    });
    let settled = false;

    const result = invokeUserCallback(
      "test",
      "onFinish",
      () => callbackPromise,
    );
    void result?.then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    settleCallback?.();
    await result;
    expect(settled).toBe(true);
  });

  it("does nothing when the callback is undefined", () => {
    expect(invokeUserCallback("test", "onMissing", undefined)).toBeUndefined();
  });
});
