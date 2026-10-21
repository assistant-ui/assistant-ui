// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  useStreamingTiming,
  type StreamingTimingAccessors,
} from "./useStreamingTiming";

type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
  toolCalls: number;
};

const accessors: StreamingTimingAccessors<Message> = {
  getAssistantMessageId: (messages) =>
    messages.findLast((message) => message.role === "assistant")?.id,
  getTextLength: (messages, id) =>
    messages.find((message) => message.id === id)?.text.length ?? 0,
  getToolCallCount: (messages, id) =>
    messages.find((message) => message.id === id)?.toolCalls ?? 0,
};

const answer: Message = {
  id: "a1",
  role: "assistant",
  text: "First answer",
  toolCalls: 0,
};
const nextQuestion: Message = {
  id: "u2",
  role: "user",
  text: "Next question",
  toolCalls: 0,
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("preserves an answer's timing when the next run produces no output", () => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  const { result, rerender } = renderHook(
    ({ messages, isRunning }) =>
      useStreamingTiming(messages, isRunning, accessors),
    { initialProps: { messages: [{ ...answer, text: "" }], isRunning: true } },
  );
  vi.setSystemTime(1100);
  rerender({ messages: [answer], isRunning: false });
  expect(result.current.a1).toMatchObject({
    streamStartTime: 1000,
    totalStreamTime: 100,
  });
  const firstTiming = result.current.a1;

  vi.setSystemTime(2000);
  rerender({ messages: [answer, nextQuestion], isRunning: true });
  vi.setSystemTime(2500);
  rerender({ messages: [answer, nextQuestion], isRunning: false });
  expect(result.current.a1).toBe(firstTiming);

  vi.setSystemTime(3000);
  rerender({
    messages: [answer, nextQuestion, { ...answer, id: "a2", text: "" }],
    isRunning: true,
  });
  vi.setSystemTime(3100);
  rerender({
    messages: [
      answer,
      nextQuestion,
      { ...answer, id: "a2", text: "Next answer" },
    ],
    isRunning: false,
  });
  expect(result.current.a1).toBe(firstTiming);
  expect(result.current.a2).toMatchObject({
    streamStartTime: 3000,
    totalStreamTime: 100,
    firstTokenTime: 100,
  });
});

it("does not invent timing for loaded history when a run produces no output", () => {
  const { result, rerender } = renderHook(
    ({ messages, isRunning }) =>
      useStreamingTiming(messages, isRunning, accessors),
    { initialProps: { messages: [answer], isRunning: false } },
  );
  rerender({ messages: [answer, nextQuestion], isRunning: true });
  rerender({ messages: [answer, nextQuestion], isRunning: false });
  expect(result.current).toEqual({});
});

it.each([
  { text: "First answer continued", toolCalls: 0, tokenCount: 6 },
  { text: "First answer", toolCalls: 1, tokenCount: 3 },
])(
  "times same-message continuations with $toolCalls tool calls",
  ({ text, toolCalls, tokenCount }) => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ messages, isRunning }) =>
        useStreamingTiming(messages, isRunning, accessors),
      { initialProps: { messages: [answer], isRunning: false } },
    );
    vi.setSystemTime(2000);
    rerender({ messages: [answer], isRunning: true });
    vi.setSystemTime(2500);
    rerender({ messages: [{ ...answer, text, toolCalls }], isRunning: false });
    expect(result.current.a1).toMatchObject({
      streamStartTime: 2000,
      totalStreamTime: 500,
      tokenCount,
      toolCallCount: toolCalls,
    });
  },
);

it("times an existing message when mounted during a run", () => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  const { result, rerender } = renderHook(
    ({ isRunning }) => useStreamingTiming([answer], isRunning, accessors),
    { initialProps: { isRunning: true } },
  );
  vi.setSystemTime(1100);
  rerender({ isRunning: false });
  expect(result.current.a1).toMatchObject({
    streamStartTime: 1000,
    totalStreamTime: 100,
    tokenCount: 3,
  });
});

it("times a regenerated message even when its final text has the same length", () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(
    ({ messages, isRunning }) =>
      useStreamingTiming(messages, isRunning, accessors),
    { initialProps: { messages: [answer], isRunning: false } },
  );
  vi.setSystemTime(2000);
  rerender({ messages: [{ ...answer, text: "" }], isRunning: true });
  vi.setSystemTime(2500);
  rerender({
    messages: [{ ...answer, text: "Other answer" }],
    isRunning: false,
  });
  expect(result.current.a1).toMatchObject({
    streamStartTime: 2000,
    totalStreamTime: 500,
    tokenCount: 3,
    firstTokenTime: 500,
  });
});
