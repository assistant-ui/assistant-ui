/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  initialize: vi.fn(async () => ({
    remoteId: "thread-1",
    externalId: undefined,
  })),
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal()),
  useAui: () => ({ threadListItem: { initialize: mocks.initialize } }),
}));

import {
  messageToEvent,
  messagesToEvents,
  useAdkMessages,
  useAdkMessagesInternal,
} from "./useAdkMessages";
import { projectAdkToolApprovals } from "./adkToolApproval";
import { createAdkStream } from "./AdkClient";
import { AdkEventAccumulator } from "./AdkEventAccumulator";
import { getPendingCancellations } from "./convertToAdkMessages";
import type { AdkEvent, AdkMessage, AdkStreamCallback } from "./types";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("optimistic tool outcomes", () => {
  it.each([false, true])(
    "preserves failures alongside successful results (batch: %s)",
    (batch) => {
      const failed: AdkMessage = {
        id: "failed",
        type: "tool",
        name: "search",
        tool_call_id: "tc-error",
        content: "denied",
        status: "error",
      };
      const succeeded: AdkMessage = {
        id: "succeeded",
        type: "tool",
        name: "search",
        tool_call_id: "tc-ok",
        content: "found",
        status: "success",
      };
      const events = batch
        ? messagesToEvents([
            failed,
            succeeded,
            { id: "human", type: "human", content: "continue" },
          ])
        : [messageToEvent(failed), messageToEvent(succeeded)];
      const acc = new AdkEventAccumulator();
      for (const event of events) acc.processEvent(event);
      expect(
        acc.getMessages().filter((message) => message.type === "tool"),
      ).toMatchObject([
        {
          tool_call_id: "tc-error",
          status: "error",
          content: JSON.stringify({ error: "denied" }),
        },
        {
          tool_call_id: "tc-ok",
          status: "success",
          content: JSON.stringify({ result: "found" }),
        },
      ]);
    },
  );
});

describe("ADK runtime callbacks", () => {
  it("reports the same agent transfer again in a later run", async () => {
    const onAgentTransfer = vi.fn();
    const stream: AdkStreamCallback = async function* () {
      yield {
        id: "transfer",
        actions: { transferToAgent: "researcher" },
      };
      yield {
        id: "transfer-duplicate",
        actions: { transferToAgent: "researcher" },
      };
    };
    const { result } = renderHook(() =>
      useAdkMessages({ stream, eventHandlers: { onAgentTransfer } }),
    );

    await act(async () => {
      await result.current.sendMessage(
        [{ id: "user-1", type: "human", content: "first" }],
        {},
      );
      expect(onAgentTransfer).toHaveBeenCalledTimes(1);

      await result.current.sendMessage(
        [{ id: "user-2", type: "human", content: "second" }],
        {},
      );
    });

    expect(onAgentTransfer).toHaveBeenCalledTimes(2);
    expect(onAgentTransfer).toHaveBeenNthCalledWith(1, "researcher");
    expect(onAgentTransfer).toHaveBeenNthCalledWith(2, "researcher");
  });

  it.each(["onAgentTransfer", "onCustomEvent", "onError"] as const)(
    "continues streaming when %s throws",
    async (callbackName) => {
      const callbackError = new Error("telemetry failed");
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const callback = vi.fn(() => {
        throw callbackError;
      });
      const eventByCallback: Record<typeof callbackName, AdkEvent> = {
        onAgentTransfer: {
          id: "transfer",
          actions: { transferToAgent: "researcher" },
        },
        onCustomEvent: {
          id: "custom",
          customMetadata: { progress: 1 },
        },
        onError: {
          id: "error",
          author: "agent",
          errorMessage: "recoverable error",
        },
      };
      const stream: AdkStreamCallback = async function* () {
        yield eventByCallback[callbackName];
        yield {
          id: "answer",
          author: "agent",
          content: { role: "model", parts: [{ text: "done" }] },
        };
      };
      const eventHandlers = {
        [callbackName]: callback,
      };
      const { result } = renderHook(() =>
        useAdkMessages({ stream, eventHandlers }),
      );

      await act(async () => {
        await result.current.sendMessage(
          [{ id: "user", type: "human", content: "hello" }],
          {},
        );
      });

      expect(result.current.messages.at(-1)).toMatchObject({
        type: "ai",
        content: [{ type: "text", text: "done" }],
      });
      expect(consoleError).toHaveBeenCalledWith(
        `[react-google-adk] ${callbackName} callback threw an error`,
        callbackError,
      );
    },
  );

  it("continues streaming when onCustomEvent rejects", async () => {
    const callbackError = new Error("async telemetry failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const stream: AdkStreamCallback = async function* () {
      yield { id: "custom", customMetadata: { progress: 1 } };
      yield {
        id: "answer",
        author: "agent",
        content: { role: "model", parts: [{ text: "done" }] },
      };
    };
    const { result } = renderHook(() =>
      useAdkMessages({
        stream,
        eventHandlers: {
          onCustomEvent: () => Promise.reject(callbackError),
        },
      }),
    );

    await act(async () => {
      await result.current.sendMessage(
        [{ id: "user", type: "human", content: "hello" }],
        {},
      );
    });

    expect(result.current.messages.at(-1)).toMatchObject({
      type: "ai",
      content: [{ type: "text", text: "done" }],
    });
    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        "[react-google-adk] onCustomEvent callback threw an error",
        callbackError,
      );
    });
  });
});

describe("ADK stream lifecycle", () => {
  it("attributes streamed tool calls to the run config that produced them", async () => {
    const runConfig = { custom: { model: "model-a" } };
    const stream: AdkStreamCallback = async function* () {
      yield {
        id: "event-1",
        author: "agent",
        content: {
          role: "model",
          parts: [
            { functionCall: { id: "tool-1", name: "lookup", args: {} } },
            { functionCall: { id: "tool-2", name: "search", args: {} } },
          ],
        },
      };
    };
    const { result } = renderHook(() => useAdkMessagesInternal({ stream }));

    await act(async () => {
      await result.current.sendMessage(
        [{ id: "user-1", type: "human", content: "look it up" }],
        { runConfig },
      );
    });

    expect(result.current.messages).toContainEqual(
      expect.objectContaining({
        type: "ai",
        tool_calls: [
          expect.objectContaining({ id: "tool-1" }),
          expect.objectContaining({ id: "tool-2" }),
        ],
      }),
    );
    const { runConfigByToolCallId } = result.current.controller.getState();
    expect(runConfigByToolCallId.get("tool-1")).toBe(runConfig);
    expect(runConfigByToolCallId.get("tool-2")).toBe(runConfig);
  });

  it("marks a run failed only when one of its events carries an error or an error finish reason", async () => {
    let call = 0;
    const stream: AdkStreamCallback = async function* () {
      call++;
      if (call === 1) {
        yield {
          id: "event-error",
          author: "agent",
          errorCode: "MODEL_ERROR",
          errorMessage: "boom",
        };
        return;
      }
      if (call === 4) {
        yield {
          id: "event-snake",
          author: "agent",
          finish_reason: "UNEXPECTED_TOOL_CALL",
        } as AdkEvent;
        return;
      }
      if (call === 3) {
        yield {
          id: "event-malformed",
          author: "agent",
          finishReason: "MALFORMED_FUNCTION_CALL",
          content: { role: "model", parts: [{ text: "oops" }] },
        };
        return;
      }
      yield {
        id: "event-retry",
        author: "agent",
        content: {
          role: "model",
          parts: [
            { text: "retrying" },
            { functionCall: { id: "tool-1", name: "lookup", args: {} } },
            { functionCall: { id: "tool-2", name: "lookup", args: {} } },
          ],
        },
      };
    };
    const { result } = renderHook(() => useAdkMessagesInternal({ stream }));
    const { controller } = result.current;
    const run = async (runId: string, content: string) => {
      act(() => {
        controller.dispatch({ type: "run.active" });
      });
      await act(async () => {
        await result.current.sendMessage(
          [{ id: `user-${runId}`, type: "human", content }],
          {},
        );
      });
      act(() => {
        controller.dispatch({ type: "run.finished", runId });
      });
    };

    await run("1", "go");
    await run("2", "retry");
    await run("3", "again");
    await run("4", "once more");

    expect([...controller.getState().failedRunIds]).toEqual(["1", "3", "4"]);
  });

  it("settles a superseded send while its stream is still opening", async () => {
    const signals: AbortSignal[] = [];
    const parked = new Promise<AsyncGenerator<AdkEvent>>(() => {});
    let calls = 0;
    const stream = vi.fn(function (_messages, { abortSignal }) {
      signals.push(abortSignal);
      if (calls++ === 0) return parked;
      return (async function* () {
        yield {
          id: "event-1",
          invocationId: "run-1",
          author: "agent",
          content: { role: "model", parts: [{ text: "done-1" }] },
        };
      })();
    }) satisfies AdkStreamCallback;
    const { result } = renderHook(() => useAdkMessages({ stream }));

    let firstSend!: Promise<void>;
    act(() => {
      firstSend = result.current.sendMessage(
        [{ id: "user-1", type: "human", content: "first" }],
        {},
      );
    });
    await vi.waitFor(() => expect(stream).toHaveBeenCalledOnce());

    let secondSend!: Promise<void>;
    act(() => {
      secondSend = result.current.sendMessage(
        [{ id: "user-2", type: "human", content: "second" }],
        {},
      );
    });

    await act(async () => {
      await Promise.all([firstSend, secondSend]);
    });
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
    expect(result.current.messages.at(-1)).toMatchObject({
      type: "ai",
      content: [{ type: "text", text: "done-1" }],
    });
  });

  it("aborts and settles a superseded stream that stops yielding", async () => {
    const signals: AbortSignal[] = [];
    const parked = new Promise<void>(() => {});
    let calls = 0;
    const stream = vi.fn(function (
      _messages,
      { abortSignal },
    ): AsyncGenerator<AdkEvent> {
      signals.push(abortSignal);
      if (calls++ === 0) {
        return (async function* () {
          await parked;
        })();
      }
      return (async function* () {
        yield {
          id: "event-1",
          invocationId: "run-1",
          author: "agent",
          content: { role: "model", parts: [{ text: "done-1" }] },
        };
      })();
    }) satisfies AdkStreamCallback;
    const { result } = renderHook(() => useAdkMessages({ stream }));

    let firstSend!: Promise<void>;
    act(() => {
      firstSend = result.current.sendMessage(
        [{ id: "user-1", type: "human", content: "first" }],
        {},
      );
    });
    await vi.waitFor(() => expect(stream).toHaveBeenCalledOnce());

    let secondSend!: Promise<void>;
    act(() => {
      secondSend = result.current.sendMessage(
        [{ id: "user-2", type: "human", content: "second" }],
        {},
      );
    });

    await act(async () => {
      await Promise.all([firstSend, secondSend]);
    });
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
    expect(result.current.messages.at(-1)).toMatchObject({
      type: "ai",
      content: [{ type: "text", text: "done-1" }],
    });
  });

  it("aborts the active stream when the hook unmounts", async () => {
    let runSignal: AbortSignal | undefined;
    let resolveStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve;
    });
    const stream: AdkStreamCallback = async function* (
      _messages,
      { abortSignal },
    ) {
      runSignal = abortSignal;
      resolveStarted();
      await new Promise<void>((resolve) => {
        abortSignal.addEventListener("abort", () => resolve(), { once: true });
      });
    };
    const { result, unmount } = renderHook(() => useAdkMessages({ stream }));

    let sendPromise!: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage(
        [{ id: "user", type: "human", content: "hello" }],
        {},
      );
    });
    await started;

    unmount();
    await act(async () => {});

    expect(runSignal?.aborted).toBe(true);
    await expect(sendPromise).resolves.toBeUndefined();
  });
});

describe("optimistic confirmation replies", () => {
  const confirmationCall = (id: string): AdkMessage => ({
    id: `ai-${id}`,
    type: "ai",
    content: [],
    tool_calls: [
      {
        id,
        name: "adk_request_confirmation",
        args: {
          originalFunctionCall: { id: `orig-${id}`, name: "delete_file" },
          toolConfirmation: { hint: "Delete?" },
        },
      },
    ],
  });

  /**
   * ADK parses the text inside its client wrapper without a `try`, so a wrapper
   * holding text that is not JSON raises and abandons the whole event.
   */
  const UNREADABLE_REPLY = JSON.stringify({ response: "not json" });

  const confirmationReply = (
    id: string,
    toolCallId: string,
    content: string,
  ): AdkMessage => ({
    id,
    type: "tool",
    tool_call_id: toolCallId,
    name: "adk_request_confirmation",
    content,
    status: "success",
  });

  const emptyStream: AdkStreamCallback = async function* () {};

  const renderWithGates = async () => {
    const { result } = renderHook(() =>
      useAdkMessages({ stream: emptyStream }),
    );
    await act(async () => {
      result.current.setMessages([
        confirmationCall("conf-a"),
        confirmationCall("conf-b"),
      ]);
    });
    return result;
  };

  it("preserves an unanswered gate across a reply run", async () => {
    let run = 0;
    const stream: AdkStreamCallback = async function* () {
      run += 1;
      if (run === 1) {
        yield {
          id: "gates",
          author: "agent",
          longRunningToolIds: ["conf-a", "conf-b"],
          content: {
            role: "model",
            parts: [
              {
                functionCall: {
                  id: "conf-a",
                  name: "adk_request_confirmation",
                  args: {},
                },
              },
              {
                functionCall: {
                  id: "conf-b",
                  name: "adk_request_confirmation",
                  args: {},
                },
              },
            ],
          },
        } satisfies AdkEvent;
      } else {
        yield {
          id: "rerun",
          author: "agent",
          content: {
            role: "user",
            parts: [
              {
                functionResponse: {
                  id: "orig-conf-a",
                  name: "delete_file",
                  response: { result: "deleted" },
                },
              },
            ],
          },
        } satisfies AdkEvent;
      }
    };
    const { result } = renderHook(() => useAdkMessages({ stream }));

    await act(async () => {
      await result.current.sendMessage(
        [{ id: "user-1", type: "human", content: "start" }],
        {},
      );
    });
    expect(result.current.longRunningToolIds).toEqual(["conf-a", "conf-b"]);

    await act(async () => {
      await result.current.sendMessage(
        [
          confirmationReply(
            "reply-a",
            "conf-a",
            JSON.stringify({ confirmed: true }),
          ),
        ],
        {},
      );
    });

    expect(result.current.longRunningToolIds).toEqual(["conf-b"]);
    expect(
      getPendingCancellations(
        result.current.messages,
        result.current.longRunningToolIds,
      ),
    ).toEqual([]);
  });

  it("keeps both gates pending when one send carries an unreadable reply", async () => {
    const result = await renderWithGates();

    await act(async () => {
      await result.current.sendMessage(
        [
          confirmationReply(
            "reply-a",
            "conf-a",
            JSON.stringify({ confirmed: true }),
          ),
          confirmationReply("reply-b", "conf-b", UNREADABLE_REPLY),
        ],
        {},
      );
    });

    expect([
      // The confirmation and the call it gates share one approval object.
      ...new Set(
        projectAdkToolApprovals(result.current.messages).approvals.values(),
      ),
    ]).toEqual([{ id: "conf-a" }, { id: "conf-b" }]);
    expect(result.current.toolConfirmations.map((c) => c.toolCallId)).toEqual([
      "conf-a",
      "conf-b",
    ]);
  });

  it("keeps both gates pending when an ai message sits between the replies", async () => {
    const result = await renderWithGates();

    await act(async () => {
      await result.current.sendMessage(
        [
          confirmationReply(
            "reply-a",
            "conf-a",
            JSON.stringify({ confirmed: true }),
          ),
          { id: "ai-interleaved", type: "ai", content: "thinking" },
          confirmationReply("reply-b", "conf-b", UNREADABLE_REPLY),
        ],
        {},
      );
    });

    expect([
      // The confirmation and the call it gates share one approval object.
      ...new Set(
        projectAdkToolApprovals(result.current.messages).approvals.values(),
      ),
    ]).toEqual([{ id: "conf-a" }, { id: "conf-b" }]);
  });

  it("settles the readable reply when the two replies were sent separately", async () => {
    const result = await renderWithGates();

    await act(async () => {
      await result.current.sendMessage(
        [
          confirmationReply(
            "reply-a",
            "conf-a",
            JSON.stringify({ confirmed: true }),
          ),
        ],
        {},
      );
    });
    await act(async () => {
      await result.current.sendMessage(
        [confirmationReply("reply-b", "conf-b", UNREADABLE_REPLY)],
        {},
      );
    });

    expect([
      // The confirmation and the call it gates share one approval object.
      ...new Set(
        projectAdkToolApprovals(result.current.messages).approvals.values(),
      ),
    ]).toEqual([{ id: "conf-a", approved: true }, { id: "conf-b" }]);
    expect(result.current.toolConfirmations.map((c) => c.toolCallId)).toEqual([
      "conf-b",
    ]);
  });
});

describe("pending requests across sends", () => {
  it("keeps an unanswered request listed across sends until its reply is sent", async () => {
    let run = 0;
    const stream: AdkStreamCallback = async function* () {
      run += 1;
      if (run === 1) {
        yield {
          id: "requests",
          author: "agent",
          longRunningToolIds: ["conf-1", "cred-1"],
          content: {
            role: "model",
            parts: [
              {
                functionCall: {
                  id: "conf-1",
                  name: "adk_request_confirmation",
                  args: {
                    originalFunctionCall: { id: "gated-1", name: "transfer" },
                    toolConfirmation: { hint: "Transfer?" },
                  },
                },
              },
              {
                functionCall: {
                  id: "cred-1",
                  name: "adk_request_credential",
                  args: {
                    function_call_id: "gated-2",
                    auth_config: { credentialKey: "k" },
                  },
                },
              },
            ],
          },
        } satisfies AdkEvent;
      } else if (run === 2) {
        yield {
          id: "answer",
          author: "agent",
          content: { role: "model", parts: [{ text: "still waiting" }] },
        } satisfies AdkEvent;
      }
    };
    const { result } = renderHook(() => useAdkMessages({ stream }));
    const pending = () => ({
      confirmations: result.current.toolConfirmations.map((c) => c.toolCallId),
      authRequests: result.current.authRequests.map((r) => r.toolCallId),
    });

    await act(async () => {
      await result.current.sendMessage(
        [{ id: "user-1", type: "human", content: "start" }],
        {},
      );
    });
    expect(pending()).toEqual({
      confirmations: ["conf-1"],
      authRequests: ["cred-1"],
    });

    await act(async () => {
      await result.current.sendMessage(
        [{ id: "user-2", type: "human", content: "any news?" }],
        {},
      );
    });
    expect(pending()).toEqual({
      confirmations: ["conf-1"],
      authRequests: ["cred-1"],
    });

    await act(async () => {
      await result.current.sendMessage(
        [
          {
            id: "reply",
            type: "tool",
            tool_call_id: "cred-1",
            name: "adk_request_credential",
            content: JSON.stringify({
              exchangedAuthCredential: { authType: "apiKey" },
            }),
            status: "success",
          },
        ],
        {},
      );
    });
    expect(pending()).toEqual({ confirmations: ["conf-1"], authRequests: [] });
  });
});

describe("messagesToEvents", () => {
  const toolReply = (id: string, toolCallId: string): AdkMessage => ({
    id,
    type: "tool",
    tool_call_id: toolCallId,
    name: "adk_request_confirmation",
    content: JSON.stringify({ confirmed: true }),
    status: "success",
  });

  it("emits nothing for an empty batch", () => {
    // `onReload` sends no messages. The transport still puts an empty user
    // content on the wire, but projecting one here would append an empty user
    // bubble above every regenerated turn.
    expect(messagesToEvents([])).toEqual([]);
  });

  it("merges the human/tool run across an interleaved ai message", () => {
    const events = messagesToEvents([
      toolReply("reply-a", "conf-a"),
      { id: "ai-interleaved", type: "ai", content: "thinking" },
      toolReply("reply-b", "conf-b"),
    ]);

    expect(events).toHaveLength(2);
    expect(events[0]?.id).toBe("reply-a");
    expect(
      events[0]?.content?.parts?.map((p) => p.functionResponse?.id),
    ).toEqual(["conf-a", "conf-b"]);
    expect(events[1]?.id).toBe("ai-interleaved");
  });

  it("mirrors the transport's empty user content for an ai-only batch", async () => {
    const aiOnly: AdkMessage[] = [
      { id: "ai-1", type: "ai", content: "one" },
      { id: "ai-2", type: "ai", content: "two" },
    ];

    let sentBody = "";
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      sentBody = init.body as string;
      return new Response(
        new ReadableStream<Uint8Array>({
          start: (controller) => controller.close(),
        }),
        { status: 200, headers: { "Content-Type": "text/event-stream" } },
      );
    });
    const stream = createAdkStream({
      api: "http://localhost:8000",
      appName: "app",
      userId: "user-1",
    });
    for await (const _ of await stream(aiOnly, {
      abortSignal: new AbortController().signal,
      initialize: async () => ({ remoteId: "r1", externalId: "s1" }),
    })) {
      /* drain */
    }
    const sent = JSON.parse(sentBody);

    const events = messagesToEvents(aiOnly);
    const userEvent = events.find((e) => e.author === "user");
    expect(sent.newMessage.parts).toEqual([{ text: "" }]);
    expect(userEvent?.content?.parts).toEqual(sent.newMessage.parts);
    expect(events.map((e) => e.id)).toEqual(["ai-1", "ai-2", userEvent?.id]);

    const accumulator = new AdkEventAccumulator([]);
    let messages: AdkMessage[] = [];
    for (const event of events) messages = accumulator.processEvent(event);
    expect(messages.filter((m) => m.type === "human")).toEqual([
      { id: userEvent?.id, type: "human", content: "" },
    ]);
  });

  it("emits the merged event at the position of the run it replaces", () => {
    const events = messagesToEvents([
      { id: "ai-first", type: "ai", content: "thinking" },
      { id: "human-a", type: "human", content: "a" },
    ]);

    expect(events.map((e) => e.id)).toEqual(["ai-first", "human-a"]);
  });
});

describe("optimistic multi-message sends", () => {
  const emptyStream: AdkStreamCallback = async function* () {};

  it("does not duplicate later messages of a staged multi-human send", async () => {
    const staged: AdkMessage[] = [
      { id: "human-a", type: "human", content: "a" },
      { id: "human-b", type: "human", content: "b" },
    ];
    const { result } = renderHook(() =>
      useAdkMessages({ stream: emptyStream }),
    );
    await act(async () => {
      result.current.setMessages(staged);
    });

    await act(async () => {
      await result.current.sendMessage(staged, {});
    });

    expect(result.current.messages).toEqual([
      {
        id: "human-a",
        type: "human",
        content: [
          { type: "text", text: "a" },
          { type: "text", text: "b" },
        ],
      },
    ]);
  });

  it("keeps messages that are not part of the send", async () => {
    const { result } = renderHook(() =>
      useAdkMessages({ stream: emptyStream }),
    );
    await act(async () => {
      result.current.setMessages([
        { id: "earlier", type: "human", content: "earlier" },
      ]);
    });

    await act(async () => {
      await result.current.sendMessage(
        [{ id: "human-a", type: "human", content: "a" }],
        {},
      );
    });

    expect(result.current.messages.map((m) => m.id)).toEqual([
      "earlier",
      "human-a",
    ]);
  });
});

describe("ADK request coalescing", () => {
  const response = (reply?: string) =>
    new Response(
      reply
        ? `data: ${JSON.stringify({ id: `reply-${reply}`, author: "agent", content: { role: "model", parts: [{ text: reply }] } })}\n\n`
        : "",
      { headers: { "Content-Type": "text/event-stream" } },
    );

  it("sends two messages appended in the same tick in one request", async () => {
    const requests: { newMessage: { parts: { text: string }[] } }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: URL, init: RequestInit) => {
        requests.push(JSON.parse(init.body as string));
        return response();
      }),
    );
    const stream = createAdkStream({
      api: "http://localhost:8000",
      appName: "app",
      userId: "user",
    });
    const { result } = renderHook(() => useAdkMessages({ stream }));
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.sendMessage(
        [{ id: "first", type: "human", content: "first" }],
        {},
      );
      second = result.current.sendMessage(
        [{ id: "second", type: "human", content: "second" }],
        {},
      );
    });
    await act(async () => {
      await Promise.all([first, second]);
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]!.newMessage.parts).toEqual([
      { text: "first" },
      { text: "second" },
    ]);
    expect(result.current.messages.map((message) => message.id)).toEqual([
      "first",
      "second",
    ]);
  });

  it("sends same-tick messages with different state deltas separately", async () => {
    const calls: { message: string; stateDelta: unknown }[] = [];
    const stream: AdkStreamCallback = async function* (messages, config) {
      calls.push({
        message: messages[0]!.id,
        stateDelta: config.stateDelta,
      });
    };
    const { result } = renderHook(() => useAdkMessages({ stream }));
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.sendMessage(
        [{ id: "first", type: "human", content: "first" }],
        { stateDelta: { a: 1 } },
      );
      second = result.current.sendMessage(
        [{ id: "second", type: "human", content: "second" }],
        { stateDelta: { b: 2 } },
      );
    });
    await act(async () => {
      await Promise.all([first, second]);
    });

    expect(calls).toEqual([
      { message: "first", stateDelta: { a: 1 } },
      { message: "second", stateDelta: { b: 2 } },
    ]);
  });

  it("sends same-tick messages with different checkpoints separately", async () => {
    const calls: { message: string; checkpointId: string | undefined }[] = [];
    const stream: AdkStreamCallback = async function* (messages, config) {
      calls.push({
        message: messages[0]!.id,
        checkpointId: config.checkpointId,
      });
    };
    const { result } = renderHook(() => useAdkMessages({ stream }));
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.sendMessage(
        [{ id: "first", type: "human", content: "first" }],
        { checkpointId: "checkpoint-a" },
      );
      second = result.current.sendMessage(
        [{ id: "second", type: "human", content: "second" }],
        { checkpointId: "checkpoint-b" },
      );
    });
    await act(async () => {
      await Promise.all([first, second]);
    });

    expect(calls).toEqual([
      { message: "first", checkpointId: "checkpoint-a" },
      { message: "second", checkpointId: "checkpoint-b" },
    ]);
  });

  it.each([
    ["empty configs", {}, {}, [["first", "second"]]],
    [
      "empty state deltas",
      { stateDelta: {} },
      { stateDelta: {} },
      [["first", "second"]],
    ],
    [
      "missing and empty state deltas",
      {},
      { stateDelta: {} },
      [["first", "second"]],
    ],
    [
      "a checkpoint only on the second",
      {},
      { checkpointId: "checkpoint" },
      [["first"], ["second"]],
    ],
    [
      "a checkpoint only on the first",
      { checkpointId: "checkpoint" },
      {},
      [["first"], ["second"]],
    ],
    [
      "a state delta only on the second",
      {},
      { stateDelta: { a: 1 } },
      [["first"], ["second"]],
    ],
    [
      "a state delta only on the first",
      { stateDelta: { a: 1 } },
      {},
      [["first"], ["second"]],
    ],
  ])(
    "groups same-tick messages with %s",
    async (_label, firstConfig, secondConfig, expected) => {
      const calls: string[][] = [];
      const stream: AdkStreamCallback = async function* (messages) {
        calls.push(messages.map((message) => message.id));
      };
      const { result } = renderHook(() => useAdkMessages({ stream }));
      let first!: Promise<void>;
      let second!: Promise<void>;
      act(() => {
        first = result.current.sendMessage(
          [{ id: "first", type: "human", content: "first" }],
          firstConfig,
        );
        second = result.current.sendMessage(
          [{ id: "second", type: "human", content: "second" }],
          secondConfig,
        );
      });
      await act(async () => {
        await Promise.all([first, second]);
      });

      expect(calls).toEqual(expected);
    },
  );

  it("settles every caller with the shared run error", async () => {
    const failure = new Error("stream failed");
    const stream = vi.fn(async function* () {
      throw failure;
    });
    const { result } = renderHook(() => useAdkMessages({ stream }));
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.sendMessage(
        [{ id: "first", type: "human", content: "first" }],
        {},
      );
      second = result.current.sendMessage(
        [{ id: "second", type: "human", content: "second" }],
        {},
      );
    });
    let outcomes!: PromiseSettledResult<void>[];
    await act(async () => {
      outcomes = await Promise.allSettled([first, second]);
    });

    expect(stream).toHaveBeenCalledOnce();
    expect(outcomes).toEqual([
      { status: "rejected", reason: failure },
      { status: "rejected", reason: failure },
    ]);
  });

  it("does not start a queued request after cancellation", async () => {
    const stream = vi.fn(async function* () {});
    const { result } = renderHook(() => useAdkMessages({ stream }));
    let send!: Promise<void>;
    act(() => {
      send = result.current.sendMessage(
        [{ id: "first", type: "human", content: "first" }],
        {},
      );
      result.current.cancel();
    });
    await act(async () => {
      await send;
    });
    expect(stream).not.toHaveBeenCalled();
  });

  it("still aborts a run whose request already left when a new message is sent", async () => {
    const signals: AbortSignal[] = [];
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: URL, init: RequestInit) => {
        signals.push(init.signal!);
        return ++calls === 1
          ? new Promise<Response>(() => {})
          : Promise.resolve(response());
      }),
    );
    const stream = createAdkStream({
      api: "http://localhost:8000",
      appName: "app",
      userId: "user",
    });
    const { result } = renderHook(() => useAdkMessages({ stream }));
    let first!: Promise<void>;
    act(() => {
      first = result.current.sendMessage(
        [{ id: "first", type: "human", content: "first" }],
        {},
      );
    });
    await vi.waitFor(() => expect(signals).toHaveLength(1));
    let second!: Promise<void>;
    act(() => {
      second = result.current.sendMessage(
        [{ id: "second", type: "human", content: "second" }],
        {},
      );
    });
    await act(async () => {
      await Promise.all([first, second]);
    });
    expect(signals[0]!.aborted).toBe(true);
    expect(signals).toHaveLength(2);
  });

  it("sends same-tick messages with different run configs in order, both reaching the server", async () => {
    const requests: { runConfig: unknown; message: string }[] = [];
    let releaseFirst!: () => void;
    const firstResponse = new Promise<Response>((resolve) => {
      releaseFirst = () => resolve(response("first reply"));
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: URL, init: RequestInit) => {
        requests.push(JSON.parse(init.body as string));
        return requests.length === 1 ? firstResponse : response("second reply");
      }),
    );
    const stream = createAdkStream({ api: "http://localhost:8000/proxy" });
    const { result } = renderHook(() => useAdkMessages({ stream }));
    const firstConfig = { model: "a" };
    const secondConfig = { model: "a" };
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.sendMessage(
        [{ id: "first", type: "human", content: "first" }],
        { runConfig: firstConfig },
      );
      second = result.current.sendMessage(
        [{ id: "second", type: "human", content: "second" }],
        { runConfig: secondConfig },
      );
    });
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toEqual({
      sessionId: "thread-1",
      runConfig: firstConfig,
      message: "first",
    });
    releaseFirst();
    await act(async () => {
      await Promise.all([first, second]);
    });
    expect(requests).toEqual([
      { sessionId: "thread-1", runConfig: firstConfig, message: "first" },
      { sessionId: "thread-1", runConfig: secondConfig, message: "second" },
    ]);
    expect(result.current.messages.map((message) => message.content)).toEqual([
      "first",
      [{ type: "text", text: "first reply" }],
      "second",
      [{ type: "text", text: "second reply" }],
    ]);
  });

  it("supersedes an older queued group when a later-tick send arrives", async () => {
    const requests: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: URL, init: RequestInit) => {
        const body = JSON.parse(init.body as string) as { message: string };
        requests.push(body.message);
        return body.message === "first"
          ? new Promise<Response>(() => {})
          : Promise.resolve(response());
      }),
    );
    const stream = createAdkStream({ api: "http://localhost:8000/proxy" });
    const { result } = renderHook(() => useAdkMessages({ stream }));
    let first!: Promise<void>;
    let queued!: Promise<void>;
    act(() => {
      first = result.current.sendMessage(
        [{ id: "first", type: "human", content: "first" }],
        { runConfig: { model: "a" } },
      );
      queued = result.current.sendMessage(
        [{ id: "queued", type: "human", content: "queued" }],
        { runConfig: { model: "b" } },
      );
    });
    await vi.waitFor(() => expect(requests).toEqual(["first"]));

    let latest!: Promise<void>;
    act(() => {
      latest = result.current.sendMessage(
        [{ id: "latest", type: "human", content: "latest" }],
        {},
      );
    });
    await act(async () => {
      await Promise.all([first, queued, latest]);
    });
    expect(requests).toEqual(["first", "latest"]);
  });
});

describe("messageToEvent (contentToParts)", () => {
  it("skips a null tool_calls entry", () => {
    const event = messageToEvent({
      id: "ai-1",
      type: "ai",
      content: [],
      tool_calls: [null, { id: "tc-1", name: "search", args: { q: "x" } }],
    } as unknown as AdkMessage);

    expect(event.content?.parts).toEqual([
      { functionCall: { name: "search", id: "tc-1", args: { q: "x" } } },
    ]);
  });

  it.each([
    ["scalar", "false", { result: false }],
    ["array", "[1,2]", { results: [1, 2] }],
  ])(
    "normalizes an optimistic %s tool response",
    (_label, content, response) => {
      const event = messageToEvent({
        id: "tool-1",
        type: "tool",
        content,
        tool_call_id: "call-1",
        name: "search",
      });

      expect(event.content?.parts?.[0]?.functionResponse?.response).toEqual(
        response,
      );
    },
  );

  it("serializes a file content part as inlineData", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "human",
      content: [
        {
          type: "file",
          mimeType: "application/pdf",
          data: "JVBERi0xLjQK",
          filename: "report.pdf",
        },
      ],
    };
    const event = messageToEvent(msg);
    expect(event.content?.parts).toEqual([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: "JVBERi0xLjQK",
          displayName: "report.pdf",
        },
      },
    ]);
  });

  it("serializes a file_url content part as fileData with mimeType", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "human",
      content: [
        {
          type: "file_url",
          url: "gs://bucket/report.pdf",
          mimeType: "application/pdf",
        },
      ],
    };
    const event = messageToEvent(msg);
    expect(event.content?.parts).toEqual([
      {
        fileData: {
          fileUri: "gs://bucket/report.pdf",
          mimeType: "application/pdf",
        },
      },
    ]);
  });

  it("serializes a file_url without mimeType as bare fileData", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "human",
      content: [{ type: "file_url", url: "gs://bucket/unknown" }],
    };
    const event = messageToEvent(msg);
    expect(event.content?.parts).toEqual([
      { fileData: { fileUri: "gs://bucket/unknown" } },
    ]);
  });

  it("serializes mixed text + file content as multiple parts", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "human",
      content: [
        { type: "text", text: "see attached" },
        { type: "file", mimeType: "image/png", data: "AAAA" },
      ],
    };
    const event = messageToEvent(msg);
    expect(event.content?.parts).toEqual([
      { text: "see attached" },
      { inlineData: { mimeType: "image/png", data: "AAAA" } },
    ]);
  });
});
