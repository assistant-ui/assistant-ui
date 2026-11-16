// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const { mockUseEveAgent } = vi.hoisted(() => ({
  mockUseEveAgent: vi.fn(),
}));

vi.mock("eve/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("eve/react")>()),
  useEveAgent: mockUseEveAgent,
}));

import { emptySessionView } from "eve/events";
import type { EveMessage } from "eve/react";
import { createEveDelivery } from "./testUtils";
import { useEveAgentRuntime } from "./useEveAgentRuntime";

afterEach(() => {
  vi.restoreAllMocks();
});

const messagesWithCall = (state: "requested" | "running"): EveMessage[] => [
  { id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] },
  {
    id: "a1",
    role: "assistant",
    parts: [
      {
        type: "tool",
        state,
        callId: "call_1",
        stepIndex: 0,
        kind: "tool",
        name: "send_email",
        label: "send_email",
        input: { to: "a@example.com" },
      },
    ],
  },
];

it.each(["requested", "running"] as const)(
  "never runs a frontend tool for an eve call left %s",
  async (state) => {
    const agent = {
      messages: messagesWithCall(state).slice(0, 1),
      view: emptySessionView(),
      error: undefined,
      events: [],
      session: undefined,
      status: "busy",
      cancel: vi.fn(async () => createEveDelivery()),
      newSession: vi.fn(),
      resume: vi.fn(async () => {}),
      send: vi.fn(async () => createEveDelivery()),
      respond: vi.fn(async () => createEveDelivery()),
    };
    mockUseEveAgent.mockImplementation(() => agent);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const execute = vi.fn(async () => ({ sent: true }));

    const { result, rerender } = renderHook(() => useEveAgentRuntime());
    result.current.registerModelContextProvider({
      getModelContext: () => ({
        tools: {
          send_email: {
            parameters: { type: "object", properties: {} },
            execute,
          },
        },
      }),
    });

    await act(async () => {
      agent.messages = messagesWithCall(state);
      rerender();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      agent.status = "idle";
      agent.messages = [...agent.messages];
      rerender();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.thread.getState().isRunning).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  },
);
