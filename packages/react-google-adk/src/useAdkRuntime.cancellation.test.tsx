// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { type FC } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { useAdkRuntime } from "./useAdkRuntime";
import { useAdkLongRunningToolIds, useAdkSend } from "./hooks";
import { AdkEventAccumulator } from "./AdkEventAccumulator";
import { settleOutsideAct } from "./tests/settleOutsideAct";
import type {
  AdkEvent,
  AdkMessage,
  AdkStreamCallback,
  AdkThreadSnapshot,
} from "./types";

const makeThreadListAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [
      {
        status: "regular" as const,
        remoteId: "adk-1",
        externalId: "adk-1",
        title: "ADK session",
      },
    ],
  })),
  initialize: vi.fn(async () => ({
    remoteId: "adk-1",
    externalId: "adk-1",
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream() as never),
  fetch: vi.fn(async () => ({
    status: "regular" as const,
    remoteId: "adk-1",
    externalId: "adk-1",
    title: "ADK session",
  })),
});

const makePendingStream = (...events: AdkEvent[]): AdkStreamCallback =>
  async function* (_messages, { abortSignal }) {
    yield* events;
    await new Promise<void>((resolve) => {
      abortSignal.addEventListener("abort", () => resolve(), { once: true });
    });
  };

const renderAdkRuntime = async (
  stream: AdkStreamCallback,
  snapshot?: AdkThreadSnapshot,
) => {
  const capture: {
    runtime: AssistantRuntime | null;
    longRunningToolIds: string[];
    send: ReturnType<typeof useAdkSend> | null;
  } = { runtime: null, longRunningToolIds: [], send: null };
  const sessionAdapter = makeThreadListAdapter();

  const CaptureExtras: FC = () => {
    capture.longRunningToolIds = useAdkLongRunningToolIds();
    capture.send = useAdkSend();
    return null;
  };

  const Inner: FC = () => {
    const runtime = useAdkRuntime({
      stream,
      sessionAdapter,
      unstable_allowCancellation: true,
      ...(snapshot && { load: async () => snapshot }),
    });
    capture.runtime = runtime;
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <CaptureExtras />
      </AssistantRuntimeProvider>
    );
  };

  await act(async () => {
    render(<Inner />);
  });
  await waitFor(() => expect(capture.runtime).not.toBeNull());
  await settleOutsideAct(() =>
    capture.runtime!.threads.switchToThread("adk-1"),
  );

  return capture;
};

describe("useAdkRuntime cancellation", () => {
  it.each(["none", "send", "stream"] as const)(
    "preserves inherited confirmation IDs on Stop (answer: %s)",
    async (answer) => {
      const seed = new AdkEventAccumulator();
      seed.processEvent({
        id: "older-confirmations",
        author: "agent",
        longRunningToolIds: ["old-1", "old-2"],
        content: {
          role: "model",
          parts: ["old-1", "old-2"].map((id) => ({
            functionCall: {
              id,
              name: "adk_request_confirmation",
              args: {
                originalFunctionCall: {
                  id: `target-${id}`,
                  name: "lookup",
                  args: {},
                },
                toolConfirmation: { hint: "Allow lookup?" },
              },
            },
          })),
        },
      });
      const stream = vi.fn(
        makePendingStream(
          ...(answer === "stream"
            ? [
                {
                  id: "settled-confirmation",
                  author: "user",
                  content: {
                    role: "user",
                    parts: [
                      {
                        functionResponse: {
                          id: "old-1",
                          name: "adk_request_confirmation",
                          response: { confirmed: true },
                        },
                      },
                    ],
                  },
                } satisfies AdkEvent,
              ]
            : []),
          {
            id: "new-tool-call",
            author: "agent",
            longRunningToolIds: ["new-call"],
            content: {
              role: "model",
              parts: [
                {
                  functionCall: {
                    id: "new-call",
                    name: "lookup",
                    args: {},
                  },
                },
              ],
            },
          },
        ),
      );
      const capture = await renderAdkRuntime(stream, {
        messages: seed.getMessages(),
        longRunningToolIds: seed.getLongRunningToolIds(),
        toolConfirmations: seed.getToolConfirmations(),
      });
      await waitFor(() =>
        expect(capture.longRunningToolIds).toEqual(["old-1", "old-2"]),
      );

      act(() => {
        if (answer === "send") {
          void capture.send!(
            [
              {
                id: "approval-reply",
                type: "tool",
                tool_call_id: "old-1",
                name: "adk_request_confirmation",
                content: '{"confirmed":true}',
              },
            ],
            {},
          );
        } else {
          capture.runtime!.thread.append({
            role: "user",
            content: [{ type: "text", text: "continue" }],
          });
        }
      });
      const pendingInherited =
        answer === "none" ? ["old-1", "old-2"] : ["old-2"];
      await waitFor(() =>
        expect(capture.longRunningToolIds).toEqual([
          ...pendingInherited,
          "new-call",
        ]),
      );

      act(() => {
        capture.runtime!.thread.cancelRun();
      });
      await waitFor(() =>
        expect(capture.runtime!.thread.getState().isRunning).toBe(false),
      );
      expect(capture.longRunningToolIds).toEqual(pendingInherited);

      act(() => {
        capture.runtime!.thread.append({
          role: "user",
          content: [{ type: "text", text: "next turn" }],
        });
      });
      await waitFor(() => expect(stream).toHaveBeenCalledTimes(2));
      const cancellations = stream.mock.calls[1]![0].filter(
        (m) => m.type === "tool",
      );
      expect(cancellations).toMatchObject([
        { tool_call_id: "new-call", content: '{"cancelled":true}' },
      ]);
    },
  );

  it("preserves a user message staged during a cancelled run", async () => {
    const capture = await renderAdkRuntime(
      makePendingStream({
        id: "partial",
        author: "agent",
        partial: true,
        content: { role: "model", parts: [{ text: "partial answer" }] },
      }),
    );

    act(() => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
      });
    });
    await waitFor(() =>
      expect(capture.runtime!.thread.getState().messages.at(-1)).toMatchObject({
        role: "assistant",
        content: [{ type: "text", text: "partial answer" }],
      }),
    );
    act(() => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "staged follow-up" }],
        startRun: false,
      });
    });
    await waitFor(() =>
      expect(
        capture
          .runtime!.thread.getState()
          .messages.filter((m) => m.role === "user")
          .at(-1),
      ).toMatchObject({
        content: [{ type: "text", text: "staged follow-up" }],
      }),
    );
    const stagedMessage = capture
      .runtime!.thread.getState()
      .messages.filter((m) => m.role === "user")
      .at(-1);
    expect(capture.runtime!.thread.getState().isRunning).toBe(true);

    act(() => {
      capture.runtime!.thread.cancelRun();
    });
    await waitFor(() =>
      expect(capture.runtime!.thread.getState().isRunning).toBe(false),
    );
    expect(
      capture
        .runtime!.thread.getState()
        .messages.find((m) => m.id === stagedMessage!.id),
    ).toEqual(stagedMessage);
    expect(
      capture
        .runtime!.thread.getState()
        .messages.find((m) => m.role === "assistant")?.status,
    ).toEqual({ type: "incomplete", reason: "cancelled" });
  });

  it("removes a queued HITL reply when its producing run is cancelled", async () => {
    const stream = vi.fn(
      makePendingStream({
        id: "hitl-request",
        author: "agent",
        longRunningToolIds: ["input-call"],
        content: {
          role: "model",
          parts: [
            {
              functionCall: {
                id: "input-call",
                name: "adk_request_input",
                args: { prompt: "City?" },
              },
            },
          ],
        },
        turnComplete: true,
      }),
    );
    const capture = await renderAdkRuntime(stream);
    act(() => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "What city?" }],
      });
    });
    const getInputCall = () =>
      capture
        .runtime!.thread.getState()
        .messages.flatMap((message) =>
          Array.isArray(message.content) ? message.content : [],
        )
        .find(
          (part) =>
            part.type === "tool-call" && part.toolCallId === "input-call",
        );
    await waitFor(() =>
      expect(getInputCall()).toMatchObject({ toolCallId: "input-call" }),
    );
    expect(stream).toHaveBeenCalledOnce();

    let reply!: Promise<void>;
    act(() => {
      reply = capture.send!(
        [
          {
            id: "input-reply",
            type: "tool",
            name: "adk_request_input",
            tool_call_id: "input-call",
            content: JSON.stringify({ result: "Paris" }),
          },
        ],
        {},
      );
    });
    await waitFor(() =>
      expect(getInputCall()).toMatchObject({ result: '{"result":"Paris"}' }),
    );

    act(() => {
      capture.runtime!.thread.cancelRun();
    });
    await act(async () => {
      await reply;
    });
    await waitFor(() =>
      expect(capture.runtime!.thread.getState().isRunning).toBe(false),
    );

    expect(stream).toHaveBeenCalledOnce();
    expect(getInputCall()?.result).toBeUndefined();
  });

  it("removes an in-flight HITL reply when its response run is cancelled", async () => {
    const stream = vi.fn(async function* (
      _messages: AdkMessage[],
      { abortSignal }: Parameters<AdkStreamCallback>[1],
    ) {
      if (stream.mock.calls.length === 1) {
        yield {
          id: "hitl-request",
          author: "agent",
          longRunningToolIds: ["input-call"],
          content: {
            role: "model",
            parts: [
              {
                functionCall: {
                  id: "input-call",
                  name: "adk_request_input",
                  args: { prompt: "City?" },
                },
              },
            ],
          },
          turnComplete: true,
        } satisfies AdkEvent;
        return;
      }
      await new Promise<void>((resolve) => {
        abortSignal.addEventListener("abort", () => resolve(), {
          once: true,
        });
      });
    });
    const capture = await renderAdkRuntime(stream);
    act(() => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "What city?" }],
      });
    });
    await waitFor(() =>
      expect(capture.longRunningToolIds).toEqual(["input-call"]),
    );
    await waitFor(() =>
      expect(capture.runtime!.thread.getState().isRunning).toBe(false),
    );

    let reply!: Promise<void>;
    act(() => {
      reply = capture.send!(
        [
          {
            id: "input-reply",
            type: "tool",
            name: "adk_request_input",
            tool_call_id: "input-call",
            content: JSON.stringify({ result: "Paris" }),
          },
        ],
        {},
      );
    });
    await waitFor(() => expect(stream).toHaveBeenCalledTimes(2));
    const getInputCall = () =>
      capture
        .runtime!.thread.getState()
        .messages.flatMap((message) =>
          Array.isArray(message.content) ? message.content : [],
        )
        .find(
          (part) =>
            part.type === "tool-call" && part.toolCallId === "input-call",
        );
    await waitFor(() =>
      expect(getInputCall()).toMatchObject({ result: '{"result":"Paris"}' }),
    );

    act(() => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "staged follow-up" }],
        startRun: false,
      });
    });
    act(() => {
      capture.runtime!.thread.cancelRun();
    });
    await act(async () => {
      await reply;
    });
    await waitFor(() =>
      expect(capture.runtime!.thread.getState().isRunning).toBe(false),
    );

    expect(stream).toHaveBeenCalledTimes(2);
    expect(getInputCall()?.result).toBeUndefined();
    expect(
      JSON.stringify(capture.runtime!.thread.getState().messages),
    ).toContain("staged follow-up");
  });

  it("keeps a client tool result behind a same-run HITL reply", async () => {
    let releaseProducer!: () => void;
    const producerGate = new Promise<void>((resolve) => {
      releaseProducer = resolve;
    });
    let releaseReply!: () => void;
    const replyGate = new Promise<void>((resolve) => {
      releaseReply = resolve;
    });
    const stream = vi.fn(async function* (
      _messages: AdkMessage[],
      _config: Parameters<AdkStreamCallback>[1],
    ) {
      if (stream.mock.calls.length === 1) {
        yield {
          id: "hitl-request",
          author: "agent",
          longRunningToolIds: ["input-call", "client-call"],
          content: {
            role: "model",
            parts: [
              {
                functionCall: {
                  id: "input-call",
                  name: "adk_request_input",
                  args: { prompt: "City?" },
                },
              },
              {
                functionCall: {
                  id: "client-call",
                  name: "client_tool",
                  args: {},
                },
              },
            ],
          },
          turnComplete: true,
        } satisfies AdkEvent;
        await producerGate;
        return;
      }
      if (stream.mock.calls.length === 2) await replyGate;
      yield {
        id: `response-${stream.mock.calls.length}`,
        author: "agent",
        content: { role: "model", parts: [{ text: "Done" }] },
        turnComplete: true,
      } satisfies AdkEvent;
    });
    const capture = await renderAdkRuntime(stream);
    act(() => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "What city?" }],
      });
    });
    await waitFor(() =>
      expect(capture.longRunningToolIds).toEqual(["input-call", "client-call"]),
    );
    expect(capture.runtime!.thread.getState().isRunning).toBe(true);

    let reply!: Promise<void>;
    act(() => {
      reply = capture.send!(
        [
          {
            id: "input-reply",
            type: "tool",
            name: "adk_request_input",
            tool_call_id: "input-call",
            content: JSON.stringify({ result: "Paris" }),
          },
        ],
        {},
      );
    });
    let toolResult!: Promise<void>;
    act(() => {
      toolResult = capture.send!(
        [
          {
            id: "client-result",
            type: "tool",
            name: "client_tool",
            tool_call_id: "client-call",
            content: JSON.stringify({ ok: true }),
          },
        ],
        {},
      );
    });
    expect(stream).toHaveBeenCalledOnce();

    releaseProducer();
    await waitFor(() => expect(stream).toHaveBeenCalledTimes(2));
    releaseReply();
    await act(async () => {
      await Promise.all([reply, toolResult]);
    });
    await waitFor(() => expect(stream).toHaveBeenCalledTimes(3));

    expect(stream).toHaveBeenCalledTimes(3);
    expect(stream.mock.calls[2]![0]).toMatchObject([
      { type: "tool", tool_call_id: "client-call" },
    ]);
  });

  it("drops a queued HITL reply when a new user turn supersedes its run", async () => {
    let secondRunMessages: AdkMessage[] | undefined;
    const stream = vi.fn(async function* (
      messages: AdkMessage[],
      { abortSignal }: Parameters<AdkStreamCallback>[1],
    ) {
      if (stream.mock.calls.length === 1) {
        yield {
          id: "hitl-request",
          author: "agent",
          longRunningToolIds: ["input-call"],
          content: {
            role: "model",
            parts: [
              {
                functionCall: {
                  id: "input-call",
                  name: "adk_request_input",
                  args: { prompt: "City?" },
                },
              },
            ],
          },
          turnComplete: true,
        } satisfies AdkEvent;
        await new Promise<void>((resolve) => {
          abortSignal.addEventListener("abort", () => resolve(), {
            once: true,
          });
        });
        return;
      }
      secondRunMessages = messages;
      yield {
        id: "new-turn-response",
        author: "agent",
        content: { role: "model", parts: [{ text: "New turn" }] },
        turnComplete: true,
      } satisfies AdkEvent;
    });
    const capture = await renderAdkRuntime(stream);
    act(() => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "What city?" }],
      });
    });
    await waitFor(() => expect(stream).toHaveBeenCalledOnce());

    let reply!: Promise<void>;
    act(() => {
      reply = capture.send!(
        [
          {
            id: "input-reply",
            type: "tool",
            name: "adk_request_input",
            tool_call_id: "input-call",
            content: JSON.stringify({ result: "Paris" }),
          },
        ],
        {},
      );
    });
    act(() => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "Use another city" }],
      });
    });
    await act(async () => {
      await reply;
    });
    await waitFor(() => expect(stream).toHaveBeenCalledTimes(2));

    expect(secondRunMessages?.some((message) => message.type === "tool")).toBe(
      false,
    );
  });

  it.each([false, true])(
    "cancels a finalized tool-call message (long-running: %s)",
    async (longRunning) => {
      const stream = vi.fn(
        makePendingStream({
          id: "tool-call",
          author: "agent",
          ...(longRunning && { longRunningToolIds: ["call-1"] }),
          content: {
            role: "model",
            parts: [
              { functionCall: { id: "call-1", name: "lookup", args: {} } },
            ],
          },
        }),
      );
      const capture = await renderAdkRuntime(stream);

      act(() => {
        capture.runtime!.thread.append({
          role: "user",
          content: [{ type: "text", text: "hello" }],
        });
      });
      await waitFor(() =>
        expect(
          capture.runtime!.thread.getState().messages.at(-1),
        ).toMatchObject({
          role: "assistant",
          content: [{ type: "tool-call", toolCallId: "call-1" }],
        }),
      );

      expect(capture.longRunningToolIds).toEqual(longRunning ? ["call-1"] : []);

      act(() => {
        capture.runtime!.thread.cancelRun();
      });
      await waitFor(() =>
        expect(capture.runtime!.thread.getState().isRunning).toBe(false),
      );

      expect(
        capture.runtime!.thread.getState().messages.at(-1)?.status,
      ).toEqual({
        type: "incomplete",
        reason: "cancelled",
      });
      expect(capture.longRunningToolIds).toEqual([]);

      act(() => {
        capture.runtime!.thread.append({
          role: "user",
          content: [{ type: "text", text: "next turn" }],
        });
      });
      await waitFor(() => expect(stream).toHaveBeenCalledTimes(2));
      expect(stream.mock.calls[1]![0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "tool",
            tool_call_id: "call-1",
            content: '{"cancelled":true}',
          }),
        ]),
      );
    },
  );

  it("cancels the assistant message when the last event is a tool response", async () => {
    const capture = await renderAdkRuntime(
      makePendingStream(
        {
          id: "tool-call",
          author: "agent",
          content: {
            role: "model",
            parts: [
              { functionCall: { id: "call-1", name: "lookup", args: {} } },
            ],
          },
        },
        {
          id: "tool-response",
          author: "agent",
          content: {
            role: "user",
            parts: [
              {
                functionResponse: {
                  id: "call-1",
                  name: "lookup",
                  response: { result: "found" },
                },
              },
            ],
          },
        },
      ),
    );

    act(() => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
      });
    });
    await waitFor(() =>
      expect(capture.runtime!.thread.getState().messages.at(-1)).toMatchObject({
        role: "assistant",
        content: [{ type: "tool-call", result: '{"result":"found"}' }],
      }),
    );

    act(() => {
      capture.runtime!.thread.cancelRun();
    });
    await waitFor(() =>
      expect(capture.runtime!.thread.getState().isRunning).toBe(false),
    );
    expect(capture.runtime!.thread.getState().messages.at(-1)?.status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("keeps an earlier assistant message unchanged when stopped before new output", async () => {
    let sends = 0;
    const capture = await renderAdkRuntime(async function* (messages, config) {
      if (sends++ === 0) {
        yield {
          id: "earlier-tool-call",
          author: "agent",
          content: {
            role: "model",
            parts: [
              { functionCall: { id: "call-1", name: "lookup", args: {} } },
            ],
          },
        };
      } else {
        yield* await makePendingStream()(messages, config);
      }
    });

    act(() => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "first" }],
      });
    });
    await waitFor(() => {
      expect(sends).toBe(1);
      expect(capture.runtime!.thread.getState().isRunning).toBe(false);
    });
    act(() => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "second" }],
      });
    });
    await waitFor(() => expect(sends).toBe(2));
    const earlierMessage = capture
      .runtime!.thread.getState()
      .messages.find((m) => m.role === "assistant");
    expect(earlierMessage).toBeDefined();

    act(() => {
      capture.runtime!.thread.cancelRun();
    });
    await waitFor(() =>
      expect(capture.runtime!.thread.getState().isRunning).toBe(false),
    );
    expect(
      capture
        .runtime!.thread.getState()
        .messages.find((m) => m.id === earlierMessage!.id),
    ).toEqual(earlierMessage);
  });

  it("marks a partial assistant message as cancelled when Stop is pressed", async () => {
    const capture = await renderAdkRuntime(
      makePendingStream({
        id: "partial",
        invocationId: "run-1",
        author: "agent",
        partial: true,
        content: { role: "model", parts: [{ text: "partial answer" }] },
      }),
    );

    act(() => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
      });
    });
    await waitFor(() =>
      expect(capture.runtime!.thread.getState().messages.at(-1)).toMatchObject({
        role: "assistant",
        content: [{ type: "text", text: "partial answer" }],
      }),
    );

    act(() => {
      capture.runtime!.thread.cancelRun();
    });
    await waitFor(() =>
      expect(capture.runtime!.thread.getState().isRunning).toBe(false),
    );

    expect(capture.runtime!.thread.getState().messages.at(-1)?.status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("keeps a completed assistant message complete when Stop is pressed", async () => {
    const capture = await renderAdkRuntime(
      makePendingStream({
        id: "complete",
        invocationId: "run-1",
        author: "agent",
        content: { role: "model", parts: [{ text: "final answer" }] },
      }),
    );

    act(() => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
      });
    });
    await waitFor(() =>
      expect(
        capture.runtime!.thread.getState().messages.at(-1)?.status,
      ).toEqual({
        type: "complete",
        reason: "stop",
      }),
    );
    expect(capture.runtime!.thread.getState().isRunning).toBe(true);

    act(() => {
      capture.runtime!.thread.cancelRun();
    });
    await waitFor(() =>
      expect(capture.runtime!.thread.getState().isRunning).toBe(false),
    );

    expect(capture.runtime!.thread.getState().messages.at(-1)?.status).toEqual({
      type: "complete",
      reason: "stop",
    });
  });
});
