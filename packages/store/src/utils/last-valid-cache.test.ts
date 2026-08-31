import { describe, expect, it, vi } from "vitest";
import { createLastValidCache, createStaleReporter } from "./last-valid-cache";

const createScheduler = () => {
  const queue: (() => void)[] = [];
  return {
    schedule: (callback: () => void) => {
      queue.push(callback);
    },
    flush: () => {
      for (const callback of queue.splice(0)) callback();
    },
  };
};

describe("createLastValidCache", () => {
  it("serves the cached item during a stale window and recovers", () => {
    const scheduler = createScheduler();
    const cache = createLastValidCache<string>(null, scheduler.schedule);

    expect(cache.resolve(true, () => "a")).toBe("a");
    expect(cache.resolve(false, () => "fresh")).toBe("a");

    expect(cache.resolve(true, () => "b")).toBe("b");
    scheduler.flush();
    expect(cache.resolve(false, () => "fresh")).toBe("b");
  });

  it("drops the cache and reports once the stale window settles", () => {
    const scheduler = createScheduler();
    const reportStale = vi.fn();
    const cache = createLastValidCache<string>(reportStale, scheduler.schedule);

    cache.resolve(true, () => "a");
    expect(cache.resolve(false, () => "fresh")).toBe("a");
    scheduler.flush();
    expect(reportStale).toHaveBeenCalledTimes(1);

    const resolveItem = vi.fn(() => "fallthrough");
    expect(cache.resolve(false, resolveItem)).toBe("fallthrough");
    expect(resolveItem).toHaveBeenCalledTimes(1);
  });

  it("voids a pending expiry when a valid resolution lands first", () => {
    const scheduler = createScheduler();
    const reportStale = vi.fn();
    const cache = createLastValidCache<string>(reportStale, scheduler.schedule);

    cache.resolve(true, () => "a");
    cache.resolve(false, () => "fresh");
    cache.resolve(true, () => "b");
    scheduler.flush();

    expect(reportStale).not.toHaveBeenCalled();
    expect(cache.resolve(false, () => "fresh")).toBe("b");
  });

  it("falls through for an index that was never valid", () => {
    const scheduler = createScheduler();
    const cache = createLastValidCache<string>(null, scheduler.schedule);

    expect(() =>
      cache.resolve(false, () => {
        throw new Error("out of bounds");
      }),
    ).toThrow("out of bounds");
  });
});

describe("createStaleReporter", () => {
  it("reports only for a still-current, still-invalid provider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      createStaleReporter({
        name: "Probe",
        index: 2,
        isCurrent: () => false,
        isValid: () => false,
      })();
      expect(errorSpy).not.toHaveBeenCalled();

      createStaleReporter({
        name: "Probe",
        index: 2,
        isCurrent: () => true,
        isValid: () => true,
      })();
      expect(errorSpy).not.toHaveBeenCalled();

      createStaleReporter({
        name: "Probe",
        index: 2,
        isCurrent: () => true,
        isValid: () => {
          throw new Error("scope unavailable");
        },
      })();
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(String(errorSpy.mock.calls[0]![0])).toContain("index 2");
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("names the id in reports for an id-addressed provider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      createStaleReporter({
        name: "Probe",
        index: "msg_1",
        isCurrent: () => true,
        isValid: () => false,
      })();
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(String(errorSpy.mock.calls[0]![0])).toContain('id "msg_1"');
    } finally {
      errorSpy.mockRestore();
    }
  });
});
