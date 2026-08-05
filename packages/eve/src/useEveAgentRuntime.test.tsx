// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { mockUseEveAgent } = vi.hoisted(() => ({
  mockUseEveAgent: vi.fn(),
}));

vi.mock("eve/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("eve/react")>()),
  useEveAgent: mockUseEveAgent,
}));

import type { EveMessageData } from "eve/react";
import { useEveAgentRuntime } from "./useEveAgentRuntime";

const stuckStreamingData: EveMessageData = {
  messages: [
    { id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] },
    {
      id: "a1",
      role: "assistant",
      metadata: { status: "streaming" },
      parts: [{ type: "text", text: "Let me th" }],
    },
  ],
};

const createAgent = (overrides: Record<string, unknown>) => ({
  data: stuckStreamingData,
  error: undefined,
  events: [],
  session: undefined,
  status: "ready",
  send: vi.fn(),
  stop: vi.fn(),
  reset: vi.fn(),
  ...overrides,
});

describe("useEveAgentRuntime status forwarding", () => {
  it("maps the session error onto the interrupted assistant message", () => {
    mockUseEveAgent.mockReturnValue(
      createAgent({ status: "error", error: new Error("boom") }) as never,
    );

    const { result } = renderHook(() => useEveAgentRuntime());

    expect(result.current.thread.getState().messages.at(-1)?.status).toEqual({
      type: "incomplete",
      reason: "error",
      error: { code: "unknown", message: "boom" },
    });
  });

  it("settles an aborted turn to cancelled once the agent is idle", () => {
    mockUseEveAgent.mockReturnValue(createAgent({ status: "ready" }) as never);

    const { result } = renderHook(() => useEveAgentRuntime());

    expect(result.current.thread.getState().messages.at(-1)?.status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("recomputes statuses when only the session error changes", () => {
    const idle = createAgent({ status: "ready" });
    mockUseEveAgent.mockReturnValue(idle as never);

    const { result, rerender } = renderHook(() => useEveAgentRuntime());

    expect(result.current.thread.getState().messages.at(-1)?.status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });

    mockUseEveAgent.mockReturnValue({
      ...idle,
      status: "error",
      error: new Error("boom"),
    } as never);
    rerender();

    expect(result.current.thread.getState().messages.at(-1)?.status).toEqual({
      type: "incomplete",
      reason: "error",
      error: { code: "unknown", message: "boom" },
    });
  });

  it("keeps the last assistant message running while streaming", () => {
    mockUseEveAgent.mockReturnValue(
      createAgent({ status: "streaming" }) as never,
    );

    const { result } = renderHook(() => useEveAgentRuntime());

    expect(result.current.thread.getState().messages.at(-1)?.status).toEqual({
      type: "running",
    });
  });
});

describe("useEveAgentRuntime tool approval responses", () => {
  const textRequestData: EveMessageData = {
    messages: [
      { id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] },
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            state: "approval-requested",
            toolCallId: "call_1",
            toolName: "ask_question",
            input: {},
            approval: { id: "req_1" },
            toolMetadata: {
              eve: {
                kind: "tool-call",
                name: "ask_question",
                inputRequest: {
                  requestId: "req_1",
                  prompt: "What should the subject line be?",
                  display: "text",
                },
              },
            },
          },
        ],
      },
    ],
  };

  const flushMicrotasks = () =>
    new Promise((resolve) => setTimeout(resolve, 0));

  const processEvents = process as unknown as {
    on(event: "unhandledRejection", listener: (reason: unknown) => void): void;
    off(event: "unhandledRejection", listener: (reason: unknown) => void): void;
  };

  const respondToTextRequest = (
    result: { current: ReturnType<typeof useEveAgentRuntime> },
    response: { approved: boolean; reason?: string },
  ) =>
    result.current.thread
      .getMessageById("a1")
      .getMessagePartByToolCallId("call_1")
      .respondToToolApproval(response);

  it("throws synchronously without submitting when a free-form request is answered without text", async () => {
    const rejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => rejections.push(reason);
    processEvents.on("unhandledRejection", onUnhandledRejection);
    const agent = createAgent({ data: textRequestData });
    mockUseEveAgent.mockReturnValue(agent as never);

    try {
      const { result } = renderHook(() => useEveAgentRuntime());

      expect(() => respondToTextRequest(result, { approved: true })).toThrow(
        /What should the subject line be\?/,
      );

      await flushMicrotasks();
      await flushMicrotasks();

      expect(agent.send).not.toHaveBeenCalled();
      expect(rejections).toEqual([]);
    } finally {
      processEvents.off("unhandledRejection", onUnhandledRejection);
    }
  });

  it("submits a free-form answer as text without an option id", async () => {
    const agent = createAgent({ data: textRequestData });
    mockUseEveAgent.mockReturnValue(agent as never);

    const { result } = renderHook(() => useEveAgentRuntime());
    respondToTextRequest(result, {
      approved: true,
      reason: "Quarterly results",
    });

    await flushMicrotasks();

    expect(agent.send).toHaveBeenCalledWith({
      inputResponses: [{ requestId: "req_1", text: "Quarterly results" }],
    });
  });
});
