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
  type UseAdkMessagesOptions,
} from "./useAdkMessages";
import { projectAdkToolApprovals } from "./adkToolApproval";
import { createAdkStream } from "./AdkClient";
import { AdkEventAccumulator } from "./AdkEventAccumulator";
import type { AdkEvent, AdkMessage, AdkStreamCallback } from "./types";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ADK runtime callbacks", () => {
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
      } as UseAdkMessagesOptions["eventHandlers"];
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

describe("messageToEvent (contentToParts)", () => {
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
      { inlineData: { mimeType: "application/pdf", data: "JVBERi0xLjQK" } },
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
