/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  MessagePartState,
  ReasoningMessagePart,
  TextMessagePart,
} from "@assistant-ui/core";

const part = {};
vi.mock("@assistant-ui/store", () => ({
  useAui: () => ({ part: () => part }),
  useAuiState: (selector: () => unknown) => selector(),
}));
vi.mock("./SmoothContext", () => ({
  useSmoothStatusStore: () => null,
}));

import { useSmooth, type SmoothOptions } from "./useSmooth";

const textState = (text: string) =>
  ({
    type: "text",
    text,
    status: { type: "complete", reason: "stop" },
  }) as MessagePartState & TextMessagePart;

const reasoningState = (text: string) =>
  ({
    type: "reasoning",
    text,
    status: { type: "complete", reason: "stop" },
  }) as MessagePartState & ReasoningMessagePart;

const runningState = (text: string) =>
  ({
    type: "text",
    text,
    status: { type: "running" },
  }) as MessagePartState & TextMessagePart;

const setReducedMotion = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
};

const driveAndCount = (minCommitMs: number) => {
  const raf: FrameRequestCallback[] = [];
  const rafSpy = vi
    .spyOn(globalThis, "requestAnimationFrame")
    .mockImplementation((cb) => {
      raf.push(cb);
      return raf.length;
    });
  const cafSpy = vi
    .spyOn(globalThis, "cancelAnimationFrame")
    .mockImplementation(() => {});
  let now = 1000;
  const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => now);

  const state = runningState("0123456789");
  const { result, unmount } = renderHook(() =>
    useSmooth(state, {
      minCommitMs,
      maxCharsPerFrame: 1,
      maxCharIntervalMs: 1,
    }),
  );

  const seen = new Set<string>();
  let guard = 0;
  while (raf.length > 0 && guard < 100) {
    guard++;
    const cb = raf.shift()!;
    now += 16;
    act(() => {
      cb(now);
    });
    seen.add(result.current.text);
  }

  const final = result.current.text;
  unmount();
  rafSpy.mockRestore();
  cafSpy.mockRestore();
  nowSpy.mockRestore();
  return { final, commits: seen.size };
};

describe("useSmooth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("returns the input state unchanged when disabled", () => {
    const state = textState("hello");
    const { result } = renderHook(() => useSmooth(state, false));
    expect(result.current).toBe(state);
  });

  it("returns the full text immediately for settled parts when enabled", () => {
    const state = textState("hello");
    const { result } = renderHook(() => useSmooth(state, true));
    expect(result.current.text).toBe("hello");
    expect(result.current.status).toBe(state.status);
  });

  it("preserves the part type for reasoning parts", () => {
    const state = reasoningState("thinking...");
    const { result } = renderHook(() => useSmooth(state, true));
    expect(result.current.type).toBe("reasoning");
    expect(result.current.text).toBe("thinking...");
  });

  it("tolerates null as disabled", () => {
    const state = textState("hello");
    const { result } = renderHook(() =>
      useSmooth(state, null as unknown as boolean),
    );
    expect(result.current).toBe(state);
  });

  it("disables the reveal under prefers-reduced-motion", () => {
    setReducedMotion(true);
    const state = runningState("streaming");
    const { result } = renderHook(() => useSmooth(state, true));
    expect(result.current).toBe(state);
    expect(result.current.text).toBe("streaming");
  });

  it("starts from an empty reveal for running parts when enabled", () => {
    const state = {
      type: "text",
      text: "streaming",
      status: { type: "running" },
    } as MessagePartState & TextMessagePart;
    const { result } = renderHook(() => useSmooth(state, true));
    expect(result.current.text).toBe("");
    expect(result.current.status.type).toBe("running");
  });

  it("falls back to defaults for non-positive or NaN options", () => {
    const state = textState("hello");
    const { result } = renderHook(() =>
      useSmooth(state, {
        drainMs: -1,
        maxCharIntervalMs: NaN,
        maxCharsPerFrame: 0,
      }),
    );
    expect(result.current.text).toBe("hello");
    expect(result.current.status).toBe(state.status);
  });

  it("accepts a SmoothOptions object as the enabled form", () => {
    const options: SmoothOptions = { drainMs: 500, maxCharsPerFrame: 30 };
    const state = textState("hello");
    const { result } = renderHook(() => useSmooth(state, options));
    expect(result.current.text).toBe("hello");
    expect(result.current.status).toBe(state.status);
  });

  it("commits fewer times under minCommitMs without losing characters", () => {
    const everyFrame = driveAndCount(0);
    const floored = driveAndCount(50);

    expect(everyFrame.final).toBe("0123456789");
    expect(floored.final).toBe("0123456789");
    expect(floored.commits).toBeLessThan(everyFrame.commits);
  });

  it("commits the first frame after a discontinuity without waiting out minCommitMs", () => {
    const raf: FrameRequestCallback[] = [];
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
      raf.push(cb);
      return raf.length;
    });
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
    let now = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);

    const frame = () => {
      if (raf.length === 0) return;
      const cb = raf.shift()!;
      now += 16;
      act(() => {
        cb(now);
      });
    };

    const options: SmoothOptions = {
      minCommitMs: 10000,
      maxCharsPerFrame: 1,
      maxCharIntervalMs: 1,
    };
    const { result, rerender } = renderHook(
      (part) => useSmooth(part, options),
      {
        initialProps: runningState("aaaaaaaaaa"),
      },
    );

    frame();
    expect(result.current.text).toBe("a");
    frame();
    expect(result.current.text).toBe("a");

    rerender(runningState("zzzzzzzzzz"));
    frame();
    expect(result.current.text).toBe("z");
  });
});
