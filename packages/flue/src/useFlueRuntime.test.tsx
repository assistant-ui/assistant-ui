// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { getExternalStoreMessages } from "@assistant-ui/core";
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

import type {
  FlueClient,
  FlueConversationMessage,
  UseFlueAgentResult,
} from "@flue/react";
import { useFlueRuntime } from "./useFlueRuntime";

const createAgent = (
  overrides: Partial<UseFlueAgentResult> = {},
): UseFlueAgentResult => ({
  messages: [],
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
  it.each([
    {
      outcome: "completed",
      error: undefined,
      status: { type: "complete", reason: "unknown" },
    },
    {
      outcome: "failed",
      error: "model failed",
      status: {
        type: "incomplete",
        reason: "error",
        error: { code: "unknown", message: "model failed" },
      },
    },
    {
      outcome: "aborted",
      error: undefined,
      status: { type: "incomplete", reason: "cancelled" },
    },
  ] as const)(
    "restores $outcome submissions after durable history loads",
    ({ outcome, error, status }) => {
      mockUseFlueAgent.mockReturnValue(
        createAgent({ status: "connecting", historyReady: false }),
      );
      const { result, rerender } = renderHook(() =>
        useFlueRuntime({ url: "/api/agents/demo/conversation-1" }),
      );

      expect(result.current.thread.getState()).toMatchObject({
        isLoading: true,
        isRunning: false,
        messages: [],
      });

      mockUseFlueAgent.mockReturnValue(
        createAgent({
          messages: [
            {
              id: "user-1",
              role: "user",
              purpose: "user",
              display: "visible",
              submissionId: "submission-1",
              parts: [{ type: "text", text: "Run it", state: "done" }],
            },
            {
              id: "assistant-1",
              role: "assistant",
              purpose: "assistant",
              display: "visible",
              submissionId: "submission-1",
              parts: [{ type: "text", text: "Restored reply", state: "done" }],
            },
          ],
          settlements: [{ submissionId: "submission-1", outcome, error }],
        }),
      );
      rerender();

      expect(result.current.thread.getState()).toMatchObject({
        isLoading: false,
        isRunning: false,
        messages: [
          {
            id: "user-1",
            role: "user",
            content: [{ type: "text", text: "Run it" }],
          },
          {
            id: "assistant-1",
            role: "assistant",
            content: [{ type: "text", text: "Restored reply" }],
            status,
          },
        ],
      });
    },
  );

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
    const message = {
      id: "assistant-1",
      role: "assistant",
      purpose: "assistant",
      display: "visible",
      parts: [{ type: "text", text: "Working", state: "streaming" }],
    } satisfies FlueConversationMessage;
    mockUseFlueAgent.mockReturnValue(
      createAgent({
        status: "streaming",
        messages: [message],
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
    expect(
      getExternalStoreMessages(result.current.thread.getState().messages[0]!),
    ).toEqual([message]);
  });

  it("keeps a reloaded streaming conversation running and cancellable", async () => {
    const messages: FlueConversationMessage[] = [
      {
        id: "assistant-1",
        role: "assistant",
        purpose: "assistant",
        display: "visible",
        submissionId: "submission-1",
        parts: [{ type: "text", text: "Still working", state: "done" }],
      },
    ];
    const abort = vi.fn().mockResolvedValue({ aborted: true });
    mockCreateFlueClient.mockReturnValue({ abort });
    mockUseFlueAgent.mockReturnValue(
      createAgent({ status: "connecting", historyReady: false }),
    );
    const { result, rerender } = renderHook(() =>
      useFlueRuntime({ url: "/api/agents/demo/conversation-1" }),
    );
    expect(result.current.thread.getState().isLoading).toBe(true);

    mockUseFlueAgent.mockReturnValue(
      createAgent({ status: "streaming", messages }),
    );
    rerender();

    expect(result.current.thread.getState()).toMatchObject({
      isLoading: false,
      isRunning: true,
      capabilities: { cancel: true },
      messages: [
        {
          id: "assistant-1",
          role: "assistant",
          content: [{ type: "text", text: "Still working" }],
          status: { type: "running" },
        },
      ],
    });

    await act(async () => result.current.thread.cancelRun());

    expect(abort).toHaveBeenCalledExactlyOnceWith();
    mockUseFlueAgent.mockReturnValue(
      createAgent({
        messages,
        settlements: [{ submissionId: "submission-1", outcome: "aborted" }],
      }),
    );
    rerender();

    expect(result.current.thread.getState()).toMatchObject({
      isRunning: false,
      messages: [
        {
          id: "assistant-1",
          status: { type: "incomplete", reason: "cancelled" },
        },
      ],
    });
  });

  it("aborts through the supplied client without creating another client", async () => {
    const abort = vi
      .fn<FlueClient["abort"]>()
      .mockResolvedValue({ aborted: true });
    const client = { abort } as unknown as FlueClient;
    mockUseFlueAgent.mockReturnValue(createAgent({ status: "streaming" }));
    const { result } = renderHook(() =>
      useFlueRuntime({ client, url: "/api/agents/demo/conversation-1" }),
    );

    expect(result.current.thread.getState().capabilities.cancel).toBe(true);

    await act(async () => result.current.thread.cancelRun());

    expect(abort).toHaveBeenCalledExactlyOnceWith();
    expect(mockCreateFlueClient).not.toHaveBeenCalled();
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

  it("aborts a submitted run before any assistant output", async () => {
    const abort = vi.fn().mockResolvedValue({ aborted: true });
    mockCreateFlueClient.mockReturnValue({ abort });
    mockUseFlueAgent.mockReturnValue(
      createAgent({
        status: "submitted",
        messages: [
          {
            id: "user-1",
            role: "user",
            purpose: "user",
            display: "visible",
            parts: [{ type: "text", text: "Run it", state: "done" }],
          },
        ],
      }),
    );
    const { result } = renderHook(() =>
      useFlueRuntime({ url: "/api/agents/demo/conversation-1" }),
    );

    expect(result.current.thread.getState()).toMatchObject({
      isRunning: true,
      capabilities: { cancel: true },
      messages: [
        { id: "user-1", role: "user" },
        {
          role: "assistant",
          content: [],
          status: { type: "running" },
          metadata: { isOptimistic: true },
        },
      ],
    });

    await act(async () => result.current.thread.cancelRun());

    expect(abort).toHaveBeenCalledExactlyOnceWith();
    expect(mockCreateFlueClient).toHaveBeenCalledExactlyOnceWith({
      url: "/api/agents/demo/conversation-1",
    });
  });

  it("accepts an abort response when there is no work left to abort", async () => {
    const abort = vi.fn().mockResolvedValue({ aborted: false });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockCreateFlueClient.mockReturnValue({ abort });
    mockUseFlueAgent.mockReturnValue(createAgent({ status: "streaming" }));
    const { result } = renderHook(() =>
      useFlueRuntime({ url: "/api/agents/demo/conversation-1" }),
    );

    await act(async () => {
      expect(() => result.current.thread.cancelRun()).not.toThrow();
    });

    expect(abort).toHaveBeenCalledExactlyOnceWith();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("does not expose cancellation without a client or URL", () => {
    mockUseFlueAgent.mockReturnValue(createAgent());
    const { result } = renderHook(() => useFlueRuntime());

    expect(result.current.thread.getState().capabilities.cancel).toBe(false);
    expect(mockCreateFlueClient).not.toHaveBeenCalled();
  });
});
