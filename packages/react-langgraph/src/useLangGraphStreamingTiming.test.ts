import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { LangChainMessage } from "./types";
import { useLangGraphStreamingTiming } from "./useLangGraphStreamingTiming";

describe("useLangGraphStreamingTiming", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty object when not running", () => {
    const messages: LangChainMessage[] = [];
    const { result } = renderHook(() =>
      useLangGraphStreamingTiming(messages, false),
    );
    expect(result.current).toEqual({});
  });

  it("tracks timing when streaming starts and ends", () => {
    const messages: LangChainMessage[] = [
      {
        id: "msg-1",
        type: "ai",
        content: [{ type: "text", text: "Hello" }],
      } as never,
    ];

    const { result, rerender } = renderHook(
      ({ msgs, running }) => useLangGraphStreamingTiming(msgs, running),
      { initialProps: { msgs: messages, running: true } },
    );

    // Advance time to simulate streaming
    vi.advanceTimersByTime(100);

    // Update message content to trigger first token
    const updatedMessages: LangChainMessage[] = [
      {
        id: "msg-1",
        type: "ai",
        content: [{ type: "text", text: "Hello world! More text here." }],
      } as never,
    ];

    act(() => {
      rerender({ msgs: updatedMessages, running: true });
    });
    vi.advanceTimersByTime(200);

    // Streaming ends
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
    const initial: LangChainMessage[] = [
      { id: "msg-1", type: "ai", content: "" } as never,
    ];

    const { result, rerender } = renderHook(
      ({ msgs, running }) => useLangGraphStreamingTiming(msgs, running),
      { initialProps: { msgs: initial, running: true } },
    );

    vi.advanceTimersByTime(50);

    const withContent: LangChainMessage[] = [
      { id: "msg-1", type: "ai", content: "First token!" } as never,
    ];

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

  it("tracks tool calls", () => {
    const messages: LangChainMessage[] = [
      {
        id: "msg-1",
        type: "ai",
        content: "",
        tool_calls: [
          { id: "tool-1", name: "search", args: {}, partial_json: "{}" },
          { id: "tool-2", name: "fetch", args: {}, partial_json: "{}" },
        ],
      } as never,
    ];

    const { result, rerender } = renderHook(
      ({ msgs, running }) => useLangGraphStreamingTiming(msgs, running),
      { initialProps: { msgs: messages, running: true } },
    );

    act(() => {
      rerender({ msgs: messages, running: false });
    });

    expect(result.current["msg-1"]?.toolCallCount).toBe(2);
  });

  it("tracks multiple content updates as chunks", () => {
    const messages: LangChainMessage[] = [
      { id: "msg-1", type: "ai", content: "a" } as never,
    ];

    const { result, rerender } = renderHook(
      ({ msgs, running }) => useLangGraphStreamingTiming(msgs, running),
      { initialProps: { msgs: messages, running: true } },
    );

    act(() => {
      rerender({
        msgs: [{ id: "msg-1", type: "ai", content: "ab" } as never],
        running: true,
      });
    });
    act(() => {
      rerender({
        msgs: [{ id: "msg-1", type: "ai", content: "abc" } as never],
        running: true,
      });
    });

    act(() => {
      rerender({
        msgs: [{ id: "msg-1", type: "ai", content: "abc" } as never],
        running: false,
      });
    });

    expect(result.current["msg-1"]?.totalChunks).toBe(3);
  });

  it("does not finalize timing while still running", () => {
    const messages: LangChainMessage[] = [
      { id: "msg-1", type: "ai", content: "test" } as never,
    ];

    const { result } = renderHook(() =>
      useLangGraphStreamingTiming(messages, true),
    );

    vi.advanceTimersByTime(500);

    expect(result.current).toEqual({});
  });
});
