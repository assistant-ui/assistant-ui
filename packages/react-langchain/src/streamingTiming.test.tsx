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
});
