import { afterEach, describe, expect, it, vi } from "vitest";
import { createNotificationManager } from "../utils/NotificationManager";
import type { ClientStack } from "../utils/tap-client-stack-context";

const clientStack = [] as unknown as ClientStack;

const flushMicrotasks = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("NotificationManager listener errors", () => {
  it("logs a rejecting async listener without an unhandled rejection", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    const proc = process as unknown as {
      on(event: "unhandledRejection", cb: (reason: unknown) => void): void;
      off(event: "unhandledRejection", cb: (reason: unknown) => void): void;
    };
    proc.on("unhandledRejection", onRejection);
    try {
      const manager = createNotificationManager();
      const failure = new Error("async listener failed");

      const later = vi.fn();
      manager.on(
        "thread.initialize" as never,
        (async () => {
          throw failure;
        }) as never,
      );
      manager.on("thread.initialize" as never, later);

      manager.emit("thread.initialize" as never, {} as never, clientStack);
      await flushMicrotasks();
      await flushMicrotasks();

      expect(later).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledWith(
        "NotificationManager: event listener error",
        failure,
      );
      expect(rejections).not.toContain(failure);
    } finally {
      proc.off("unhandledRejection", onRejection);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("observes a function-valued thenable returned by a listener", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const manager = createNotificationManager();
    const failure = new Error("thenable failed");
    const thenable = Object.assign(() => {}, {
      then: (_onFulfilled: unknown, onRejected: (reason: unknown) => void) => {
        onRejected(failure);
      },
    });

    manager.on("thread.initialize" as never, (() => thenable) as never);

    manager.emit("thread.initialize" as never, {} as never, clientStack);
    await flushMicrotasks();
    await flushMicrotasks();

    expect(consoleError).toHaveBeenCalledWith(
      "NotificationManager: event listener error",
      failure,
    );
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
