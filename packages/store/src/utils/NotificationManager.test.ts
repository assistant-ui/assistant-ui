import { afterEach, describe, expect, it, vi } from "vitest";
import { createNotificationManager } from "./NotificationManager";
import type { ClientStack } from "./tap-client-stack-context";

const clientStack = [] as unknown as ClientStack;

const flush = () => new Promise((resolve) => setTimeout(resolve));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NotificationManager listener errors", () => {
  it("logs a throwing listener and keeps notifying later listeners", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const manager = createNotificationManager();
    const failure = new Error("listener failed");
    const later = vi.fn();

    manager.on("thread.initialize" as never, () => {
      throw failure;
    });
    manager.on("thread.initialize" as never, later);

    manager.emit("thread.initialize" as never, {} as never, clientStack);
    await flush();

    expect(later).toHaveBeenCalledTimes(1);
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
    const second = new Error("second");

    manager.on("thread.initialize" as never, () => {
      throw first;
    });
    manager.on("thread.initialize" as never, () => {
      throw second;
    });

    manager.emit("thread.initialize" as never, {} as never, clientStack);
    await flush();

    expect(consoleError).toHaveBeenCalledWith(
      "NotificationManager: event listener error",
      first,
    );
    expect(consoleError).toHaveBeenCalledWith(
      "NotificationManager: event listener error",
      second,
    );
  });

  it("logs a rejecting async listener and keeps notifying later listeners", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const manager = createNotificationManager();
    const failure = new Error("async listener failed");
    const later = vi.fn();

    manager.on("thread.initialize" as never, async () => {
      throw failure;
    });
    manager.on("thread.initialize" as never, later);

    manager.emit("thread.initialize" as never, {} as never, clientStack);
    await flush();

    expect(later).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      "NotificationManager: event listener error",
      failure,
    );
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

    manager.on("thread.initialize" as never, () => thenable);

    manager.emit("thread.initialize" as never, {} as never, clientStack);
    await flush();

    expect(consoleError).toHaveBeenCalledWith(
      "NotificationManager: event listener error",
      failure,
    );
  });
});
