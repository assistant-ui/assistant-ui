// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LangChainBaseMessage } from "./types";
import { useLangChainStreamingTiming } from "./streamingTiming";

describe("useLangChainStreamingTiming", () => {
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
