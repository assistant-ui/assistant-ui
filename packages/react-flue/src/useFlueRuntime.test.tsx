// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockCreateFlueClient, mockUseFlueAgent } = vi.hoisted(() => ({
  mockCreateFlueClient: vi.fn(),
  mockUseFlueAgent: vi.fn(),
}));

vi.mock("@flue/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@flue/react")>()),
  useFlueAgent: mockUseFlueAgent,
}));

vi.mock("@flue/sdk", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@flue/sdk")>()),
  createFlueClient: mockCreateFlueClient,
}));

import type { FlueConversationMessage } from "@flue/react";
import { useFlueRuntime } from "./useFlueRuntime";

const createAgent = (overrides: Record<string, unknown> = {}) => ({
  messages: [] as FlueConversationMessage[],
  status: "idle",
  historyReady: true,
  error: undefined,
  failedSends: [],
  settlements: [],
  sendMessage: vi.fn().mockResolvedValue({ submissionId: "submission-1" }),
  refresh: vi.fn(),
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useFlueRuntime", () => {
  it("forwards user messages and provider-specific send options", async () => {
    const agent = createAgent();
    mockUseFlueAgent.mockReturnValue(agent);
    const getSendOptions = vi.fn(() => ({ idempotencyKey: "message-1" }));
    const { result } = renderHook(() =>
      useFlueRuntime({
        url: "/api/agents/demo/conversation-1",
        getSendOptions,
      }),
    );

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "Run it" }],
      });
    });

    await waitFor(() => {
      expect(agent.sendMessage).toHaveBeenCalledWith("Run it", {
        idempotencyKey: "message-1",
      });
    });
    expect(getSendOptions).toHaveBeenCalledTimes(1);
  });

  it("maps Flue streaming state onto the runtime", () => {
    mockUseFlueAgent.mockReturnValue(
      createAgent({
        status: "streaming",
        messages: [
          {
            id: "assistant-1",
            role: "assistant",
            purpose: "assistant",
            display: "visible",
            parts: [{ type: "text", text: "Working", state: "streaming" }],
          },
        ] satisfies FlueConversationMessage[],
      }),
    );

    const { result } = renderHook(() =>
      useFlueRuntime({ url: "/api/agents/demo/conversation-1" }),
    );

    expect(result.current.thread.getState()).toMatchObject({
      isRunning: true,
      messages: [
        {
          role: "assistant",
          status: { type: "running" },
        },
      ],
    });
  });

  it("aborts a URL-addressed conversation through the Flue client", async () => {
    const agent = createAgent({ status: "streaming" });
    const abort = vi.fn().mockResolvedValue({ aborted: true });
    mockUseFlueAgent.mockReturnValue(agent);
    mockCreateFlueClient.mockReturnValue({ abort });
    const { result } = renderHook(() =>
      useFlueRuntime({ url: "/api/agents/demo/conversation-1" }),
    );

    act(() => result.current.thread.cancelRun());

    await waitFor(() => expect(abort).toHaveBeenCalledTimes(1));
    expect(mockCreateFlueClient).toHaveBeenCalledWith({
      url: "/api/agents/demo/conversation-1",
    });
  });
});
