import { describe, expect, it, vi } from "vitest";
import { LoadEarlier } from "./load-earlier";

describe("LoadEarlier", () => {
  it("defers the callback and shares one outstanding promise", async () => {
    const loader = new LoadEarlier();
    let complete!: () => void;
    let attempts = 0;
    const callback = vi.fn(() => {
      attempts++;
      return attempts === 1
        ? new Promise<void>((resolve) => {
            complete = resolve;
          })
        : Promise.resolve();
    });
    const changes: boolean[] = [];
    const report = vi.fn();
    const first = loader.load(callback, report, (value) => changes.push(value));
    const second = loader.load(callback, report, (value) =>
      changes.push(value),
    );
    expect(first).toBe(second);
    expect(callback).not.toHaveBeenCalled();
    expect(loader.isLoading).toBe(true);
    expect(changes).toEqual([true]);
    await Promise.resolve();
    expect(callback).toHaveBeenCalledTimes(1);
    complete();
    await first;
    expect(loader.isLoading).toBe(false);
    expect(changes).toEqual([true, false]);
    expect(report).not.toHaveBeenCalled();
    await loader.load(callback, report, () => {});
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it.each(["throws", "rejects"])(
    "reports and clears a callback that %s",
    async (kind) => {
      const loader = new LoadEarlier();
      const error = new Error("load failed");
      const report = vi.fn();
      const changes: boolean[] = [];
      const callback =
        kind === "throws"
          ? () => {
              throw error;
            }
          : () => Promise.reject(error);
      await expect(
        loader.load(callback, report, (value) => changes.push(value)),
      ).resolves.toBeUndefined();
      expect(report).toHaveBeenCalledTimes(1);
      expect(report).toHaveBeenCalledWith(error);
      expect(changes).toEqual([true, false]);
      expect(loader.isLoading).toBe(false);
    },
  );

  it("does not publish loading when no callback is available", async () => {
    const loader = new LoadEarlier();
    const changed = vi.fn();
    await loader.load(undefined, vi.fn(), changed);
    expect(loader.isLoading).toBe(false);
    expect(changed).not.toHaveBeenCalled();
  });
});
