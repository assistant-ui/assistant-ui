/** @vitest-environment jsdom */
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

describe("useSmooth", () => {
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

  it("accepts a SmoothOptions object as the enabled form", () => {
    const options: SmoothOptions = { drainMs: 500, maxCharsPerFrame: 30 };
    const state = textState("hello");
    const { result } = renderHook(() => useSmooth(state, options));
    expect(result.current.text).toBe("hello");
    expect(result.current.status).toBe(state.status);
  });
});
