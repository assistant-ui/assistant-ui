// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  respond: vi.fn(),
  stop: vi.fn(),
  reset: vi.fn(),
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useEveAgentRuntime status forwarding", () => {
  it.each(
    (["onError", "onEvent", "onFinish", "onSessionChange"] as const).flatMap(
      (callbackName) =>
        (["throws", "rejects"] as const).map(
          (failureMode) => [callbackName, failureMode] as const,
        ),
    ),
  )(
    "isolates %s callback errors when it %s",
    async (callbackName, failureMode) => {
      const callbackError = new Error(`${callbackName} failed`);
      const callback = vi.fn(() => {
        if (failureMode === "throws") throw callbackError;
        return Promise.reject(callbackError);
      });
      const agent = createAgent({ data: { messages: [] } });
      let capturedOptions: Record<
        string,
        ((value: unknown) => void) | undefined
      > = {};
      mockUseEveAgent.mockImplementation((options) => {
        capturedOptions = options as typeof capturedOptions;
        return agent as never;
      });
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      renderHook(() =>
        useEveAgentRuntime({ [callbackName]: callback } as never),
      );

      const value =
        callbackName === "onFinish"
          ? { status: "ready" }
          : callbackName === "onError"
            ? new Error("run failed")
            : {};
      expect(() => capturedOptions[callbackName]?.(value)).not.toThrow();
      expect(callback).toHaveBeenCalledWith(value);
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          `[assistant-ui/eve] ${callbackName} callback threw an error`,
          callbackError,
        );
      });
    },
  );

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

  it("forwards runConfig to eve as one-turn client context when sending", async () => {
    const agent = createAgent({
      data: { messages: [] } satisfies EveMessageData,
    });
    mockUseEveAgent.mockReturnValue(agent as never);

    const { result } = renderHook(() => useEveAgentRuntime());

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
        runConfig: { custom: { page: "/pricing" } },
      });
    });

    await waitFor(() => {
      expect(agent.send).toHaveBeenCalledWith("hello", {
        clientContext: { page: "/pricing" },
      });
    });
  });

  it("omits clientContext when no runConfig is provided", async () => {
    const agent = createAgent({
      data: { messages: [] } satisfies EveMessageData,
    });
    mockUseEveAgent.mockReturnValue(agent as never);

    const { result } = renderHook(() => useEveAgentRuntime());

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
      });
    });

    await waitFor(() => {
      expect(agent.send).toHaveBeenCalledWith("hello", undefined);
    });
  });

  it("omits clientContext when runConfig.custom is empty", async () => {
    const agent = createAgent({
      data: { messages: [] } satisfies EveMessageData,
    });
    mockUseEveAgent.mockReturnValue(agent as never);

    const { result } = renderHook(() => useEveAgentRuntime());

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
        runConfig: { custom: {} },
      });
    });

    await waitFor(() => {
      expect(agent.send).toHaveBeenCalledWith("hello", undefined);
    });
  });

  it("prefers the reload-time runConfig over the staged one", async () => {
    const agent = createAgent({
      data: { messages: [] } satisfies EveMessageData,
    });
    mockUseEveAgent.mockReturnValue(agent as never);

    const { result } = renderHook(() => useEveAgentRuntime());

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
        startRun: false,
        runConfig: { custom: { page: "/staged" } },
      });
    });

    await waitFor(() => {
      expect(result.current.thread.getState().messages.length).toBe(1);
    });
    const stagedId = result.current.thread.getState().messages[0]!.id;

    act(() => {
      result.current.thread.startRun({
        parentId: stagedId,
        runConfig: { custom: { page: "/reload" } },
      });
    });

    await waitFor(() => {
      expect(agent.send).toHaveBeenCalledWith("hello", {
        clientContext: { page: "/reload" },
      });
    });
  });

  it("falls back to the staged runConfig when reload passes none", async () => {
    const agent = createAgent({
      data: { messages: [] } satisfies EveMessageData,
    });
    mockUseEveAgent.mockReturnValue(agent as never);

    const { result } = renderHook(() => useEveAgentRuntime());

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
        startRun: false,
        runConfig: { custom: { page: "/staged" } },
      });
    });

    await waitFor(() => {
      expect(result.current.thread.getState().messages.length).toBe(1);
    });
    const stagedId = result.current.thread.getState().messages[0]!.id;

    act(() => {
      result.current.thread.startRun({ parentId: stagedId });
    });

    await waitFor(() => {
      expect(agent.send).toHaveBeenCalledWith("hello", {
        clientContext: { page: "/staged" },
      });
    });
  });

  // Known limitation: core normalizes an omitted reload runConfig to {}
  // (toStartRunConfig in core/src/runtime/api/thread-runtime.ts), so an
  // explicit empty reload config is indistinguishable from an omitted one at
  // the adapter and cannot clear the staged context.
  it("cannot clear the staged runConfig with an explicit empty reload config", async () => {
    const agent = createAgent({
      data: { messages: [] } satisfies EveMessageData,
    });
    mockUseEveAgent.mockReturnValue(agent as never);

    const { result } = renderHook(() => useEveAgentRuntime());

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
        startRun: false,
        runConfig: { custom: { page: "/staged" } },
      });
    });

    await waitFor(() => {
      expect(result.current.thread.getState().messages.length).toBe(1);
    });
    const stagedId = result.current.thread.getState().messages[0]!.id;

    act(() => {
      result.current.thread.startRun({ parentId: stagedId, runConfig: {} });
    });

    await waitFor(() => {
      expect(agent.send).toHaveBeenCalledWith("hello", {
        clientContext: { page: "/staged" },
      });
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

const settledData: EveMessageData = {
  messages: [
    { id: "u1", role: "user", parts: [{ type: "text", text: "earlier" }] },
    {
      id: "a1",
      role: "assistant",
      parts: [{ type: "text", text: "earlier answer" }],
    },
  ],
};

const getText = (runtime: ReturnType<typeof useEveAgentRuntime>) =>
  runtime.thread
    .getState()
    .messages.map((message) =>
      message.content
        .flatMap((part) => (part.type === "text" ? [part.text] : []))
        .join(""),
    );

const stageMessage = async (
  runtime: ReturnType<typeof useEveAgentRuntime>,
  text: string,
) => {
  await act(async () => {
    runtime.thread.append({
      role: "user",
      content: [{ type: "text", text }],
      startRun: false,
    });
  });
};

describe("useEveAgentRuntime staged messages", () => {
  it("stages a user message without submitting when startRun is false", async () => {
    const agent = createAgent({ data: settledData });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await stageMessage(result.current, "staged draft");

    await waitFor(() => {
      expect(getText(result.current)).toEqual([
        "earlier",
        "earlier answer",
        "staged draft",
      ]);
    });
    expect(agent.send).not.toHaveBeenCalled();
  });

  it("renders new turns and refloats staged drafts after a normal send", async () => {
    const agent = createAgent({ data: settledData });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result, rerender } = renderHook(() => useEveAgentRuntime());

    await stageMessage(result.current, "staged draft");

    await act(async () => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
      });
    });
    expect(agent.send).toHaveBeenCalledWith("hello", undefined);

    mockUseEveAgent.mockReturnValue(
      createAgent({
        data: {
          messages: [
            ...settledData.messages,
            {
              id: "u2",
              role: "user",
              parts: [{ type: "text", text: "hello" }],
            },
            {
              id: "a2",
              role: "assistant",
              parts: [{ type: "text", text: "hi there" }],
            },
          ],
        },
        send: agent.send,
      }) as never,
    );
    rerender();

    await waitFor(() => {
      expect(getText(result.current)).toEqual([
        "earlier",
        "earlier answer",
        "hello",
        "hi there",
        "staged draft",
      ]);
    });
  });

  it("keeps both drafts when two appends stage in the same batch", async () => {
    const agent = createAgent({ data: settledData });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await act(async () => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "first staged" }],
        startRun: false,
      });
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "second staged" }],
        startRun: false,
      });
    });

    await waitFor(() => {
      expect(getText(result.current)).toEqual([
        "earlier",
        "earlier answer",
        "first staged",
        "second staged",
      ]);
    });
    expect(agent.send).not.toHaveBeenCalled();
  });

  it("restores staged drafts when a promoted send rejects and promotes them all on retry", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(
        new Error("eve session is already processing a turn."),
      )
      .mockResolvedValue(undefined);
    const agent = createAgent({ data: settledData, send });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await stageMessage(result.current, "first staged");
    await stageMessage(result.current, "second staged");

    const secondStagedId = result.current.thread.getState().messages[3]!.id;
    await expect(
      Promise.resolve(
        result.current.thread.startRun({
          parentId: secondStagedId,
          sourceId: null,
          runConfig: {},
        }),
      ),
    ).rejects.toThrow("eve session is already processing a turn.");

    expect(send).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(getText(result.current)).toEqual([
        "earlier",
        "earlier answer",
        "first staged",
        "second staged",
      ]);
    });

    await act(async () => {
      await result.current.thread.startRun({
        parentId: secondStagedId,
        sourceId: null,
        runConfig: {},
      });
    });

    expect(send).toHaveBeenCalledTimes(3);
    expect(send).toHaveBeenNthCalledWith(2, "first staged", undefined);
    expect(send).toHaveBeenNthCalledWith(3, "second staged", undefined);
    await waitFor(() => {
      expect(getText(result.current)).toEqual(["earlier", "earlier answer"]);
    });
  });

  it("applies the reload runConfig only to the message being reloaded", async () => {
    const agent = createAgent({ data: settledData });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    const stageWithConfig = async (text: string, page: string) => {
      await act(async () => {
        result.current.thread.append({
          role: "user",
          content: [{ type: "text", text }],
          startRun: false,
          runConfig: { custom: { page } },
        });
      });
    };

    await stageWithConfig("first staged", "/first");
    await stageWithConfig("second staged", "/second");

    const secondStagedId = result.current.thread.getState().messages[3]!.id;
    await act(async () => {
      await result.current.thread.startRun({
        parentId: secondStagedId,
        sourceId: null,
        runConfig: { custom: { page: "/reloaded" } },
      });
    });

    // the earlier draft keeps the context it was staged with; only the
    // reloaded message takes the reload-time config
    expect(agent.send).toHaveBeenNthCalledWith(1, "first staged", {
      clientContext: { page: "/first" },
    });
    expect(agent.send).toHaveBeenNthCalledWith(2, "second staged", {
      clientContext: { page: "/reloaded" },
    });
  });

  it("keeps later staged messages visible after promoting one staged parent", async () => {
    const agent = createAgent({ data: settledData });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await stageMessage(result.current, "first staged");
    await stageMessage(result.current, "second staged");

    const firstStagedId = result.current.thread.getState().messages[2]!.id;
    await act(async () => {
      await result.current.thread.startRun({
        parentId: firstStagedId,
        sourceId: null,
        runConfig: {},
      });
    });

    expect(agent.send).toHaveBeenCalledTimes(1);
    expect(agent.send).toHaveBeenCalledWith("first staged", undefined);
    await waitFor(() => {
      expect(getText(result.current)).toEqual([
        "earlier",
        "earlier answer",
        "second staged",
      ]);
    });
  });

  it("promotes the staged prefix sequentially when reloading the last staged message", async () => {
    let resolveFirstSend!: () => void;
    const send = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstSend = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const agent = createAgent({ data: settledData, send });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await stageMessage(result.current, "first staged");
    await stageMessage(result.current, "second staged");

    const secondStagedId = result.current.thread.getState().messages[3]!.id;
    act(() => {
      void result.current.thread.startRun({
        parentId: secondStagedId,
        sourceId: null,
        runConfig: {},
      });
    });

    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send).toHaveBeenNthCalledWith(1, "first staged", undefined);

    await act(async () => {
      resolveFirstSend();
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send).toHaveBeenNthCalledWith(2, "second staged", undefined);

    await waitFor(() => {
      expect(getText(result.current)).toEqual(["earlier", "earlier answer"]);
    });

    await expect(
      Promise.resolve(
        result.current.thread.startRun({
          parentId: secondStagedId,
          sourceId: null,
          runConfig: {},
        }),
      ),
    ).rejects.toThrow("Runtime does not support reloading messages.");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("keeps staged drafts when the session collapses to empty", async () => {
    const agent = createAgent({ data: settledData });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result, rerender } = renderHook(() => useEveAgentRuntime());

    await stageMessage(result.current, "staged draft");

    mockUseEveAgent.mockReturnValue(
      createAgent({ data: { messages: [] }, send: agent.send }) as never,
    );
    rerender();

    await waitFor(() => {
      expect(getText(result.current)).toEqual(["staged draft"]);
    });
  });

  it("stops promoting once a promoted turn parks with an error status", async () => {
    let capturedOptions: {
      onFinish?: (snapshot: { status: string }) => void;
    } = {};
    const send = vi.fn().mockImplementation(async () => {
      capturedOptions.onFinish?.({ status: "error" });
    });
    const agent = createAgent({ data: settledData, send });
    mockUseEveAgent.mockImplementation((options) => {
      capturedOptions = options as typeof capturedOptions;
      return agent as never;
    });
    const { result } = renderHook(() => useEveAgentRuntime());

    await stageMessage(result.current, "first staged");
    await stageMessage(result.current, "second staged");

    const secondStagedId = result.current.thread.getState().messages[3]!.id;
    await act(async () => {
      await result.current.thread.startRun({
        parentId: secondStagedId,
        sourceId: null,
        runConfig: {},
      });
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("first staged", undefined);
    await waitFor(() => {
      expect(getText(result.current)).toEqual([
        "earlier",
        "earlier answer",
        "second staged",
      ]);
    });
  });

  it("stops promoting when the run is cancelled mid-prefix", async () => {
    let resolveFirstSend!: () => void;
    const send = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstSend = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const agent = createAgent({ data: settledData, send });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await stageMessage(result.current, "first staged");
    await stageMessage(result.current, "second staged");

    const secondStagedId = result.current.thread.getState().messages[3]!.id;
    act(() => {
      void result.current.thread.startRun({
        parentId: secondStagedId,
        sourceId: null,
        runConfig: {},
      });
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.thread.cancelRun();
    });
    await act(async () => {
      resolveFirstSend();
    });

    expect(send).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(getText(result.current)).toEqual([
        "earlier",
        "earlier answer",
        "second staged",
      ]);
    });
  });

  it("still rejects reloading a non-staged message", async () => {
    const agent = createAgent({ data: settledData });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await stageMessage(result.current, "staged draft");

    await expect(
      Promise.resolve(
        result.current.thread.startRun({
          parentId: "a1",
          sourceId: null,
          runConfig: {},
        }),
      ),
    ).rejects.toThrow("Runtime does not support reloading messages.");
    expect(agent.send).not.toHaveBeenCalled();
  });
});

const approvalData: EveMessageData = {
  messages: [
    { id: "u1", role: "user", parts: [{ type: "text", text: "send it" }] },
    {
      id: "a1",
      role: "assistant",
      parts: [
        {
          type: "dynamic-tool",
          state: "approval-requested",
          toolCallId: "call_1",
          toolName: "send_email",
          input: { to: "dev@example.com" },
          approval: { id: "req_1" },
          toolMetadata: {
            eve: {
              kind: "tool-call",
              name: "send_email",
              inputRequest: {
                requestId: "req_1",
                kind: "tool-approval",
                prompt: "Send the email?",
                display: "confirmation",
                options: [
                  { id: "approve", label: "Approve" },
                  { id: "cancel", label: "Cancel" },
                ],
              },
            },
          },
        },
      ],
    },
  ],
};

describe("useEveAgentRuntime concurrent sends", () => {
  it("defers an approval clicked while a turn is in flight until the turn parks", async () => {
    let resolveFirstSend!: () => void;
    const send = vi.fn().mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveFirstSend = resolve;
        }),
    );
    const respond = vi.fn().mockResolvedValue(undefined);
    const agent = createAgent({ data: approvalData, send, respond });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await act(async () => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "go" }],
      });
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.thread
        .getMessageByIndex(1)
        .getMessagePartByToolCallId("call_1")
        .respondToToolApproval({ optionId: "approve" });
    });
    expect(respond).not.toHaveBeenCalled();

    await act(async () => {
      resolveFirstSend();
    });
    await waitFor(() => expect(respond).toHaveBeenCalledTimes(1));
    expect(respond).toHaveBeenCalledWith([
      { requestId: "req_1", optionId: "approve" },
    ]);
  });

  it("queues a send issued while a turn is in flight and preserves order", async () => {
    let resolveFirstSend!: () => void;
    const send = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstSend = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const agent = createAgent({ data: settledData, send });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await act(async () => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "first" }],
      });
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "second" }],
      });
    });
    expect(send).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirstSend();
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send).toHaveBeenNthCalledWith(1, "first", undefined);
    expect(send).toHaveBeenNthCalledWith(2, "second", undefined);
  });

  it("drops a queued send when the run is cancelled before it dispatches", async () => {
    let resolveFirstSend!: () => void;
    const send = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstSend = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const agent = createAgent({ data: settledData, send });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await act(async () => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "first" }],
      });
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "queued" }],
      });
    });
    act(() => {
      result.current.thread.cancelRun();
    });
    expect(agent.stop).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirstSend();
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("returns a cancelled queued send to the composer", async () => {
    let resolveFirstSend!: () => void;
    const send = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstSend = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const agent = createAgent({ data: settledData, send });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await act(async () => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "first" }],
      });
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.thread.composer.setText("queued");
      result.current.thread.composer.send();
    });
    expect(result.current.thread.composer.getState().text).toBe("");

    act(() => {
      result.current.thread.cancelRun();
    });
    await act(async () => {
      resolveFirstSend();
    });

    await waitFor(() => {
      expect(result.current.thread.composer.getState().text).toBe("queued");
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(getText(result.current)).toEqual(["earlier", "earlier answer"]);
  });

  it("returns the queued send when cancel keeps the trailing message", async () => {
    let resolveFirstSend!: () => void;
    const send = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstSend = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    // Before the turn streams, the dispatched message is the thread's trailing
    // user leaf. Eve owns that message and cannot remove it on cancel.
    const agent = createAgent({
      data: {
        messages: [
          ...settledData.messages,
          { id: "u2", role: "user", parts: [{ type: "text", text: "first" }] },
        ],
      } satisfies EveMessageData,
      status: "submitted",
      send,
    });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await act(async () => {
      result.current.thread.composer.setText("first");
      result.current.thread.composer.send();
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.thread.composer.setText("queued");
      result.current.thread.composer.send();
    });
    act(() => {
      result.current.thread.cancelRun();
    });
    expect(result.current.thread.composer.getState().text).toBe("");

    await act(async () => {
      resolveFirstSend();
    });

    await waitFor(() => {
      expect(result.current.thread.composer.getState().text).toBe("queued");
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("keeps a cancelled tool approval discarded", async () => {
    let resolveFirstSend!: () => void;
    const send = vi.fn().mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveFirstSend = resolve;
        }),
    );
    const respond = vi.fn().mockResolvedValue(undefined);
    const agent = createAgent({ data: approvalData, send, respond });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());
    const before = getText(result.current);

    await act(async () => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "go" }],
      });
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.thread
        .getMessageByIndex(1)
        .getMessagePartByToolCallId("call_1")
        .respondToToolApproval({ optionId: "approve" });
    });
    act(() => {
      result.current.thread.cancelRun();
    });
    await act(async () => {
      resolveFirstSend();
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(respond).not.toHaveBeenCalled();
    expect(result.current.thread.composer.getState().text).toBe("");
    expect(getText(result.current)).toEqual(before);
  });

  it("drops a queued send when the hook unmounts before it dispatches", async () => {
    let resolveFirstSend!: () => void;
    const send = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstSend = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const agent = createAgent({ data: settledData, send });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result, unmount } = renderHook(() => useEveAgentRuntime());

    await act(async () => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "first" }],
      });
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "queued" }],
      });
    });
    unmount();

    resolveFirstSend();
    await Promise.resolve();
    await Promise.resolve();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("forwards onFinish snapshots to the caller's onFinish", () => {
    let capturedOptions: {
      onFinish?: (snapshot: { status: string }) => void;
    } = {};
    const agent = createAgent({ data: settledData });
    mockUseEveAgent.mockImplementation((options) => {
      capturedOptions = options as typeof capturedOptions;
      return agent as never;
    });
    const onFinish = vi.fn();
    renderHook(() => useEveAgentRuntime({ onFinish }));

    capturedOptions.onFinish?.({ status: "ready" });

    expect(onFinish).toHaveBeenCalledWith({ status: "ready" });
  });

  it("orders a send issued mid-promotion after the in-flight staged draft", async () => {
    let resolveFirstSend!: () => void;
    const send = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstSend = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const agent = createAgent({ data: settledData, send });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await stageMessage(result.current, "first staged");
    await stageMessage(result.current, "second staged");

    const secondStagedId = result.current.thread.getState().messages[3]!.id;
    act(() => {
      void result.current.thread.startRun({
        parentId: secondStagedId,
        sourceId: null,
        runConfig: {},
      });
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "interleaved" }],
      });
    });
    expect(send).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirstSend();
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(3));

    expect(send.mock.calls.map(([message]) => message)).toEqual([
      "first staged",
      "interleaved",
      "second staged",
    ]);
  });
});
