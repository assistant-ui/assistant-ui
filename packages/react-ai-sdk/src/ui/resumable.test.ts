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

  it("scopes the stored id by a getter key, isolating instances", () => {
    const storageA = createResumableSessionStorage({ key: () => "thread-a" });
    const storageB = createResumableSessionStorage({ key: () => "thread-b" });

    storageA.setStreamId("stream-a");
    expect(storageA.getStreamId()).toBe("stream-a");
    expect(storageB.getStreamId()).toBeNull();

    storageB.setStreamId("stream-b");
    expect(storageA.getStreamId()).toBe("stream-a");
    expect(storageB.getStreamId()).toBe("stream-b");

    storageA.clear();
    expect(storageA.getStreamId()).toBeNull();
    expect(storageB.getStreamId()).toBe("stream-b");
  });

  it("reads a getter key lazily on every access", () => {
    let current = "first";
    const storage = createResumableSessionStorage({ key: () => current });

    storage.setStreamId("stream-1");
    expect(storage.getStreamId()).toBe("stream-1");

    current = "second";
    expect(storage.getStreamId()).toBeNull();

    storage.setStreamId("stream-2");
    expect(storage.getStreamId()).toBe("stream-2");
    expect(window.sessionStorage.getItem("first")).toBe("stream-1");
    expect(window.sessionStorage.getItem("second")).toBe("stream-2");

    storage.clear();
    expect(window.sessionStorage.getItem("second")).toBeNull();
    expect(window.sessionStorage.getItem("first")).toBe("stream-1");
  });

  it("disables storage access while the getter returns undefined", () => {
    let current: string | undefined;
    const storage = createResumableSessionStorage({ key: () => current });

    storage.setStreamId("stream-1");
    expect(storage.getStreamId()).toBeNull();
    expect(window.sessionStorage.getItem("aui-resumable-stream-id")).toBeNull();

    current = "thread-a";
    storage.setStreamId("stream-1");
    expect(storage.getStreamId()).toBe("stream-1");

    current = undefined;
    expect(storage.getStreamId()).toBeNull();
    storage.clear();

    current = "thread-a";
    expect(storage.getStreamId()).toBe("stream-1");
  });

  it("treats a throwing key getter as no key", () => {
    const storage = createResumableSessionStorage({
      key: () => {
        throw new Error("no thread context");
      },
    });

    expect(() => storage.setStreamId("stream-1")).not.toThrow();
    expect(storage.getStreamId()).toBeNull();
    expect(() => storage.clear()).not.toThrow();
    expect(window.sessionStorage.getItem("aui-resumable-stream-id")).toBeNull();
  });
});
