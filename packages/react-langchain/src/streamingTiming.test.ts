// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { LangChainBaseMessage } from "./types";
import { useStreamingTiming } from "./streamingTiming";

const ai = (
  fields: Partial<LangChainBaseMessage> & { id: string; content: unknown },
): LangChainBaseMessage => ({
  _getType: () => "ai",
  ...fields,
});

describe("useStreamingTiming", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty object when not running", () => {
    const messages: LangChainBaseMessage[] = [];
    const { result } = renderHook(() => useStreamingTiming(messages, false));
    expect(result.current).toEqual({});
  });

  it("tracks timing when streaming starts and ends", () => {
    const messages = [
      ai({ id: "msg-1", content: [{ type: "text", text: "Hello" }] }),
    ];

    const { result, rerender } = renderHook(
      ({ msgs, running }) => useStreamingTiming(msgs, running),
      { initialProps: { msgs: messages, running: true } },
    );

    vi.advanceTimersByTime(100);

    const updatedMessages = [
      ai({
        id: "msg-1",
        content: [{ type: "text", text: "Hello world! More text here." }],
      }),
    ];

    act(() => {
      rerender({ msgs: updatedMessages, running: true });
    });
    vi.advanceTimersByTime(200);

    act(() => {
      rerender({ msgs: updatedMessages, running: false });
    });

    const timing = result.current["msg-1"];
    expect(timing).toBeDefined();
    expect(timing!.totalStreamTime).toBeGreaterThanOrEqual(300);
    expect(timing!.totalChunks).toBe(2);
    expect(timing!.toolCallCount).toBe(0);
  });

  it("tracks first token time on content growth", () => {
    const initial = [ai({ id: "msg-1", content: "" })];

    const { result, rerender } = renderHook(
      ({ msgs, running }) => useStreamingTiming(msgs, running),
      { initialProps: { msgs: initial, running: true } },
    );

    vi.advanceTimersByTime(50);

    const withContent = [ai({ id: "msg-1", content: "First token!" })];

    act(() => {
      rerender({ msgs: withContent, running: true });
    });

    vi.advanceTimersByTime(100);

    act(() => {
      rerender({ msgs: withContent, running: false });
    });

    const timing = result.current["msg-1"];
    expect(timing).toBeDefined();
    expect(timing!.firstTokenTime).toBe(50);
  });

  it("sums text and thinking lengths in array content", () => {
    const initial = [ai({ id: "msg-1", content: [] })];

    const { result, rerender } = renderHook(
      ({ msgs, running }) => useStreamingTiming(msgs, running),
      { initialProps: { msgs: initial, running: true } },
    );

    vi.advanceTimersByTime(10);

    const grown = [
      ai({
        id: "msg-1",
        content: [
          { type: "thinking", thinking: "hmm" },
          { type: "text", text: "answer" },
        ],
      }),
    ];

    act(() => {
      rerender({ msgs: grown, running: true });
    });
    act(() => {
      rerender({ msgs: grown, running: false });
    });

    const timing = result.current["msg-1"];
    expect(timing).toBeDefined();
    expect(timing!.tokenCount).toBe(Math.ceil("hmmanswer".length / 4));
  });

  it("tracks tool calls", () => {
    const messages = [
      ai({
        id: "msg-1",
        content: "",
        tool_calls: [
          { id: "tool-1", name: "search", args: {} },
          { id: "tool-2", name: "fetch", args: {} },
        ],
      }),
    ];

    const { result, rerender } = renderHook(
      ({ msgs, running }) => useStreamingTiming(msgs, running),
      { initialProps: { msgs: messages, running: true } },
    );

    act(() => {
      rerender({ msgs: messages, running: false });
    });

    expect(result.current["msg-1"]?.toolCallCount).toBe(2);
  });

  it("tracks multiple content updates as chunks", () => {
    const { result, rerender } = renderHook(
      ({ msgs, running }) => useStreamingTiming(msgs, running),
      {
        initialProps: {
          msgs: [ai({ id: "msg-1", content: "a" })],
          running: true,
        },
      },
    );

    act(() => {
      rerender({ msgs: [ai({ id: "msg-1", content: "ab" })], running: true });
    });
    act(() => {
      rerender({ msgs: [ai({ id: "msg-1", content: "abc" })], running: true });
    });
    act(() => {
      rerender({ msgs: [ai({ id: "msg-1", content: "abc" })], running: false });
    });

    expect(result.current["msg-1"]?.totalChunks).toBe(3);
  });

  it("does not finalize timing while still running", () => {
    const messages = [ai({ id: "msg-1", content: "test" })];

    const { result } = renderHook(() => useStreamingTiming(messages, true));

    vi.advanceTimersByTime(500);

    expect(result.current).toEqual({});
  });
});
