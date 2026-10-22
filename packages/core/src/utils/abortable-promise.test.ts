import { getEventListeners } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { raceWithAbortSignal } from "./abortable-promise";

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

  it("turns a synchronous throw without a signal into a rejection", async () => {
    const error = new Error("failed");
    const result = raceWithAbortSignal(undefined, () => {
      throw error;
    });

    await expect(result).rejects.toBe(error);
  });

  it("does not start an operation after cancellation", async () => {
    const controller = new AbortController();
    const reason = new Error("cancelled");
    const operation = vi.fn();
    controller.abort(reason);

    await expect(
      raceWithAbortSignal(controller.signal, operation),
    ).rejects.toBe(reason);
    expect(operation).not.toHaveBeenCalled();
  });

  it("removes the abort listener after the operation settles", async () => {
    const controller = new AbortController();
    const addEventListener = vi.spyOn(controller.signal, "addEventListener");
    const removeEventListener = vi.spyOn(
      controller.signal,
      "removeEventListener",
    );

    await expect(
      raceWithAbortSignal(controller.signal, () => "done"),
    ).resolves.toBe("done");
    const abortListener = addEventListener.mock.calls[0]?.[1];
    expect(removeEventListener).toHaveBeenCalledWith("abort", abortListener);
  });

  it("keeps cancellation triggered by the operation ahead of its returned value", async () => {
    const controller = new AbortController();
    const reason = new Error("cancelled");
    const result = raceWithAbortSignal(controller.signal, () => {
      controller.abort(reason);
      return "done";
    });

    await expect(result).rejects.toBe(reason);
    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
  });

  it("observes a late rejection after cancellation wins", async () => {
    const controller = new AbortController();
    const reason = new Error("cancelled");
    let rejectOperation!: (error: Error) => void;
    const operation = new Promise<never>((_resolve, reject) => {
      rejectOperation = reject;
    });
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);

    try {
      const result = raceWithAbortSignal(controller.signal, () => operation);
      controller.abort(reason);
      await expect(result).rejects.toBe(reason);

      rejectOperation(new Error("late failure"));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });

  it.each(["throw", "reject"] as const)(
    "releases the abort listener when the operation fails via %s",
    async (failure) => {
      const controller = new AbortController();
      const error = new Error("failed");
      const result = raceWithAbortSignal(controller.signal, () => {
        if (failure === "throw") throw error;
        return Promise.reject(error);
      });

      await expect(result).rejects.toBe(error);
      expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
    },
  );
});
