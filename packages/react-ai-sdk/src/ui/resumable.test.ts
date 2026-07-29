// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { createResumableSessionStorage } from "./resumable";

const originalSessionStorageDescriptor = Object.getOwnPropertyDescriptor(
  window,
  "sessionStorage",
);

afterEach(() => {
  vi.restoreAllMocks();
  if (originalSessionStorageDescriptor) {
    Object.defineProperty(
      window,
      "sessionStorage",
      originalSessionStorageDescriptor,
    );
  }
  window.sessionStorage.clear();
});

describe("createResumableSessionStorage", () => {
  it("stores stream ids in sessionStorage", () => {
    const storage = createResumableSessionStorage({ key: "test-stream-id" });

    expect(storage.getStreamId()).toBeNull();

    storage.setStreamId("stream-1");
    expect(storage.getStreamId()).toBe("stream-1");

    storage.clear();
    expect(storage.getStreamId()).toBeNull();
  });

  it("notifies subscribers when the stored stream id changes", () => {
    const storage = createResumableSessionStorage({ key: "test-stream-id" });
    const listener = vi.fn();
    const unsubscribe = storage.subscribe?.(listener);

    storage.setStreamId("stream-1");
    storage.clear();

    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe?.();
    storage.setStreamId("stream-2");

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("isolates stored ids and subscribers by thread", () => {
    const storage = createResumableSessionStorage({ key: "test-stream-id" });
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    storage.subscribe?.(listenerA, "thread-a");
    storage.subscribe?.(listenerB, "thread-b");

    storage.setStreamId("stream-a", "thread-a");
    storage.setStreamId("stream-b", "thread-b");

    expect(storage.getStreamId("thread-a")).toBe("stream-a");
    expect(storage.getStreamId("thread-b")).toBe("stream-b");
    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(1);

    storage.clear("thread-a");

    expect(storage.getStreamId("thread-a")).toBeNull();
    expect(storage.getStreamId("thread-b")).toBe("stream-b");
    expect(listenerA).toHaveBeenCalledTimes(2);
    expect(listenerB).toHaveBeenCalledTimes(1);
  });

  it("caches the last known value between writes", () => {
    const storageMethods = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as unknown as Storage;
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: storageMethods,
    });
    const storage = createResumableSessionStorage({ key: "test-stream-id" });

    expect(storage.getStreamId("thread-a")).toBeNull();
    expect(storage.getStreamId("thread-a")).toBeNull();

    expect(storageMethods.getItem).toHaveBeenCalledTimes(1);

    storage.setStreamId("stream-a", "thread-a");

    expect(storage.getStreamId("thread-a")).toBe("stream-a");
    expect(storageMethods.getItem).toHaveBeenCalledTimes(1);
  });

  it("isolates subscriber errors", () => {
    const storage = createResumableSessionStorage({ key: "test-stream-id" });
    const error = new Error("listener failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const laterListener = vi.fn();

    storage.subscribe?.(() => {
      throw error;
    });
    storage.subscribe?.(laterListener);

    expect(() => storage.setStreamId("stream-1")).not.toThrow();
    expect(laterListener).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] resumable storage listener failed",
      error,
    );
  });

  it("degrades to null and no-op when sessionStorage access is blocked", () => {
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });

    const storage = createResumableSessionStorage();

    expect(storage.getStreamId()).toBeNull();
    expect(() => storage.setStreamId("stream-1")).not.toThrow();
    expect(() => storage.clear()).not.toThrow();
  });

  it("degrades to null and no-op when sessionStorage methods throw", () => {
    const throwingStorage = {
      getItem: vi.fn(() => {
        throw new DOMException("blocked", "SecurityError");
      }),
      setItem: vi.fn(() => {
        throw new DOMException("blocked", "SecurityError");
      }),
      removeItem: vi.fn(() => {
        throw new DOMException("blocked", "SecurityError");
      }),
    } as unknown as Storage;

    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: throwingStorage,
    });

    const storage = createResumableSessionStorage();

    expect(storage.getStreamId()).toBeNull();
    expect(() => storage.setStreamId("stream-1")).not.toThrow();
    expect(() => storage.clear()).not.toThrow();
    expect(throwingStorage.getItem).toHaveBeenCalledTimes(1);
    expect(throwingStorage.setItem).toHaveBeenCalledTimes(1);
    expect(throwingStorage.removeItem).toHaveBeenCalledTimes(1);
  });
});
