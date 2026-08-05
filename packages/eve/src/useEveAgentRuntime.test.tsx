// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
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
import { eveExtras } from "./eveExtras";

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

describe("useEveAgentRuntime extras wiring", () => {
  it("provides error, events, session, and reset through the runtime extras", () => {
    const error = new Error("boom");
    const events = [{ type: "session.started" }];
    const session = { sessionId: "s1" };
    const reset = vi.fn();
    mockUseEveAgent.mockReturnValue(
      createAgent({ status: "error", error, events, session, reset }) as never,
    );

    const { result } = renderHook(() => useEveAgentRuntime());

    const extras = result.current.thread.getState().extras;
    expect(eveExtras.is(extras)).toBe(true);
    expect(eveExtras.tryGet(extras)).toMatchObject({
      error,
      events,
      session,
      reset: expect.any(Function),
    });
  });

  it("clears adapter-owned staged messages when reset is invoked", async () => {
    const agent = createAgent({
      data: { messages: [] } satisfies EveMessageData,
    });
    mockUseEveAgent.mockReturnValue(agent as never);

    const { result } = renderHook(() => useEveAgentRuntime());

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "draft" }],
        startRun: false,
      });
    });

    await waitFor(() => {
      expect(result.current.thread.getState().messages).toHaveLength(1);
    });

    act(() => {
      const extras = result.current.thread.getState().extras;
      eveExtras.tryGet(extras)!.reset();
    });

    await waitFor(() => {
      expect(result.current.thread.getState().messages).toHaveLength(0);
    });
    expect(agent.reset).toHaveBeenCalledTimes(1);
  });
});
