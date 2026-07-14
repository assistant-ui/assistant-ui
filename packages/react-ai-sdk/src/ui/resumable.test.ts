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
});
