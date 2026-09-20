import { describe, expect, it, vi } from "vitest";
import { raceWithAbortSignal } from "./raceWithAbortSignal";

describe("raceWithAbortSignal", () => {
  it("invokes the operation synchronously without a signal", async () => {
    const order: string[] = [];

    const result = raceWithAbortSignal(undefined, () => {
      order.push("operation");
      return "done";
    });
    order.push("after");

    expect(order).toEqual(["operation", "after"]);
    await expect(result).resolves.toBe("done");
  });

  it("converts a synchronous operation error to a rejection", async () => {
    const error = new Error("failed");

    const result = raceWithAbortSignal(undefined, () => {
      throw error;
    });

    await expect(result).rejects.toBe(error);
  });

  it("rejects a pending operation with the abort reason", async () => {
    const controller = new AbortController();
    const reason = new Error("cancelled");
    let resolveOperation!: (value: string) => void;
    const operation = new Promise<string>((resolve) => {
      resolveOperation = resolve;
    });

    const result = raceWithAbortSignal(controller.signal, () => operation);
    controller.abort(reason);

    await expect(result).rejects.toBe(reason);
    resolveOperation("late result");
  });

  it("rejects before invoking an operation for an already aborted signal", async () => {
    const controller = new AbortController();
    const reason = new Error("already cancelled");
    const operation = vi.fn(() => "done");
    controller.abort(reason);

    const result = raceWithAbortSignal(controller.signal, operation);

    await expect(result).rejects.toBe(reason);
    expect(operation).not.toHaveBeenCalled();
  });

  it("removes the abort listener after the operation settles", async () => {
    const controller = new AbortController();
    const removeEventListener = vi.spyOn(
      controller.signal,
      "removeEventListener",
    );
    const result = raceWithAbortSignal(controller.signal, () => "done");

    await expect(result).resolves.toBe("done");
    expect(removeEventListener).toHaveBeenCalledOnce();
    expect(removeEventListener).toHaveBeenCalledWith(
      "abort",
      expect.any(Function),
    );

    controller.abort(new Error("late abort"));
    await expect(result).resolves.toBe("done");
  });
});
