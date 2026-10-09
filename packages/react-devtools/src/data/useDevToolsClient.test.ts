import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EMPTY_SNAPSHOT, type DevToolsClient } from "./types";
import {
  useDevToolsClient,
  type DevToolsClientResult,
} from "./useDevToolsClient";

const fixtureClient = (
  switchToThread?: DevToolsClient["switchToThread"],
): DevToolsClient => {
  const client: DevToolsClient = {
    subscribe: () => () => {},
    getSnapshot: () => EMPTY_SNAPSHOT,
    clearEvents: () => {},
  };
  if (switchToThread) client.switchToThread = switchToThread;
  return client;
};

const hookResult = (client: DevToolsClient): DevToolsClientResult => {
  let result: DevToolsClientResult | undefined;
  const Probe = () => {
    result = useDevToolsClient(1, client);
    return null;
  };
  renderToStaticMarkup(createElement(Probe));
  if (result === undefined) {
    throw new Error("expected useDevToolsClient to render");
  }
  return result;
};

const captureUnhandledRejections = async (run: () => void) => {
  const rejections: unknown[] = [];
  const onUnhandledRejection = (reason: unknown) => {
    rejections.push(reason);
  };
  const priorListeners = process.listeners("unhandledRejection");
  process.removeAllListeners("unhandledRejection");
  process.on("unhandledRejection", onUnhandledRejection);
  try {
    run();
    // Node emits unhandledRejection on a later event-loop turn; fake timers cannot drive that.
    const { promise, resolve } = Promise.withResolvers<void>();
    setImmediate(resolve);
    await promise;
  } finally {
    process.removeListener("unhandledRejection", onUnhandledRejection);
    for (const listener of priorListeners) {
      process.on("unhandledRejection", listener);
    }
  }
  return rejections;
};

describe("useDevToolsClient switchToThread", () => {
  it("forwards a successful switch", async () => {
    const switchToThread = vi.fn(async () => {});
    const run = hookResult(fixtureClient(switchToThread)).switchToThread;

    await expect(run(1, "thread-1")).resolves.toBeUndefined();
    expect(switchToThread).toHaveBeenCalledWith(1, "thread-1");
  });

  it("contains a synchronous client throw", () => {
    const run = hookResult(
      fixtureClient(() => {
        throw new Error("failed");
      }),
    ).switchToThread;

    expect(() => run(1, "thread-1")).not.toThrow();
  });

  it("does not leak a rejected switch as an unhandled rejection", async () => {
    const error = new Error("failed");
    const run = hookResult(
      fixtureClient(() => Promise.reject(error)),
    ).switchToThread;

    const rejections = await captureUnhandledRejections(() => {
      void run(1, "thread-1");
    });

    expect(rejections).toEqual([]);
  });

  it("lets an ignored rejected switch settle", async () => {
    const run = hookResult(
      fixtureClient(() => Promise.reject(new Error("failed"))),
    ).switchToThread;

    await expect(run(1, "thread-1")).resolves.toBeUndefined();
  });
});
