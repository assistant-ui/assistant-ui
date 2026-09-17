import { describe, expect, it, vi } from "vitest";
import { raceWithAbortSignal } from "./abortable-promise";

describe("raceWithAbortSignal", () => {
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

  it("turns a synchronous throw into a rejected promise", async () => {
    const error = new Error("failed");
    const result = raceWithAbortSignal(new AbortController().signal, () => {
      throw error;
    });

    await expect(result).rejects.toBe(error);
  });
});
