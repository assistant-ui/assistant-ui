import { afterEach, describe, expect, it, vi } from "vitest";
import { createNotificationManager } from "../utils/NotificationManager";
import type { ClientStack } from "../utils/tap-client-stack-context";

const clientStack = [] as unknown as ClientStack;

const flushMicrotasks = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("NotificationManager listener errors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a throwing listener without raising an uncatchable error", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const manager = createNotificationManager();
    const failure = new Error("listener failed");
    const second = vi.fn();

    manager.on("thread.initialize" as never, () => {
      throw failure;
    });
    manager.on("thread.initialize" as never, second);

    manager.emit("thread.initialize" as never, {} as never, clientStack);
    await flushMicrotasks();

    expect(second).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      "NotificationManager: event listener error",
      failure,
    );
  });

  it("logs every failing listener in a batch", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const manager = createNotificationManager();
    const first = new Error("first");
    const secondError = new Error("second");

    manager.on("thread.initialize" as never, () => {
      throw first;
    });
    manager.on("thread.initialize" as never, () => {
      throw secondError;
    });

    manager.emit("thread.initialize" as never, {} as never, clientStack);
    await flushMicrotasks();

    expect(consoleError).toHaveBeenCalledWith(
      "NotificationManager: event listener error",
      first,
    );
    expect(consoleError).toHaveBeenCalledWith(
      "NotificationManager: event listener error",
      secondError,
    );
  });
});
