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
      expect(agent.send).toHaveBeenCalledWith({
        message: "hello",
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
      expect(agent.send).toHaveBeenCalledWith({ message: "hello" });
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
      expect(agent.send).toHaveBeenCalledWith({ message: "hello" });
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
      expect(agent.send).toHaveBeenCalledWith({
        message: "hello",
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
      expect(agent.send).toHaveBeenCalledWith({
        message: "hello",
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
      expect(agent.send).toHaveBeenCalledWith({
        message: "hello",
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
    expect(agent.send).toHaveBeenCalledWith({
      message: "hello",
    });

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
    expect(send).toHaveBeenNthCalledWith(2, { message: "first staged" });
    expect(send).toHaveBeenNthCalledWith(3, { message: "second staged" });
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
    expect(agent.send).toHaveBeenNthCalledWith(1, {
      message: "first staged",
      clientContext: { page: "/first" },
    });
    expect(agent.send).toHaveBeenNthCalledWith(2, {
      message: "second staged",
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
    expect(agent.send).toHaveBeenCalledWith({
      message: "first staged",
    });
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
    expect(send).toHaveBeenNthCalledWith(1, {
      message: "first staged",
    });

    await act(async () => {
      resolveFirstSend();
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send).toHaveBeenNthCalledWith(2, {
      message: "second staged",
    });

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
    expect(send).toHaveBeenCalledWith({ message: "first staged" });
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

describe("useEveAgentRuntime createdAt derivation", () => {
  const resumedData: EveMessageData = {
    messages: [
      {
        id: "turn-1:user",
        role: "user",
        metadata: { status: "complete", turnId: "turn-1" },
        parts: [{ type: "text", text: "hi" }],
      },
      {
        id: "turn-1:assistant",
        role: "assistant",
        metadata: { status: "complete", turnId: "turn-1" },
        parts: [{ type: "text", text: "hello", state: "done" }],
      },
    ],
  };

  it("derives createdAt from the earliest event timestamp of the message's turn", () => {
    mockUseEveAgent.mockReturnValue(
      createAgent({
        data: resumedData,
        events: [
          {
            type: "turn.started",
            data: { sequence: 0, turnId: "turn-1" },
            meta: { at: "2026-01-02T03:04:05.000Z" },
          },
          {
            type: "message.received",
            data: { message: "hi", sequence: 1, turnId: "turn-1" },
            meta: { at: "2026-01-02T03:04:06.000Z" },
          },
        ],
      }) as never,
    );

    const { result } = renderHook(() => useEveAgentRuntime());

    const messages = result.current.thread.getState().messages;
    expect(messages[0]?.createdAt).toEqual(
      new Date("2026-01-02T03:04:05.000Z"),
    );
    expect(messages[1]?.createdAt).toEqual(
      new Date("2026-01-02T03:04:05.000Z"),
    );
  });

  it("stamps a live-streamed message with the current time when no event carries its turn", () => {
    const before = Date.now();
    mockUseEveAgent.mockReturnValue(
      createAgent({ status: "streaming", events: [] }) as never,
    );

    const { result } = renderHook(() => useEveAgentRuntime());

    const createdAt = result.current.thread
      .getState()
      .messages.at(-1)?.createdAt;
    expect(createdAt).toBeInstanceOf(Date);
    expect(createdAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(createdAt!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("keeps durable timestamps untouched and bounds a runaway fallback between its durable neighbors", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-01-01T00:00:00.000Z"));
    try {
      mockUseEveAgent.mockReturnValue(
        createAgent({
          data: {
            messages: [
              {
                id: "turn-0:user",
                role: "user",
                metadata: { status: "complete", turnId: "turn-0" },
                parts: [{ type: "text", text: "first" }],
              },
              {
                id: "turn-1:user",
                role: "user",
                metadata: { status: "complete", turnId: "turn-1" },
                parts: [{ type: "text", text: "second" }],
              },
              {
                id: "turn-2:user",
                role: "user",
                metadata: { status: "complete", turnId: "turn-2" },
                parts: [{ type: "text", text: "third" }],
              },
            ],
          } satisfies EveMessageData,
          events: [
            {
              type: "message.received",
              data: { message: "second", sequence: 0, turnId: "turn-1" },
              meta: { at: "2020-01-01T00:00:00.000Z" },
            },
            {
              type: "message.received",
              data: { message: "third", sequence: 1, turnId: "turn-2" },
              meta: { at: "2025-01-01T00:00:00.000Z" },
            },
          ],
        }) as never,
      );

      const { result } = renderHook(() => useEveAgentRuntime());

      const messages = result.current.thread.getState().messages;
      expect(messages[0]!.createdAt).toEqual(
        new Date("2020-01-01T00:00:00.000Z"),
      );
      expect(messages[1]!.createdAt).toEqual(
        new Date("2020-01-01T00:00:00.000Z"),
      );
      expect(messages[2]!.createdAt).toEqual(
        new Date("2025-01-01T00:00:00.000Z"),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  // A truncated event window leaves the leading message without durable
  // evidence. Its displayed date is the tightest upper bound the thread order
  // proves — it is no newer than the next durable message — rather than the
  // wall clock, which would render resumed history as "just now" and sort it
  // after the durable message that follows it.
  it("bounds a leading fallback to the next durable timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-01-01T00:00:00.000Z"));
    try {
      mockUseEveAgent.mockReturnValue(
        createAgent({
          data: {
            messages: [
              {
                id: "turn-0:user",
                role: "user",
                metadata: { status: "complete", turnId: "turn-0" },
                parts: [{ type: "text", text: "outside the window" }],
              },
              {
                id: "turn-1:user",
                role: "user",
                metadata: { status: "complete", turnId: "turn-1" },
                parts: [{ type: "text", text: "inside the window" }],
              },
            ],
          } satisfies EveMessageData,
          events: [
            {
              type: "turn.started",
              data: { sequence: 0, turnId: "turn-1" },
              meta: { at: "2020-01-01T00:00:00.000Z" },
            },
          ],
        }) as never,
      );

      const { result } = renderHook(() => useEveAgentRuntime());

      const messages = result.current.thread.getState().messages;
      expect(messages[0]!.createdAt).toEqual(
        new Date("2020-01-01T00:00:00.000Z"),
      );
      expect(messages[1]!.createdAt).toEqual(
        new Date("2020-01-01T00:00:00.000Z"),
      );
      expect(messages[0]!.createdAt.getTime()).toBeLessThanOrEqual(
        messages[1]!.createdAt.getTime(),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("raises a fallback timestamp to the previous durable timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2010-01-01T00:00:00.000Z"));
    try {
      mockUseEveAgent.mockReturnValue(
        createAgent({
          data: {
            messages: [
              {
                id: "turn-0:user",
                role: "user",
                metadata: { status: "complete", turnId: "turn-0" },
                parts: [{ type: "text", text: "first" }],
              },
              {
                id: "turn-1:user",
                role: "user",
                metadata: { status: "complete", turnId: "turn-1" },
                parts: [{ type: "text", text: "second" }],
              },
            ],
          } satisfies EveMessageData,
          events: [
            {
              type: "message.received",
              data: { message: "first", sequence: 0, turnId: "turn-0" },
              meta: { at: "2020-01-01T00:00:00.000Z" },
            },
          ],
        }) as never,
      );

      const { result } = renderHook(() => useEveAgentRuntime());

      const messages = result.current.thread.getState().messages;
      expect(messages[0]!.createdAt).toEqual(
        new Date("2020-01-01T00:00:00.000Z"),
      );
      expect(messages[1]!.createdAt).toEqual(
        new Date("2020-01-01T00:00:00.000Z"),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("rescans from scratch when the event log is not a prefix extension of the cached one", () => {
    const sessionAEvents = Array.from({ length: 3 }, (_, i) => ({
      type: "turn.started",
      data: { sequence: i, turnId: `a-${i}` },
      meta: { at: new Date(1600000000000 + i * 1000).toISOString() },
    }));
    mockUseEveAgent.mockReturnValue(
      createAgent({
        data: {
          messages: [
            {
              id: "a-0:user",
              role: "user",
              metadata: { status: "complete", turnId: "a-0" },
              parts: [{ type: "text", text: "session a" }],
            },
          ],
        } satisfies EveMessageData,
        events: sessionAEvents,
      }) as never,
    );

    const { result, rerender } = renderHook(() => useEveAgentRuntime());
    expect(result.current.thread.getState().messages[0]!.createdAt).toEqual(
      new Date(1600000000000),
    );

    const sessionBEvents = Array.from({ length: 5 }, (_, i) => ({
      type: "turn.started",
      data: { sequence: i, turnId: `b-${i}` },
      meta: { at: new Date(1700000000000 + i * 1000).toISOString() },
    }));
    mockUseEveAgent.mockReturnValue(
      createAgent({
        data: {
          messages: [
            {
              id: "b-0:user",
              role: "user",
              metadata: { status: "complete", turnId: "b-0" },
              parts: [{ type: "text", text: "session b" }],
            },
          ],
        } satisfies EveMessageData,
        events: sessionBEvents,
      }) as never,
    );
    rerender();

    expect(result.current.thread.getState().messages[0]!.createdAt).toEqual(
      new Date(1700000000000),
    );
  });

  it("keeps a durable timestamp for a message the replaced event log no longer covers", () => {
    const messages = [
      {
        id: "turn-1:user",
        role: "user" as const,
        metadata: { status: "complete" as const, turnId: "turn-1" },
        parts: [{ type: "text" as const, text: "old" }],
      },
    ];
    mockUseEveAgent.mockReturnValue(
      createAgent({
        data: { messages } satisfies EveMessageData,
        events: [
          {
            type: "turn.started",
            data: { sequence: 0, turnId: "turn-1" },
            meta: { at: "2020-01-01T00:00:00.000Z" },
          },
        ],
      }) as never,
    );

    const { result, rerender } = renderHook(() => useEveAgentRuntime());
    expect(result.current.thread.getState().messages[0]!.createdAt).toEqual(
      new Date("2020-01-01T00:00:00.000Z"),
    );

    // The log is replaced by a window that no longer reaches turn-1, while the
    // message stays in the thread.
    mockUseEveAgent.mockReturnValue(
      createAgent({
        data: { messages: [...messages] } satisfies EveMessageData,
        events: [
          {
            type: "turn.started",
            data: { sequence: 9, turnId: "turn-9" },
            meta: { at: "2026-01-01T00:00:00.000Z" },
          },
        ],
      }) as never,
    );
    rerender();

    expect(result.current.thread.getState().messages[0]!.createdAt).toEqual(
      new Date("2020-01-01T00:00:00.000Z"),
    );
  });

  it("re-derives timestamps only for newly appended events", () => {
    const counter = { reads: 0 };
    const makeEvent = (sequence: number) =>
      new Proxy(
        {
          type: "turn.started",
          data: { sequence, turnId: `turn-${sequence}` },
          meta: { at: new Date(1700000000000 + sequence * 1000).toISOString() },
        },
        {
          get(target, prop, receiver) {
            if (prop === "meta") counter.reads++;
            return Reflect.get(target, prop, receiver);
          },
        },
      );

    const initialEvents = Array.from({ length: 50 }, (_, i) => makeEvent(i));
    mockUseEveAgent.mockReturnValue(
      createAgent({ data: resumedData, events: initialEvents }) as never,
    );

    const { rerender } = renderHook(() => useEveAgentRuntime());
    expect(counter.reads).toBeGreaterThanOrEqual(50);

    counter.reads = 0;
    mockUseEveAgent.mockReturnValue(
      createAgent({
        data: resumedData,
        events: [...initialEvents, makeEvent(50)],
      }) as never,
    );
    rerender();

    expect(counter.reads).toBe(1);
  });

  it("keeps the message list identity when new events carry no new turn", () => {
    const events = [
      {
        type: "turn.started",
        data: { sequence: 0, turnId: "turn-1" },
        meta: { at: "2020-01-01T00:00:00.000Z" },
      },
    ];
    mockUseEveAgent.mockReturnValue(
      createAgent({ data: resumedData, events }) as never,
    );

    const { result, rerender } = renderHook(() => useEveAgentRuntime());
    const before = result.current.thread.getState().messages;

    mockUseEveAgent.mockReturnValue(
      createAgent({
        data: resumedData,
        events: [
          ...events,
          {
            type: "message.appended",
            data: { messageSoFar: "hel", sequence: 1, turnId: "turn-1" },
            meta: { at: "2020-01-01T00:00:01.000Z" },
          },
        ],
      }) as never,
    );
    rerender();

    expect(result.current.thread.getState().messages).toBe(before);
  });

  // The case a boundary-only prefix check would miss: the shared tail element
  // still matches the cached scan, so only comparing the whole prefix reveals
  // that an earlier event was replaced and its timestamp must be re-derived.
  it("rescans when an earlier event is replaced but a later one is shared", () => {
    const shared = {
      type: "turn.started",
      data: { sequence: 1, turnId: "turn-shared" },
      meta: { at: "2020-06-01T00:00:00.000Z" },
    };
    const first = {
      type: "turn.started",
      data: { sequence: 0, turnId: "turn-1" },
      meta: { at: "2020-01-01T00:00:00.000Z" },
    };
    mockUseEveAgent.mockReturnValue(
      createAgent({ data: resumedData, events: [first, shared] }) as never,
    );

    const { result, rerender } = renderHook(() => useEveAgentRuntime());
    expect(result.current.thread.getState().messages[0]!.createdAt).toEqual(
      new Date("2020-01-01T00:00:00.000Z"),
    );

    mockUseEveAgent.mockReturnValue(
      createAgent({
        data: { ...resumedData },
        events: [
          { ...first, meta: { at: "2021-01-01T00:00:00.000Z" } },
          shared,
          {
            type: "turn.started",
            data: { sequence: 2, turnId: "turn-2" },
            meta: { at: "2022-01-01T00:00:00.000Z" },
          },
        ],
      }) as never,
    );
    rerender();

    expect(result.current.thread.getState().messages[0]!.createdAt).toEqual(
      new Date("2021-01-01T00:00:00.000Z"),
    );
  });

  it("falls back to first-observation time when events carry no meta.at", () => {
    const before = Date.now();
    mockUseEveAgent.mockReturnValue(
      createAgent({
        data: resumedData,
        events: [
          { type: "turn.started", data: { sequence: 0, turnId: "turn-1" } },
        ],
      }) as never,
    );

    const { result } = renderHook(() => useEveAgentRuntime());

    const createdAt = result.current.thread.getState().messages[0]?.createdAt;
    expect(createdAt).toBeInstanceOf(Date);
    expect(createdAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(createdAt!.getTime()).toBeLessThanOrEqual(Date.now());
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
                prompt: "Send the email?",
                display: "confirmation",
                options: [
                  { id: "approve", label: "Approve" },
                  { id: "deny", label: "Deny" },
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
    const send = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstSend = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const agent = createAgent({ data: approvalData, send });
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
    expect(send).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirstSend();
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send).toHaveBeenNthCalledWith(2, {
      inputResponses: [{ requestId: "req_1", optionId: "approve" }],
    });
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
    expect(send).toHaveBeenNthCalledWith(1, { message: "first" });
    expect(send).toHaveBeenNthCalledWith(2, { message: "second" });
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
    const send = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstSend = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const agent = createAgent({ data: approvalData, send });
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

    expect(send.mock.calls.map(([payload]) => payload)).toEqual([
      { message: "first staged" },
      { message: "interleaved" },
      { message: "second staged" },
    ]);
  });
});
