// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import type { UIMessage } from "ai";
import { afterEach, expect, it, vi } from "vitest";
import { useStreamingTiming } from "./useStreamingTiming";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const answer: UIMessage = {
  id: "a1",
  role: "assistant",
  parts: [{ type: "text", text: "Previous answer" }],
};

it("times file output added to an existing answer without new text", () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(
    ({ messages, isRunning }) => useStreamingTiming(messages, isRunning),
    { initialProps: { messages: [answer], isRunning: false } },
  );
  vi.setSystemTime(1000);
  rerender({ messages: [answer], isRunning: true });
  vi.setSystemTime(1500);
  rerender({
    messages: [
      {
        ...answer,
        parts: [
          ...answer.parts,
          {
            type: "file",
            mediaType: "image/png",
            url: "https://example.com/image.png",
          },
        ],
      },
    ],
    isRunning: false,
  });
  expect(result.current.a1).toMatchObject({
    streamStartTime: 1000,
    totalStreamTime: 500,
    toolCallCount: 0,
  });
});

it("leaves equivalent history without timing after an empty run", () => {
  const { result, rerender } = renderHook(
    ({ messages, isRunning }) => useStreamingTiming(messages, isRunning),
    { initialProps: { messages: [answer], isRunning: false } },
  );
  rerender({ messages: [structuredClone(answer)], isRunning: true });
  rerender({ messages: [structuredClone(answer)], isRunning: false });
  expect(result.current).toEqual({});
});

it("leaves older history untimed when regeneration drops the latest answer", () => {
  const question: UIMessage = {
    id: "u2",
    role: "user",
    parts: [{ type: "text", text: "Next question" }],
  };
  const secondAnswer: UIMessage = { ...answer, id: "a2" };
  const { result, rerender } = renderHook(
    ({ messages, isRunning }) => useStreamingTiming(messages, isRunning),
    {
      initialProps: {
        messages: [answer, question, secondAnswer],
        isRunning: false,
      },
    },
  );
  rerender({ messages: [answer, question], isRunning: true });
  rerender({ messages: [answer, question], isRunning: false });
  expect(result.current).toEqual({});
});
