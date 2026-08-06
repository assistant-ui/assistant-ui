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
