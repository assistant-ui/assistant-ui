// @vitest-environment jsdom

import { act, render, renderHook, waitFor } from "@testing-library/react";
import {
  startTransition,
  Suspense,
  useLayoutEffect,
  type PropsWithChildren,
} from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockUseEveAgent } = vi.hoisted(() => ({
  mockUseEveAgent: vi.fn(),
}));

vi.mock("eve/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("eve/react")>()),
  useEveAgent: mockUseEveAgent,
}));

import type { MessageStreamEvent } from "eve/client";
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
                  kind: "question",
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
    response: { approved: boolean; reason?: string; optionId?: string },
  ) =>
    result.current.thread
      .getMessageById("a1")
      .getMessagePartByToolCallId("call_1")
      .respondToToolApproval(response);

  it("keeps an unanswered free-form request pending through the default controls", async () => {
    const rejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => rejections.push(reason);
    processEvents.on("unhandledRejection", onUnhandledRejection);
    const agent = createAgent({ data: textRequestData });
    mockUseEveAgent.mockReturnValue(agent as never);

    try {
      const { result } = renderHook(() => useEveAgentRuntime());

      await expect(
        respondToTextRequest(result, { approved: true }),
      ).rejects.toThrow(/was not answered by this response/);

      await flushMicrotasks();
      await flushMicrotasks();

      expect(agent.send).not.toHaveBeenCalled();
      expect(agent.respond).not.toHaveBeenCalled();
      expect(rejections).toEqual([]);
    } finally {
      processEvents.off("unhandledRejection", onUnhandledRejection);
    }
  });

  const bareApprovalData = (toolMetadata?: {
    eve: { kind: "tool-call"; name: string };
  }): EveMessageData => ({
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
            toolName: "delete_file",
            input: {},
            approval: { id: "req_1" },
            ...(toolMetadata && { toolMetadata }),
          },
        ],
      },
    ],
  });

  it.each([
    ["no eve tool metadata at all", undefined],
    [
      "eve metadata carrying no input request",
      { eve: { kind: "tool-call", name: "delete_file" } },
    ],
  ])(
    "still answers an ordinary approval when the part has %s",
    async (_label, toolMetadata) => {
      const agent = createAgent({
        data: bareApprovalData(toolMetadata as never),
      });
      mockUseEveAgent.mockReturnValue(agent as never);

      const { result } = renderHook(() => useEveAgentRuntime());
      expect(() =>
        respondToTextRequest(result, { approved: true }),
      ).not.toThrow();

      await flushMicrotasks();

      expect(agent.respond).toHaveBeenCalledWith([
        { requestId: "req_1", optionId: "approve" },
      ]);
    },
  );

  it("maps a refusal on a request the data does not carry", async () => {
    const agent = createAgent({ data: bareApprovalData(undefined) });
    mockUseEveAgent.mockReturnValue(agent as never);

    const { result } = renderHook(() => useEveAgentRuntime());
    respondToTextRequest(result, { approved: false, reason: "not safe" });

    await flushMicrotasks();

    expect(agent.respond).toHaveBeenCalledWith([
      { requestId: "req_1", optionId: "cancel", text: "not safe" },
    ]);
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

    expect(agent.respond).toHaveBeenCalledWith([
      { requestId: "req_1", text: "Quarterly results" },
    ]);
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

const executingToolData: EveMessageData = {
  messages: [
    { id: "u1", role: "user", parts: [{ type: "text", text: "run it" }] },
    {
      id: "a1",
      role: "assistant",
      parts: [
        {
          type: "dynamic-tool",
          state: "input-available",
          toolCallId: "call_slow",
          toolName: "slow_tool",
          input: {},
        },
      ],
    },
  ],
};

const twoExecutingToolsData: EveMessageData = {
  messages: [
    { id: "u1", role: "user", parts: [{ type: "text", text: "run them" }] },
    {
      id: "a1",
      role: "assistant",
      parts: [
        {
          type: "dynamic-tool",
          state: "input-available",
          toolCallId: "call_slow_a",
          toolName: "slow_tool",
          input: {},
        },
        {
          type: "dynamic-tool",
          state: "input-available",
          toolCallId: "call_slow_b",
          toolName: "slow_tool",
          input: {},
        },
      ],
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

describe("useEveAgentRuntime extras wiring", () => {
  it("provides error, events, and session through the runtime extras", () => {
    const error = new Error("boom");
    const events = [{ type: "session.started" }];
    const session = { sessionId: "s1" };
    mockUseEveAgent.mockReturnValue(
      createAgent({ status: "error", error, events, session }) as never,
    );

    const { result } = renderHook(() => useEveAgentRuntime());

    expect(
      eveExtras.tryGet(result.current.thread.getState().extras),
    ).toMatchObject({ error, events, session });
  });

  it("discards staged inputs when reset is invoked", async () => {
    const agent = createAgent({ data: settledData });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await stageMessage(result.current, "discarded draft");
    const discardedId = result.current.thread.getState().messages[2]!.id;

    act(() => {
      eveExtras.tryGet(result.current.thread.getState().extras)!.reset();
    });
    await waitFor(() => {
      expect(getText(result.current)).toEqual(["earlier", "earlier answer"]);
    });

    // `onReload` is only wired while staged messages exist, so a fresh draft
    // is needed to reach the staged-run lookup that reads `stagedInputsRef`.
    await stageMessage(result.current, "fresh draft");

    await expect(
      Promise.resolve(
        result.current.thread.startRun({
          parentId: discardedId,
          sourceId: null,
          runConfig: {},
        }),
      ),
    ).rejects.toThrow("Runtime does not support reloading messages.");
    expect(agent.send).not.toHaveBeenCalled();
    expect(agent.reset).toHaveBeenCalledTimes(1);
  });

  it("clears executing tool state when reset is invoked", async () => {
    const agent = createAgent({ data: settledData });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result, rerender } = renderHook(() => useEveAgentRuntime());

    act(() => {
      result.current.registerModelContextProvider({
        getModelContext: () => ({
          tools: {
            slow_tool: {
              parameters: { type: "object", properties: {} },
              execute: () => new Promise<never>(() => {}),
            },
          },
        }),
      });
    });

    // The tracker treats its first snapshot as historical, so the tool call
    // has to arrive on a later one to actually execute.
    mockUseEveAgent.mockReturnValue(
      createAgent({ data: executingToolData, reset: agent.reset }) as never,
    );
    rerender();

    await waitFor(() => {
      expect(result.current.thread.getState().isRunning).toBe(true);
    });

    act(() => {
      eveExtras.tryGet(result.current.thread.getState().extras)!.reset();
    });

    await waitFor(() => {
      expect(result.current.thread.getState().isRunning).toBe(false);
    });
    expect(agent.reset).toHaveBeenCalledTimes(1);
  });

  it("drops a send queued behind an active turn when reset is invoked", async () => {
    let releaseFirstSend: (() => void) | undefined;
    const send = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            releaseFirstSend = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const agent = createAgent({ data: settledData, send });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await stageMessage(result.current, "queued draft");
    const queuedDraftId = result.current.thread.getState().messages[2]!.id;

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "first" }],
      });
    });
    await waitFor(() => {
      expect(send).toHaveBeenCalledTimes(1);
    });

    const queuedReload = Promise.resolve(
      result.current.thread.startRun({
        parentId: queuedDraftId,
        sourceId: null,
        runConfig: {},
      }),
    );
    // Let the reload reach `enqueueSend` and park behind the active turn.
    await act(async () => {});

    act(() => {
      eveExtras.tryGet(result.current.thread.getState().extras)!.reset();
    });

    await act(async () => {
      releaseFirstSend?.();
      await queuedReload;
    });

    expect(send).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(getText(result.current)).toEqual(["earlier", "earlier answer"]);
    });
  });

  it("keeps a staged draft when a queued send is cancelled instead of reset", async () => {
    let releaseFirstSend: (() => void) | undefined;
    const send = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            releaseFirstSend = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const agent = createAgent({ data: settledData, send });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await stageMessage(result.current, "queued draft");
    const queuedDraftId = result.current.thread.getState().messages[2]!.id;

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "first" }],
      });
    });
    await waitFor(() => {
      expect(send).toHaveBeenCalledTimes(1);
    });

    const queuedReload = Promise.resolve(
      result.current.thread.startRun({
        parentId: queuedDraftId,
        sourceId: null,
        runConfig: {},
      }),
    );
    await act(async () => {});

    act(() => {
      result.current.thread.cancelRun();
    });

    await act(async () => {
      releaseFirstSend?.();
      await queuedReload;
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(agent.stop).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(getText(result.current)).toEqual([
        "earlier",
        "earlier answer",
        "queued draft",
      ]);
    });
  });

  it("aborts client tool executions when reset is invoked", async () => {
    const agentReset = vi.fn(() => {
      mockUseEveAgent.mockReturnValue(
        createAgent({ data: { messages: [] }, reset: agentReset }) as never,
      );
    });
    const agent = createAgent({ data: settledData, reset: agentReset });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result, rerender } = renderHook(() => useEveAgentRuntime());

    const abortReasons: string[] = [];
    act(() => {
      result.current.registerModelContextProvider({
        getModelContext: () => ({
          tools: {
            slow_tool: {
              parameters: { type: "object", properties: {} },
              execute: (
                _args: unknown,
                context: { toolCallId: string; abortSignal: AbortSignal },
              ) =>
                new Promise<never>(() => {
                  context.abortSignal.addEventListener("abort", () => {
                    abortReasons.push(context.toolCallId);
                  });
                }),
            },
          },
        }),
      });
    });

    mockUseEveAgent.mockReturnValue(
      createAgent({ data: twoExecutingToolsData, reset: agentReset }) as never,
    );
    rerender();

    await waitFor(() => {
      expect(result.current.thread.getState().isRunning).toBe(true);
    });

    act(() => {
      eveExtras.tryGet(result.current.thread.getState().extras)!.reset();
    });
    rerender();

    await waitFor(() => {
      expect(abortReasons.sort()).toEqual(["call_slow_a", "call_slow_b"]);
    });
    expect(result.current.thread.getState().isRunning).toBe(false);
  });

  it("rejects a pending human-input request when reset is invoked", async () => {
    const agentReset = vi.fn(() => {
      mockUseEveAgent.mockReturnValue(
        createAgent({ data: { messages: [] }, reset: agentReset }) as never,
      );
    });
    const agent = createAgent({ data: settledData, reset: agentReset });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result, rerender } = renderHook(() => useEveAgentRuntime());

    let humanRequests = 0;
    const humanRejections: unknown[] = [];
    act(() => {
      result.current.registerModelContextProvider({
        getModelContext: () => ({
          tools: {
            slow_tool: {
              parameters: { type: "object", properties: {} },
              execute: async (
                _args: unknown,
                context: { human: (payload: unknown) => Promise<unknown> },
              ) => {
                humanRequests += 1;
                try {
                  return await context.human({ request: "approve" });
                } catch (error) {
                  humanRejections.push(error);
                  throw error;
                }
              },
            },
          },
        }),
      });
    });

    mockUseEveAgent.mockReturnValue(
      createAgent({ data: twoExecutingToolsData, reset: agentReset }) as never,
    );
    rerender();

    await waitFor(() => {
      expect(humanRequests).toBe(2);
    });

    act(() => {
      eveExtras.tryGet(result.current.thread.getState().extras)!.reset();
    });
    rerender();

    await waitFor(() => {
      expect(humanRejections).toHaveLength(2);
    });
    expect((humanRejections[0] as Error).message).toBe(
      "Tool execution aborted",
    );
  });

  it("ignores tool statuses left over from a discarded session", async () => {
    const releases: Record<string, () => void> = {};
    const agentReset = vi.fn(() => {
      mockUseEveAgent.mockReturnValue(
        createAgent({ data: { messages: [] }, reset: agentReset }) as never,
      );
    });
    const agent = createAgent({ data: settledData, reset: agentReset });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result, rerender } = renderHook(() => useEveAgentRuntime());

    act(() => {
      result.current.registerModelContextProvider({
        getModelContext: () => ({
          tools: {
            slow_tool: {
              parameters: { type: "object", properties: {} },
              execute: (_args: unknown, context: { toolCallId: string }) =>
                new Promise<never>((_resolve, reject) => {
                  releases[context.toolCallId] = () =>
                    reject(new Error("aborted"));
                }),
            },
          },
        }),
      });
    });

    mockUseEveAgent.mockReturnValue(
      createAgent({
        data: twoExecutingToolsData,
        reset: agentReset,
      }) as never,
    );
    rerender();

    await waitFor(() => {
      expect(result.current.thread.getState().isRunning).toBe(true);
    });

    act(() => {
      eveExtras.tryGet(result.current.thread.getState().extras)!.reset();
    });
    rerender();

    await waitFor(() => {
      expect(result.current.thread.getState().isRunning).toBe(false);
    });

    await act(async () => {
      releases["call_slow_a"]?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.thread.getState().isRunning).toBe(false);
    });
    expect(agentReset).toHaveBeenCalledTimes(1);
  });

  it("promotes every staged draft after reset when the discarded run failed", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const agent = createAgent({ data: settledData, send });
    let capturedOptions: { onFinish?: (snapshot: unknown) => void } = {};
    mockUseEveAgent.mockImplementation((options) => {
      capturedOptions = options as typeof capturedOptions;
      return agent as never;
    });
    const { result } = renderHook(() => useEveAgentRuntime());

    act(() => {
      capturedOptions.onFinish?.({ status: "error" });
    });
    act(() => {
      eveExtras.tryGet(result.current.thread.getState().extras)!.reset();
    });

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

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenNthCalledWith(1, "first staged", undefined);
    expect(send).toHaveBeenNthCalledWith(2, "second staged", undefined);
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

describe("useEveAgentRuntime cancel binding", () => {
  it("cancels through the eve 0.38+ cancel binding when the agent provides it", async () => {
    const cancel = vi.fn().mockResolvedValue({ status: "cancelled" });
    const agent = createAgent({ status: "streaming", cancel });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await act(async () => {
      result.current.thread.cancelRun();
    });

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(agent.stop).not.toHaveBeenCalled();
  });

  it("falls back to the pre-0.38 stop binding when cancel is absent", async () => {
    const agent = createAgent({ status: "streaming" });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await act(async () => {
      result.current.thread.cancelRun();
    });

    expect(agent.stop).toHaveBeenCalledTimes(1);
  });

  it("drops a queued send when the durable cancel settles late", async () => {
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
    let resolveCancel!: () => void;
    const cancel = vi.fn(
      () =>
        new Promise<{ status: string }>((resolve) => {
          resolveCancel = () => resolve({ status: "cancelled" });
        }),
    );
    const agent = createAgent({ data: settledData, send, cancel });
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
    expect(cancel).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirstSend();
      resolveCancel();
    });
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("useEveAgentRuntime thread refetch", () => {
  const session = { sessionId: "s1" };

  const mockWorkspaceAgents = () => {
    const resumeA = vi.fn().mockResolvedValue(undefined);
    const resumeB = vi.fn().mockResolvedValue(undefined);
    const agentA = createAgent({
      data: {
        messages: [
          {
            id: "workspace-a",
            role: "user",
            parts: [{ type: "text", text: "workspace A" }],
          },
        ],
      },
      session,
      resume: resumeA,
    });
    const agentB = createAgent({
      data: {
        messages: [
          {
            id: "workspace-b",
            role: "user",
            parts: [{ type: "text", text: "workspace B" }],
          },
        ],
      },
      session,
      resume: resumeB,
    });
    mockUseEveAgent.mockImplementation((options) =>
      (options as { workspace: string }).workspace === "A"
        ? (agentA as never)
        : (agentB as never),
    );
    return { agentA, agentB, resumeA, resumeB };
  };

  it("publishes committed state before descendant layout effects", async () => {
    const { resumeA, resumeB } = mockWorkspaceAgents();

    let refetch: Promise<void> | undefined;
    let currentRuntime: ReturnType<typeof useEveAgentRuntime> | undefined;
    const RefetchOnLayout = ({
      runtime,
      enabled,
    }: {
      runtime: ReturnType<typeof useEveAgentRuntime>;
      enabled: boolean;
    }) => {
      useLayoutEffect(() => {
        if (!enabled) return;
        runtime.thread.append({
          role: "user",
          content: [{ type: "text", text: "draft from B" }],
          startRun: false,
        });
        refetch = runtime.threads.reloadMainThread();
      }, [enabled, runtime]);
      return null;
    };
    const Probe = ({
      workspace,
      refetchOnLayout,
    }: {
      workspace: string;
      refetchOnLayout: boolean;
    }) => {
      const runtime = useEveAgentRuntime({ workspace } as never);
      currentRuntime = runtime;
      return <RefetchOnLayout runtime={runtime} enabled={refetchOnLayout} />;
    };

    const view = render(<Probe workspace="A" refetchOnLayout={false} />);
    view.rerender(<Probe workspace="B" refetchOnLayout />);
    await act(async () => {
      await refetch;
    });

    expect(resumeA).not.toHaveBeenCalled();
    expect(resumeB).toHaveBeenCalledTimes(1);
    expect(getText(currentRuntime!)).toEqual(["workspace B", "draft from B"]);
    view.unmount();
  });

  it("keeps refetches scoped to the committed agent", async () => {
    const { agentB, resumeA, resumeB } = mockWorkspaceAgents();

    const pending = new Promise<never>(() => {});
    let blocked = false;
    const Blocker = () => {
      if (blocked) throw pending;
      return null;
    };
    const Wrapper = ({ children }: PropsWithChildren) => (
      <Suspense fallback={null}>
        {children}
        <Blocker />
      </Suspense>
    );

    const { result, rerender } = renderHook(
      ({ workspace }) => useEveAgentRuntime({ workspace } as never),
      {
        initialProps: { workspace: "A" },
        wrapper: Wrapper,
      },
    );

    act(() => {
      blocked = true;
      startTransition(() => rerender({ workspace: "B" }));
    });
    expect(mockUseEveAgent.mock.results.at(-1)?.value).toBe(agentB);

    await act(async () => {
      await result.current.threads.reloadMainThread();
    });

    expect(resumeB).not.toHaveBeenCalled();
    expect(resumeA).toHaveBeenCalledTimes(1);

    await stageMessage(result.current, "draft from A");
    expect(getText(result.current)).toEqual(["workspace A", "draft from A"]);
  });

  it("replays the session through eve resume when the thread is refetched", async () => {
    const resume = vi.fn().mockResolvedValue(undefined);
    const agent = createAgent({ session, resume });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());
    expect(result.current.thread.getState().capabilities.refetchThread).toBe(
      true,
    );

    await act(async () => {
      await result.current.threads.reloadMainThread();
    });

    expect(resume).toHaveBeenCalledTimes(1);
  });

  it("propagates a failed replay to the refetch caller", async () => {
    const resume = vi.fn().mockRejectedValue(new Error("replay failed"));
    const agent = createAgent({ session, resume });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await act(async () => {
      await expect(result.current.threads.reloadMainThread()).rejects.toThrow(
        "replay failed",
      );
    });
  });

  it("resolves without replaying when no session exists yet", async () => {
    const resume = vi.fn();
    const agent = createAgent({ session: undefined, resume });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await act(async () => {
      await result.current.threads.reloadMainThread();
    });

    expect(resume).not.toHaveBeenCalled();
  });

  it("waits for a turn dispatched before it to park, then replays", async () => {
    let resolveSend!: () => void;
    const send = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        }),
    );
    const resume = vi.fn().mockResolvedValue(undefined);
    const agent = createAgent({ session, resume, send });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await act(async () => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "hi" }],
      });
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    let settled = false;
    await act(async () => {
      void result.current.threads.reloadMainThread().then(() => {
        settled = true;
      });
    });
    expect(resume).not.toHaveBeenCalled();
    expect(settled).toBe(false);

    await act(async () => {
      resolveSend();
    });
    await waitFor(() => expect(settled).toBe(true));
    expect(resume).toHaveBeenCalledTimes(1);
  });

  it("reads the session at dispatch time, after the first send created it", async () => {
    let resolveSend!: () => void;
    const send = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        }),
    );
    const resume = vi.fn().mockResolvedValue(undefined);
    const agent = createAgent({ session: undefined, resume, send });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result, rerender } = renderHook(() => useEveAgentRuntime());

    await act(async () => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "hi" }],
      });
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    let settled = false;
    await act(async () => {
      void result.current.threads.reloadMainThread().then(() => {
        settled = true;
      });
    });

    mockUseEveAgent.mockReturnValue({ ...agent, session } as never);
    rerender();
    await act(async () => {
      resolveSend();
    });
    await waitFor(() => expect(settled).toBe(true));
    expect(resume).toHaveBeenCalledTimes(1);
  });

  it("still replays a queued refetch when the run it waited on is cancelled", async () => {
    let resolveSend!: () => void;
    const send = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        }),
    );
    const resume = vi.fn().mockResolvedValue(undefined);
    const cancel = vi.fn().mockResolvedValue({ status: "cancelled" });
    const agent = createAgent({ session, resume, send, cancel });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await act(async () => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "hi" }],
      });
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    let settled = false;
    await act(async () => {
      void result.current.threads.reloadMainThread().then(() => {
        settled = true;
      });
      result.current.thread.cancelRun();
    });
    await act(async () => {
      resolveSend();
    });

    await waitFor(() => expect(settled).toBe(true));
    expect(resume).toHaveBeenCalledTimes(1);
  });

  it("drops a queued refetch when the session is reset before it dispatches", async () => {
    let resolveSend!: () => void;
    const send = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        }),
    );
    const resume = vi.fn();
    const agent = createAgent({ session, resume, send });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    await act(async () => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "hi" }],
      });
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    let settled = false;
    await act(async () => {
      void result.current.threads.reloadMainThread().then(() => {
        settled = true;
      });
      eveExtras.tryGet(result.current.thread.getState().extras)!.reset();
    });
    await act(async () => {
      resolveSend();
    });

    await waitFor(() => expect(settled).toBe(true));
    expect(resume).not.toHaveBeenCalled();
  });

  it("leaves the capability absent when the installed eve has no resume", async () => {
    const agent = createAgent({ session });
    mockUseEveAgent.mockReturnValue(agent as never);
    const { result } = renderHook(() => useEveAgentRuntime());

    expect(result.current.thread.getState().capabilities.refetchThread).toBe(
      false,
    );
    await act(async () => {
      await result.current.threads.reloadMainThread();
    });
  });
});

describe("useEveAgentRuntime createdAt derivation", () => {
  const TURN = "turn_ts";
  const USER_AT = "2026-01-02T10:00:01.000Z";
  const ASSISTANT_AT = "2026-01-02T10:02:00.000Z";

  const turnEvents = [
    {
      type: "turn.started",
      data: { sequence: 1, turnId: TURN },
      meta: { at: "2026-01-02T10:00:00.000Z", id: "evt_1" },
    },
    {
      type: "message.received",
      data: { message: "hi", sequence: 2, turnId: TURN },
      meta: { at: USER_AT, id: "evt_2" },
    },
    {
      type: "step.started",
      data: { modelId: "m", sequence: 3, stepIndex: 0, turnId: TURN },
      meta: { at: ASSISTANT_AT, id: "evt_3" },
    },
  ] satisfies readonly MessageStreamEvent[];

  const turnData: EveMessageData = {
    messages: [
      {
        id: `${TURN}:user`,
        role: "user",
        metadata: { turnId: TURN },
        parts: [{ type: "text", text: "hi" }],
      },
      {
        id: `${TURN}:assistant`,
        role: "assistant",
        metadata: { turnId: TURN },
        parts: [{ type: "text", text: "hello" }],
      },
    ],
  };

  it("stamps a message with the wall clock when no event covers its turn, and keeps that stamp across renders", () => {
    const before = Date.now();
    const agent = createAgent({ data: turnData, events: [] });
    mockUseEveAgent.mockReturnValue(agent as never);

    const { result, rerender } = renderHook(() => useEveAgentRuntime());

    const stamped = result.current.thread.getState().messages[0]?.createdAt;
    expect(stamped?.getTime()).toBeGreaterThanOrEqual(before);

    mockUseEveAgent.mockReturnValue({
      ...agent,
      data: { messages: [...turnData.messages] },
    } as never);
    rerender();

    expect(result.current.thread.getState().messages[0]?.createdAt).toBe(
      stamped,
    );
  });

  it("keeps the message list identity when appended events stamp no message", () => {
    const agent = createAgent({ data: turnData, events: turnEvents });
    mockUseEveAgent.mockReturnValue(agent as never);

    const { result, rerender } = renderHook(() => useEveAgentRuntime());
    const first = result.current.thread.getState().messages;

    mockUseEveAgent.mockReturnValue({
      ...agent,
      events: [
        ...turnEvents,
        {
          type: "turn.started",
          data: { sequence: 4, turnId: "turn_next" },
          meta: { at: "2026-01-02T10:05:00.000Z", id: "evt_4" },
        },
      ],
    } as never);
    rerender();

    expect(result.current.thread.getState().messages).toBe(first);
  });
});
