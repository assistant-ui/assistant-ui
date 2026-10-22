// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LangChainBaseMessage } from "./types";
import { useLangChainStreamingTiming } from "./streamingTiming";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useLangChainStreamingTiming", () => {
  it("counts string entries alongside text blocks in the displayed answer", () => {
    const messages: LangChainBaseMessage[] = [
      {
        id: "a1",
        _getType: () => "ai",
        content: ["Hello ", { type: "text", text: "world" }],
      },
    ];
    const { result, rerender } = renderHook(
      ({ running }) => useLangChainStreamingTiming(messages, running),
      { initialProps: { running: true } },
    );
    rerender({ running: false });

    expect(result.current.a1?.tokenCount).toBe(3);
  });

  it("keeps the previous answer's timing when the next run ends before producing an answer", () => {
    vi.useFakeTimers();
    const user: LangChainBaseMessage = {
      id: "u1",
      _getType: () => "human",
      content: "First question",
    };
    const answer: LangChainBaseMessage = {
      id: "a1",
      _getType: () => "ai",
      content: "First answer",
    };
    vi.setSystemTime(1000);
    const { result, rerender } = renderHook(
      ({ messages, isRunning }) =>
        useLangChainStreamingTiming(messages, isRunning),
      {
        initialProps: {
          messages: [user, { ...answer, content: "" }],
          isRunning: true,
        },
      },
    );
    vi.setSystemTime(1100);
    rerender({ messages: [user, answer], isRunning: false });
    expect(result.current.a1).toMatchObject({
      streamStartTime: 1000,
      totalStreamTime: 100,
    });
    const firstTiming = result.current.a1;
    const nextUser: LangChainBaseMessage = {
      id: "u2",
      _getType: () => "human",
      content: "Next question",
    };
    vi.setSystemTime(2000);
    rerender({ messages: [user, answer, nextUser], isRunning: true });
    vi.setSystemTime(2500);
    rerender({ messages: [user, answer, nextUser], isRunning: false });
    expect(result.current.a1).toBe(firstTiming);
  });

  it("counts the reasoning fallback when summary is empty", () => {
    const messages: LangChainBaseMessage[] = [
      {
        id: "msg-1",
        _getType: () => "ai",
        content: [
          {
            type: "reasoning",
            summary: [],
            reasoning: "deduced",
          },
        ],
      },
    ];

    const { result, rerender } = renderHook(
      ({ msgs, running }) => useLangChainStreamingTiming(msgs, running),
      { initialProps: { msgs: messages, running: true } },
    );

    act(() => {
      rerender({ msgs: messages, running: false });
    });

    expect(result.current["msg-1"]?.tokenCount).toBe(
      Math.ceil("deduced".length / 4),
    );
  });

  it("counts a thinking block only when the converter renders it", () => {
    const tokenCount = (thinking: string) => {
      const messages: LangChainBaseMessage[] = [
        {
          id: "msg-1",
          _getType: () => "ai",
          content: [{ type: "thinking", thinking }],
        },
      ];
      const { result, rerender } = renderHook(
        ({ msgs, running }) => useLangChainStreamingTiming(msgs, running),
        { initialProps: { msgs: messages, running: true } },
      );
      act(() => {
        rerender({ msgs: messages, running: false });
      });
      return result.current["msg-1"]?.tokenCount;
    };

    expect(tokenCount("deduced")).toBe(Math.ceil("deduced".length / 4));
    expect(tokenCount("   ")).toBeUndefined();
  });

  it("counts the summary text the converter renders, not the reasoning it shadows", () => {
    const messages: LangChainBaseMessage[] = [
      {
        id: "msg-1",
        _getType: () => "ai",
        content: [
          {
            type: "reasoning",
            reasoning: "partial thinking",
            summary: [{ type: "summary_text", text: "first summary" }],
          },
        ],
      },
    ];
    const { result, rerender } = renderHook(
      ({ running }) => useLangChainStreamingTiming(messages, running),
      { initialProps: { running: true } },
    );
    act(() => {
      rerender({ running: false });
    });

    expect(result.current["msg-1"]?.tokenCount).toBe(
      Math.ceil("first summary".length / 4),
    );
  });
});
