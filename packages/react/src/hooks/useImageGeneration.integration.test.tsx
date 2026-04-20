// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageGenerationAdapter } from "@assistant-ui/core";
import {
  useImageGeneration,
  useImagePartRegenerate,
} from "./useImageGeneration";

describe("useImageGeneration — observer callbacks", () => {
  it("invokes onImageGenerated on success with durationMs and imageSizeBytes", async () => {
    const adapter: ImageGenerationAdapter = {
      generate: vi.fn(async () => ({
        image: "data:image/png;base64,AAAA",
        mimeType: "image/png",
      })),
    };
    const onImageGenerated = vi.fn();
    const { result } = renderHook(() =>
      useImageGeneration(adapter, { onImageGenerated }),
    );
    await act(async () => {
      await result.current.generate("hello", { model: "gpt-image-1" });
    });
    expect(onImageGenerated).toHaveBeenCalledTimes(1);
    const arg = onImageGenerated.mock.calls[0]?.[0];
    expect(arg.prompt).toBe("hello");
    expect(arg.model).toBe("gpt-image-1");
    expect(arg.imageSizeBytes).toBeGreaterThan(0);
    expect(typeof arg.durationMs).toBe("number");
  });

  it("invokes onImageError on failure", async () => {
    const adapter: ImageGenerationAdapter = {
      generate: vi.fn(async () => {
        throw new TypeError("boom");
      }),
    };
    const onImageError = vi.fn();
    const { result } = renderHook(() =>
      useImageGeneration(adapter, { onImageError }),
    );
    await act(async () => {
      await expect(result.current.generate("x")).rejects.toThrow();
    });
    expect(onImageError).toHaveBeenCalledWith(
      expect.objectContaining({ errorType: "TypeError", prompt: "x" }),
    );
  });
});

describe("useImagePartRegenerate — rate-limit window reset", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("resets after 60s so a fresh invocation can run", async () => {
    const adapter: ImageGenerationAdapter = {
      generate: vi.fn(async () => ({ image: "data:image/png;base64,AA==" })),
    };
    const { result } = renderHook(() =>
      useImagePartRegenerate({ prompt: "hi" }, adapter, {
        debounceMs: 0,
        rateLimit: { maxPerMinute: 2 },
      }),
    );

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await result.current.regenerate();
      });
    }
    expect(adapter.generate).toHaveBeenCalledTimes(2);

    // advance beyond 60s window
    await act(async () => {
      vi.advanceTimersByTime(60_001);
      await result.current.regenerate();
    });
    expect(adapter.generate).toHaveBeenCalledTimes(3);
  });
});
