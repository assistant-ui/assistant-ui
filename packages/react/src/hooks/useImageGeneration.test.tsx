// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useImageGeneration,
  useImagePartRegenerate,
} from "./useImageGeneration";
import type { ImageGenerationAdapter } from "@assistant-ui/core";

const makeAdapter = (
  impl?: (prompt: string) => Promise<{ image: string }>,
): ImageGenerationAdapter => ({
  generate: vi.fn(
    impl ?? (async () => ({ image: "data:image/png;base64,AA==" })),
  ),
});

describe("useImageGeneration", () => {
  it("returns adapter result and tracks isGenerating", async () => {
    const adapter = makeAdapter();
    const { result } = renderHook(() => useImageGeneration(adapter));
    expect(result.current.isGenerating).toBe(false);
    await act(async () => {
      const r = await result.current.generate("a cat");
      expect(r.image).toMatch(/^data:image\/png/);
    });
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
    expect(adapter.generate).toHaveBeenCalledWith("a cat", undefined);
  });

  it("captures adapter errors on state", async () => {
    const adapter = makeAdapter(() => {
      throw new Error("boom");
    });
    const { result } = renderHook(() => useImageGeneration(adapter));
    await act(async () => {
      await expect(result.current.generate("x")).rejects.toThrow("boom");
    });
    expect(result.current.error?.message).toBe("boom");
  });
});

describe("useImagePartRegenerate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces by 1s by default", async () => {
    const adapter = makeAdapter();
    const { result } = renderHook(() =>
      useImagePartRegenerate({ prompt: "hi" }, adapter),
    );
    await act(async () => {
      await result.current.regenerate();
    });
    expect(adapter.generate).toHaveBeenCalledTimes(1);

    // within debounce window: returns null, no adapter call
    await act(async () => {
      const r = await result.current.regenerate();
      expect(r).toBeNull();
    });
    expect(adapter.generate).toHaveBeenCalledTimes(1);

    // after debounce window, allows another call
    await act(async () => {
      vi.advanceTimersByTime(1001);
      await result.current.regenerate();
    });
    expect(adapter.generate).toHaveBeenCalledTimes(2);
  });

  it("enforces default 5/min rate limit", async () => {
    const adapter = makeAdapter();
    const { result } = renderHook(() =>
      useImagePartRegenerate({ prompt: "hi" }, adapter, { debounceMs: 0 }),
    );

    for (let i = 0; i < 6; i++) {
      await act(async () => {
        await result.current.regenerate();
      });
    }
    expect(adapter.generate).toHaveBeenCalledTimes(5);
    expect(result.current.rateLimited).toBe(true);
  });

  it("honors custom rate limit", async () => {
    const adapter = makeAdapter();
    const { result } = renderHook(() =>
      useImagePartRegenerate({ prompt: "hi" }, adapter, {
        debounceMs: 0,
        rateLimit: { maxPerMinute: 2 },
      }),
    );

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await result.current.regenerate();
      });
    }
    expect(adapter.generate).toHaveBeenCalledTimes(2);
    expect(result.current.rateLimited).toBe(true);
  });

  it("skips the call when confirmRegenerate returns false", async () => {
    const adapter = makeAdapter();
    const confirm = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() =>
      useImagePartRegenerate({ prompt: "hi" }, adapter, {
        debounceMs: 0,
        confirmRegenerate: confirm,
      }),
    );
    await act(async () => {
      const r = await result.current.regenerate();
      expect(r).toBeNull();
    });
    expect(confirm).toHaveBeenCalledWith("hi");
    expect(adapter.generate).not.toHaveBeenCalled();
  });

  it("throws when part has no prompt", async () => {
    const adapter = makeAdapter();
    const { result } = renderHook(() =>
      useImagePartRegenerate({}, adapter, { debounceMs: 0 }),
    );
    await act(async () => {
      await expect(result.current.regenerate()).rejects.toThrow(/prompt/);
    });
  });
});
