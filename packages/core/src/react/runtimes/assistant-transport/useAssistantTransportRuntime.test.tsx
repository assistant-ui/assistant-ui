// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { Suspense, useState, type FC } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAui } from "@assistant-ui/store";
import { ToolResponse } from "assistant-stream";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import {
  useAssistantTransportRuntime,
  useAssistantTransportSendCommand,
} from "./useAssistantTransportRuntime";
import { REPLAY_CONTENT_LENGTH_HEADER } from "./replayBoundaryStream";
import type {
  AssistantTransportCommand,
  AssistantTransportOptions,
  AssistantTransportStateConverter,
} from "./types";

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

const converter: AssistantTransportStateConverter<unknown> = (
  _state,
  meta,
) => ({
  messages: [],
  isRunning: meta.isSending,
});

const createMessageCommand = (
  text: string,
  id?: string,
): AssistantTransportCommand => ({
  type: "add-message",
  message: {
    role: "user",
    ...(id !== undefined && { id }),
    parts: [{ type: "text", text }],
  },
  parentId: null,
  sourceId: null,
});

const createStreamResponse = () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    response: new Response(stream, { status: 200 }),
    push: (text: string) => controller.enqueue(new TextEncoder().encode(text)),
    close: () => controller.close(),
  };
};

type StreamResponse = ReturnType<typeof createStreamResponse>;

type RecordedRequest = {
  url: string;
  init: RequestInit;
  body: Record<string, any>;
};

const installFetch = () => {
  const requests: RecordedRequest[] = [];
  const servers: StreamResponse[] = [];

  vi.stubGlobal(
    "fetch",
    async (url: RequestInfo | URL, init: RequestInit = {}) => {
      requests.push({
        url: String(url),
        init,
        body: JSON.parse(init.body as string),
      });
      const server = createStreamResponse();
      servers.push(server);
      return server.response;
    },
  );

  return { requests, servers };
};

const installPendingFetch = () => {
  const requests: RecordedRequest[] = [];
  const pending: {
    resolve: (response: Response) => void;
    reject: (reason: unknown) => void;
  }[] = [];

  vi.stubGlobal("fetch", (url: RequestInfo | URL, init: RequestInit = {}) => {
    requests.push({
      url: String(url),
      init,
      body: JSON.parse(init.body as string),
    });

    return new Promise<Response>((resolve, reject) => {
      pending.push({ resolve, reject });
      init.signal?.addEventListener(
        "abort",
        () => reject(init.signal?.reason),
        {
          once: true,
        },
      );
    });
  });

  return { requests, pending };
};

const mountRuntime = (
  options?: Partial<AssistantTransportOptions<unknown>>,
) => {
  const captured: {
    aui?: ReturnType<typeof useAui>;
    sendCommand?: (command: AssistantTransportCommand) => void;
  } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    captured.sendCommand = useAssistantTransportSendCommand();
    return null;
  };
  const App: FC = () => {
    const runtime = useAssistantTransportRuntime({
      initialState: {},
      api: "https://example.com/api",
      headers: {},
      converter,
      ...options,
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Capture />
      </AssistantRuntimeProvider>
    );
  };
  const utils = render(<App />);
  return {
    aui: () => captured.aui!,
    sendCommand: (command: AssistantTransportCommand) =>
      captured.sendCommand!(command),
    ...utils,
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useAssistantTransportRuntime", () => {
  it.each([
    {
      name: "line",
      protocol: "assistant-transport" as const,
      response: "data: [DONE]\n\n",
      limits: { maxStreamLineLength: 5 },
      expectedError: "maxLineLength",
    },
    {
      name: "event",
      protocol: "assistant-transport" as const,
      response: "data: a\ndata: b\n\n",
      limits: { maxStreamLineLength: 7, maxStreamEventLength: 2 },
      expectedError: "maxEventLength",
    },
    {
      name: "data-stream line",
      protocol: "data-stream" as const,
      response: '0:"hello"\n',
      limits: { maxStreamLineLength: 4 },
      expectedError: "maxLineLength",
    },
  ])("forwards the configured $name limit", async (testCase) => {
    const onError = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(testCase.response)),
    );

    const { aui, sendCommand } = mountRuntime({
      protocol: testCase.protocol,
      ...testCase.limits,
      onError,
    });
    await waitFor(() =>
      expect(
        (aui().thread.getState().extras as { sendCommand?: unknown })
          ?.sendCommand,
      ).toBeTypeOf("function"),
    );

    act(() => sendCommand(createMessageCommand("hello")));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(testCase.expectedError),
        }),
        expect.anything(),
      ),
    );
  });

  it.each([false, 0, "", null])(
    "preserves the falsy tool artifact %j",
    async (artifact) => {
      const fetchMock = installFetch();
      const { aui } = mountRuntime({
        converter: (_state, meta) => ({
          messages: [
            {
              id: "a1",
              role: "assistant",
              content: [
                {
                  type: "tool-call",
                  toolCallId: "tc1",
                  toolName: "probe",
                  args: {},
                  argsText: "{}",
                },
              ],
              createdAt: new Date(0),
              status: { type: "requires-action", reason: "tool-calls" },
              metadata: {
                unstable_state: {},
                unstable_annotations: [],
                unstable_data: [],
                steps: [],
                custom: {},
              },
            },
          ],
          isRunning: meta.isSending,
        }),
      });

      await waitFor(() =>
        expect(
          aui()
            .thread.message({ id: "a1" })
            .part({ toolCallId: "tc1" })
            .getState().type,
        ).toBe("tool-call"),
      );

      act(() => {
        aui()
          .thread.message({ id: "a1" })
          .part({ toolCallId: "tc1" })
          .addToolResult(new ToolResponse({ result: "ok", artifact }));
      });

      await waitFor(() => expect(fetchMock.requests).toHaveLength(1));
      expect(fetchMock.requests[0]!.body["commands"][0]).toHaveProperty(
        "artifact",
        artifact,
      );

      act(() => fetchMock.servers[0]!.close());
      await waitFor(() =>
        expect(aui().thread.getState().isRunning).toBe(false),
      );
    },
  );

  it("forwards a tool response's modelContent to the outbound command", async () => {
    const fetchMock = installFetch();
    const { aui } = mountRuntime({
      converter: (_state, meta) => ({
        messages: [
          {
            id: "a1",
            role: "assistant",
            content: [
              {
                type: "tool-call",
                toolCallId: "tc1",
                toolName: "probe",
                args: {},
                argsText: "{}",
              },
            ],
            createdAt: new Date(0),
            status: { type: "requires-action", reason: "tool-calls" },
            metadata: {
              unstable_state: {},
              unstable_annotations: [],
              unstable_data: [],
              steps: [],
              custom: {},
            },
          },
        ],
        isRunning: meta.isSending,
      }),
    });

    await waitFor(() =>
      expect(
        aui()
          .thread.message({ id: "a1" })
          .part({ toolCallId: "tc1" })
          .getState().type,
      ).toBe("tool-call"),
    );

    const modelContent = [{ type: "text" as const, text: "done" }];
    act(() => {
      aui()
        .thread.message({ id: "a1" })
        .part({ toolCallId: "tc1" })
        .addToolResult(new ToolResponse({ result: "ok", modelContent }));
    });

    await waitFor(() => expect(fetchMock.requests).toHaveLength(1));
    expect(fetchMock.requests[0]!.body["commands"][0]).toHaveProperty(
      "modelContent",
      modelContent,
    );

    act(() => fetchMock.servers[0]!.close());
    await waitFor(() => expect(aui().thread.getState().isRunning).toBe(false));
  });

  it.each(["throws", "rejects"] as const)(
    "cancels the response body when onResponse %s",
    async (failureMode) => {
      const callbackError = new Error("response callback failed");
      const cancel = vi.fn().mockRejectedValue(new Error("cancel failed"));
      const onError = vi.fn();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            new ReadableStream({
              cancel,
            }),
          ),
        ),
      );

      const { aui, sendCommand } = mountRuntime({
        onResponse: () => {
          if (failureMode === "throws") throw callbackError;
          return Promise.reject(callbackError);
        },
        onError,
      });
      await waitFor(() =>
        expect(
          (aui().thread.getState().extras as { sendCommand?: unknown })
            ?.sendCommand,
        ).toBeTypeOf("function"),
      );

      act(() => sendCommand(createMessageCommand("hello")));

      await waitFor(() =>
        expect(onError).toHaveBeenCalledWith(callbackError, expect.anything()),
      );
      expect(cancel).toHaveBeenCalledOnce();
    },
  );

  it.each(["headers", "body", "prepare"] as const)(
    "settles cancellation while resolving request %s",
    async (phase) => {
      const pending = vi.fn(() => new Promise<never>(() => {}));
      const fetchMock = vi.fn();
      const onCancel = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      let pendingOption: Partial<AssistantTransportOptions<unknown>>;
      if (phase === "headers") {
        pendingOption = { headers: pending };
      } else if (phase === "body") {
        pendingOption = { body: pending };
      } else {
        pendingOption = { prepareSendCommandsRequest: pending };
      }

      const { aui, sendCommand } = mountRuntime({
        ...pendingOption,
        onCancel,
      });

      act(() => sendCommand(createMessageCommand("hello")));
      await waitFor(() => expect(pending).toHaveBeenCalledOnce());
      expect(aui().thread.getState().isRunning).toBe(true);

      act(() => aui().thread.cancelRun());

      await waitFor(() =>
        expect(aui().thread.getState().isRunning).toBe(false),
      );
      expect(fetchMock).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalledOnce();
    },
  );

  it("settles cancellation while the response callback is pending", async () => {
    const cancel = vi.fn();
    const onResponse = vi.fn(() => new Promise<void>(() => {}));
    const onCancel = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          new ReadableStream({
            cancel,
          }),
        ),
      ),
    );

    const { aui, sendCommand } = mountRuntime({ onResponse, onCancel });

    act(() => sendCommand(createMessageCommand("hello")));
    await waitFor(() => expect(onResponse).toHaveBeenCalledOnce());

    act(() => aui().thread.cancelRun());

    await act(nextTask);
    expect(aui().thread.getState().isRunning).toBe(false);
    expect(cancel).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
    expect(
      onCancel.mock.calls[0]![0].commands.map(
        (command: any) => command.message.parts[0].text,
      ),
    ).toEqual(["hello"]);
  });

  it("no-ops a follow-up run that finds an empty queue", async () => {
    const fetchMock = installFetch();
    const onError = vi.fn();
    const { aui, sendCommand } = mountRuntime({ onError });
    await waitFor(() =>
      expect(
        (aui().thread.getState().extras as { sendCommand?: unknown })
          ?.sendCommand,
      ).toBeTypeOf("function"),
    );

    // Two synchronous sends coalesce into one request plus one follow-up run.
    act(() => {
      sendCommand(createMessageCommand("a"));
      sendCommand(createMessageCommand("b"));
    });

    await waitFor(() => expect(fetchMock.requests).toHaveLength(1));
    expect(
      fetchMock.requests[0]!.body["commands"].map((c: any) => c.type),
    ).toEqual(["add-message", "add-message"]);
    expect(fetchMock.requests[0]!.body["state"]).toEqual({});

    act(() => fetchMock.servers[0]!.close());

    await waitFor(() => expect(aui().thread.getState().isRunning).toBe(false));
    await act(async () => {});
    expect(onError).not.toHaveBeenCalled();
    expect(fetchMock.requests).toHaveLength(1);
  });

  it("cancels the commands queued behind a run whose response already finished", async () => {
    const fetchMock = installFetch();
    let releaseResponse!: () => void;
    const responseHeld = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    const onResponse = vi.fn(() => responseHeld);
    const onCancel = vi.fn();
    let pendingCommands: readonly AssistantTransportCommand[] = [];
    const { aui, sendCommand } = mountRuntime({
      onResponse,
      onCancel,
      converter: (_state, meta) => {
        pendingCommands = meta.pendingCommands;
        return { messages: [], isRunning: meta.isSending };
      },
    });
    await waitFor(() =>
      expect(
        (aui().thread.getState().extras as { sendCommand?: unknown })
          ?.sendCommand,
      ).toBeTypeOf("function"),
    );

    act(() => sendCommand(createMessageCommand("a")));
    await waitFor(() => expect(onResponse).toHaveBeenCalledTimes(1));
    act(() => fetchMock.servers[0]!.close());
    act(() => sendCommand(createMessageCommand("b")));
    act(() => aui().thread.cancelRun());
    await act(async () => releaseResponse());

    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    expect(
      onCancel.mock.calls[0]![0].commands.map(
        (c: any) => c.message.parts[0].text,
      ),
    ).toEqual(["a", "b"]);
    await waitFor(() => expect(aui().thread.getState().isRunning).toBe(false));
    expect(pendingCommands).toEqual([]);
    expect(fetchMock.requests).toHaveLength(1);
  });

  it("skips add-message commands with no supported parts", async () => {
    const fetchMock = installFetch();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { aui, sendCommand } = mountRuntime();
    await waitFor(() =>
      expect(
        (aui().thread.getState().extras as { sendCommand?: unknown })
          ?.sendCommand,
      ).toBeTypeOf("function"),
    );

    act(() =>
      aui().thread.append({
        role: "user",
        content: [{ type: "audio", audio: { data: "", format: "mp3" } }],
      }),
    );

    await act(async () => {});
    expect(warn).toHaveBeenCalledWith(
      "[assistant-ui] Skipped add-message command with no supported parts",
    );
    expect(fetchMock.requests).toHaveLength(0);

    // The skipped message must not leak its parentId into later batches.
    act(() => sendCommand(createMessageCommand("follow-up")));
    await waitFor(() => expect(fetchMock.requests).toHaveLength(1));
    expect(fetchMock.requests[0]!.body).not.toHaveProperty("parentId");
  });

  it("flushes commands enqueued during a resume run in a follow-up run", async () => {
    const fetchMock = installFetch();
    const { aui, sendCommand } = mountRuntime({
      resumeApi: "https://example.com/resume",
    });
    await waitFor(() =>
      expect(
        (aui().thread.getState().extras as { sendCommand?: unknown })
          ?.sendCommand,
      ).toBeTypeOf("function"),
    );

    act(() => sendCommand(createMessageCommand("a")));
    await waitFor(() => expect(fetchMock.requests).toHaveLength(1));

    // Both land while the first run is active and coalesce into one follow-up.
    act(() => {
      sendCommand(createMessageCommand("b"));
      aui().thread.resumeRun({ parentId: null });
    });

    act(() => fetchMock.servers[0]!.close());
    await waitFor(() => expect(fetchMock.requests).toHaveLength(2));
    expect(fetchMock.requests[1]!.url).toBe("https://example.com/resume");
    expect(fetchMock.requests[1]!.body["commands"]).toEqual([]);
    expect(fetchMock.requests[1]!.body).toHaveProperty("state");

    // "b" coalesced into the resume run and must not starve in the queue.
    act(() => fetchMock.servers[1]!.close());
    await waitFor(() => expect(fetchMock.requests).toHaveLength(3));
    expect(fetchMock.requests[2]!.url).toBe("https://example.com/api");
    expect(fetchMock.requests[2]!.body["commands"]).toMatchObject([
      createMessageCommand("b"),
    ]);
    expect(fetchMock.requests[2]!.body["commands"][0].message.id).toEqual(
      expect.any(String),
    );

    act(() => fetchMock.servers[2]!.close());
    await waitFor(() => expect(aui().thread.getState().isRunning).toBe(false));
  });

  it.each(["error", "cancellation"] as const)(
    "does not apply a dropped resume after run %s",
    async (settlement) => {
      const fetchMock = installPendingFetch();
      const onError = vi.fn();
      const { aui, sendCommand } = mountRuntime({
        resumeApi: "https://example.com/resume",
        onError,
      });
      await waitFor(() =>
        expect(
          (aui().thread.getState().extras as { sendCommand?: unknown })
            ?.sendCommand,
        ).toBeTypeOf("function"),
      );

      act(() => sendCommand(createMessageCommand("a")));
      await waitFor(() => expect(fetchMock.requests).toHaveLength(1));

      await act(async () => {
        await aui().thread.resumeRun({ parentId: null });
      });
      if (settlement === "cancellation") {
        act(() => aui().thread.cancelRun());
      } else {
        await act(async () => {
          fetchMock.pending[0]!.reject(new Error("request failed"));
        });
      }
      await waitFor(() =>
        expect(aui().thread.getState().isRunning).toBe(false),
      );

      act(() => sendCommand(createMessageCommand("b")));
      await waitFor(() => expect(fetchMock.requests).toHaveLength(2));
      expect(fetchMock.requests[1]!.url).toBe("https://example.com/api");
      expect(fetchMock.requests[1]!.body["commands"]).toMatchObject([
        createMessageCommand("b"),
      ]);
      expect(fetchMock.requests[1]!.body["commands"][0].message.id).toEqual(
        expect.any(String),
      );

      await act(async () => {
        fetchMock.pending[1]!.resolve(new Response("", { status: 200 }));
      });
      await waitFor(() =>
        expect(aui().thread.getState().isRunning).toBe(false),
      );
      expect(onError).toHaveBeenCalledTimes(settlement === "error" ? 1 : 0);
    },
  );

  describe("commands sent around cancelRun", () => {
    const texts = (commands: readonly AssistantTransportCommand[]) =>
      commands.map((c) => (c as any).message.parts[0].text);

    const ready = (aui: () => ReturnType<typeof useAui>) =>
      waitFor(() =>
        expect(
          (aui().thread.getState().extras as { sendCommand?: unknown })
            ?.sendCommand,
        ).toBeTypeOf("function"),
      );

    it("sends a command issued right after cancelRun in a follow-up run", async () => {
      const fetchMock = installPendingFetch();
      const onCancel = vi.fn();
      const { aui, sendCommand } = mountRuntime({ onCancel });
      await ready(aui);

      act(() => sendCommand(createMessageCommand("a")));
      await waitFor(() => expect(fetchMock.requests).toHaveLength(1));
      act(() => {
        aui().thread.cancelRun();
        sendCommand(createMessageCommand("b"));
      });

      await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
      expect(texts(onCancel.mock.calls[0]![0].commands)).toEqual(["a"]);
      await waitFor(() => expect(fetchMock.requests).toHaveLength(2));
      expect(texts(fetchMock.requests[1]!.body["commands"])).toEqual(["b"]);
    });

    it("sends a command issued after cancelRun before the cancelled run started", async () => {
      const fetchMock = installPendingFetch();
      const onCancel = vi.fn();
      const { aui, sendCommand } = mountRuntime({ onCancel });
      await ready(aui);

      act(() => {
        sendCommand(createMessageCommand("a"));
        aui().thread.cancelRun();
        sendCommand(createMessageCommand("b"));
      });

      await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
      expect(texts(onCancel.mock.calls[0]![0].commands)).toEqual(["a"]);
      await waitFor(() => expect(fetchMock.requests).toHaveLength(1));
      expect(texts(fetchMock.requests[0]!.body["commands"])).toEqual(["b"]);
    });

    it("does not report an empty cancellation after a stop during onError", async () => {
      installFetch();
      let releaseOnError!: () => void;
      const onErrorHeld = new Promise<void>((resolve) => {
        releaseOnError = resolve;
      });
      const onError = vi.fn(() => onErrorHeld);
      const onCancel = vi.fn();
      const { aui, sendCommand } = mountRuntime({
        onError,
        onCancel,
        onResponse: () => {
          throw new Error("boom");
        },
      });
      await ready(aui);

      act(() => sendCommand(createMessageCommand("a")));
      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      act(() => aui().thread.cancelRun());
      await act(async () => releaseOnError());
      await waitFor(() =>
        expect(aui().thread.getState().isRunning).toBe(false),
      );

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onCancel.mock.calls[0]![0]).toMatchObject({
        commands: [],
        error: expect.objectContaining({ message: "boom" }),
      });
    });

    it("reports a command cancelled while onError runs exactly once", async () => {
      const fetchMock = installFetch();
      let releaseOnError!: () => void;
      const onErrorHeld = new Promise<void>((resolve) => {
        releaseOnError = resolve;
      });
      const onError = vi.fn(() => onErrorHeld);
      const onCancel = vi.fn();
      let pendingCommands: readonly AssistantTransportCommand[] = [];
      const { aui, sendCommand } = mountRuntime({
        onError,
        onCancel,
        onResponse: () => {
          throw new Error("boom");
        },
        converter: (_state, meta) => {
          pendingCommands = meta.pendingCommands;
          return { messages: [], isRunning: meta.isSending };
        },
      });
      await ready(aui);

      act(() => sendCommand(createMessageCommand("a")));
      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      act(() => {
        sendCommand(createMessageCommand("b"));
        aui().thread.cancelRun();
      });
      await act(async () => releaseOnError());

      await waitFor(() =>
        expect(
          onCancel.mock.calls.flatMap(([payload]) => texts(payload.commands)),
        ).toEqual(["b"]),
      );
      await waitFor(() =>
        expect(aui().thread.getState().isRunning).toBe(false),
      );
      expect(onCancel).toHaveBeenCalledTimes(2);
      expect(
        onCancel.mock.calls.filter(([payload]) => !payload.error),
      ).toHaveLength(1);
      expect(pendingCommands).toEqual([]);
      expect(fetchMock.requests).toHaveLength(1);
    });

    const setReply = (value: string) =>
      `aui-state:[{"type":"set","path":["reply"],"value":"${value}"}]\n`;
    const agentState = (aui: () => ReturnType<typeof useAui>) =>
      (aui().thread.getState().extras as { state: unknown }).state;

    // installFetch's body ignores the abort signal, like a body that has
    // fully arrived, which abort() can no longer error.
    it("drops a reply read after cancelRun and reports its command cancelled", async () => {
      const fetchMock = installFetch();
      const onCancel = vi.fn();
      const { aui, sendCommand } = mountRuntime({ onCancel });
      await ready(aui);

      act(() => sendCommand(createMessageCommand("a")));
      await waitFor(() => expect(fetchMock.requests).toHaveLength(1));
      await act(nextTask);
      act(() => aui().thread.cancelRun());
      act(() => {
        fetchMock.servers[0]!.push(setReply("late"));
        fetchMock.servers[0]!.close();
      });

      await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(aui().thread.getState().isRunning).toBe(false),
      );
      expect(texts(onCancel.mock.calls[0]![0].commands)).toEqual(["a"]);
      expect(agentState(aui)).toEqual({});
    });

    it("keeps the snapshot committed before cancelRun and ignores later ones", async () => {
      const fetchMock = installFetch();
      const onCancel = vi.fn();
      const { aui, sendCommand } = mountRuntime({ onCancel });
      await ready(aui);

      act(() => sendCommand(createMessageCommand("a")));
      await waitFor(() => expect(fetchMock.requests).toHaveLength(1));
      act(() => fetchMock.servers[0]!.push(setReply("early")));
      await waitFor(() => expect(agentState(aui)).toEqual({ reply: "early" }));
      act(() => aui().thread.cancelRun());
      act(() => {
        fetchMock.servers[0]!.push(setReply("late"));
        fetchMock.servers[0]!.close();
      });

      await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(aui().thread.getState().isRunning).toBe(false),
      );
      expect(onCancel.mock.calls[0]![0].commands).toEqual([]);
      expect(agentState(aui)).toEqual({ reply: "early" });
    });
  });

  it("applies resumed operations to the retained initial state", async () => {
    const requests: RecordedRequest[] = [];
    vi.stubGlobal(
      "fetch",
      async (url: RequestInfo | URL, init: RequestInit = {}) => {
        requests.push({
          url: String(url),
          init,
          body: JSON.parse(init.body as string),
        });

        if (String(url) === "https://example.com/resume-state") {
          return Response.json({
            runId: "run-1",
            state: { message: "Hello" },
          });
        }

        return new Response(
          'aui-state:[{"type":"append-text","path":["message"],"value":" world"}]\n',
          { status: 200 },
        );
      },
    );
    const { aui } = mountRuntime({
      resumeApi: "https://example.com/resume",
      resumeStateApi: "https://example.com/resume-state",
    });
    await waitFor(() =>
      expect(
        (aui().thread.getState().extras as { sendCommand?: unknown })
          ?.sendCommand,
      ).toBeTypeOf("function"),
    );

    act(() => {
      aui().thread.importExternalState({ message: "Wrong" });
    });
    await act(async () => {
      await aui().thread.resumeRun({ parentId: null });
    });

    await waitFor(() =>
      expect(
        (aui().thread.getState().extras as { state: unknown }).state,
      ).toEqual({ message: "Hello world" }),
    );
    expect(requests.map((request) => request.url)).toEqual([
      "https://example.com/resume-state",
      "https://example.com/resume",
    ]);
    expect(requests[1]!.body).toMatchObject({ runId: "run-1" });
    expect(requests[1]!.body).not.toHaveProperty("state");
  });

  it("rejects malformed resume state responses before replay", async () => {
    const fetchMock = vi.fn(async () => Response.json({ state: {} }));
    vi.stubGlobal("fetch", fetchMock);
    const onError = vi.fn();
    const { aui } = mountRuntime({
      resumeApi: "https://example.com/resume",
      resumeStateApi: "https://example.com/resume-state",
      onError,
    });
    await waitFor(() =>
      expect(
        (aui().thread.getState().extras as { sendCommand?: unknown })
          ?.sendCommand,
      ).toBeTypeOf("function"),
    );

    await act(async () => {
      await aui().thread.resumeRun({ parentId: null });
    });

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Resume state response must contain state and runId",
        }),
        expect.anything(),
      ),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("commits a retained null state locally and omits state from the resume request", async () => {
    const requests: RecordedRequest[] = [];
    vi.stubGlobal(
      "fetch",
      async (url: RequestInfo | URL, init: RequestInit = {}) => {
        requests.push({
          url: String(url),
          init,
          body: JSON.parse(init.body as string),
        });

        if (String(url) === "https://example.com/resume-state") {
          return Response.json({ runId: "run-1", state: null });
        }

        return new Response("", { status: 200 });
      },
    );
    const { aui } = mountRuntime({
      resumeApi: "https://example.com/resume",
      resumeStateApi: "https://example.com/resume-state",
    });
    await waitFor(() =>
      expect(
        (aui().thread.getState().extras as { sendCommand?: unknown })
          ?.sendCommand,
      ).toBeTypeOf("function"),
    );

    act(() => {
      aui().thread.importExternalState({ message: "Wrong" });
    });
    await act(async () => {
      await aui().thread.resumeRun({ parentId: null });
    });

    expect(requests[1]!.body).toMatchObject({ runId: "run-1" });
    expect(requests[1]!.body).not.toHaveProperty("state");
    await waitFor(() =>
      expect(
        (aui().thread.getState().extras as { state: unknown }).state,
      ).toBeNull(),
    );
  });

  it("skips the resume without error when the state endpoint reports no active run", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const onError = vi.fn();
    const { aui } = mountRuntime({
      resumeApi: "https://example.com/resume",
      resumeStateApi: "https://example.com/resume-state",
      onError,
    });
    await waitFor(() =>
      expect(
        (aui().thread.getState().extras as { sendCommand?: unknown })
          ?.sendCommand,
      ).toBeTypeOf("function"),
    );

    act(() => {
      aui().thread.importExternalState({ message: "Kept" });
    });
    await act(async () => {
      await aui().thread.resumeRun({ parentId: null });
    });

    await waitFor(() => expect(aui().thread.getState().isRunning).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(
      (aui().thread.getState().extras as { state: unknown }).state,
    ).toEqual({ message: "Kept" });
  });

  it("keeps the retained runId over body overrides in the resume request", async () => {
    const requests: RecordedRequest[] = [];
    vi.stubGlobal(
      "fetch",
      async (url: RequestInfo | URL, init: RequestInit = {}) => {
        requests.push({
          url: String(url),
          init,
          body: JSON.parse(init.body as string),
        });

        if (String(url) === "https://example.com/resume-state") {
          return Response.json({
            runId: "run-1",
            state: { message: "Hello" },
          });
        }

        return new Response("", { status: 200 });
      },
    );
    const { aui } = mountRuntime({
      resumeApi: "https://example.com/resume",
      resumeStateApi: "https://example.com/resume-state",
      body: { state: { message: "Injected" }, runId: "bogus" },
    });
    await waitFor(() =>
      expect(
        (aui().thread.getState().extras as { sendCommand?: unknown })
          ?.sendCommand,
      ).toBeTypeOf("function"),
    );

    await act(async () => {
      await aui().thread.resumeRun({ parentId: null });
    });

    expect(requests[1]!.body["runId"]).toBe("run-1");
    expect(requests[1]!.body).not.toHaveProperty("state");
  });

  it("re-attaches runId and strips substituted state when prepareSendCommandsRequest rebuilds the body", async () => {
    const requests: RecordedRequest[] = [];
    vi.stubGlobal(
      "fetch",
      async (url: RequestInfo | URL, init: RequestInit = {}) => {
        requests.push({
          url: String(url),
          init,
          body: JSON.parse(init.body as string),
        });

        if (String(url) === "https://example.com/resume-state") {
          return Response.json({
            runId: "run-1",
            state: { message: "Hello" },
          });
        }

        return new Response("", { status: 200 });
      },
    );
    const { aui } = mountRuntime({
      resumeApi: "https://example.com/resume",
      resumeStateApi: "https://example.com/resume-state",
      prepareSendCommandsRequest: (body) => ({
        commands: body.commands,
        state: { message: "Substituted" },
        rebuilt: true,
      }),
    });
    await waitFor(() =>
      expect(
        (aui().thread.getState().extras as { sendCommand?: unknown })
          ?.sendCommand,
      ).toBeTypeOf("function"),
    );

    await act(async () => {
      await aui().thread.resumeRun({ parentId: null });
    });

    expect(requests[1]!.body).toMatchObject({ runId: "run-1", rebuilt: true });
    expect(requests[1]!.body).not.toHaveProperty("state");
  });

  it("keeps local state when the matching resume stream is rejected", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ runId: "run-1", state: { message: "Hello" } }),
      )
      .mockResolvedValueOnce(new Response("run mismatch", { status: 409 }));
    vi.stubGlobal("fetch", fetchMock);
    const onError = vi.fn();
    const { aui } = mountRuntime({
      resumeApi: "https://example.com/resume",
      resumeStateApi: "https://example.com/resume-state",
      onError,
    });
    await waitFor(() =>
      expect(
        (aui().thread.getState().extras as { sendCommand?: unknown })
          ?.sendCommand,
      ).toBeTypeOf("function"),
    );

    act(() => {
      aui().thread.importExternalState({ message: "Wrong" });
    });
    await act(async () => {
      await aui().thread.resumeRun({ parentId: null });
    });

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Status 409: run mismatch" }),
        expect.anything(),
      ),
    );
    expect(
      (aui().thread.getState().extras as { state: unknown }).state,
    ).toEqual({ message: "Wrong" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("ends a failed run on cancelRun while its onError is still pending", async () => {
    const fetchMock = installFetch();
    const onError = vi.fn(() => new Promise<void>(() => {}));
    const onCancel = vi.fn();
    const onFinish = vi.fn();
    const onResponse = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("boom");
      })
      .mockImplementation(() => {});
    const { aui, sendCommand } = mountRuntime({
      onError,
      onCancel,
      onFinish,
      onResponse,
    });
    await waitFor(() =>
      expect(
        (aui().thread.getState().extras as { sendCommand?: unknown })
          ?.sendCommand,
      ).toBeTypeOf("function"),
    );

    act(() => sendCommand(createMessageCommand("a")));
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    act(() => sendCommand(createMessageCommand("b", "b-id")));
    expect(aui().thread.getState().isRunning).toBe(true);

    act(() => aui().thread.cancelRun());
    await waitFor(() => expect(aui().thread.getState().isRunning).toBe(false));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCancel.mock.calls[0]![0].commands).toEqual([
      createMessageCommand("b", "b-id"),
    ]);

    act(() => sendCommand(createMessageCommand("c", "c-id")));
    await waitFor(() => expect(fetchMock.requests).toHaveLength(2));
    expect(fetchMock.requests[1]!.body["commands"]).toEqual([
      createMessageCommand("c", "c-id"),
    ]);
  });

  it("reports the commands queued before the failure once a cancelled run's onError settles", async () => {
    const fetchMock = installFetch();
    let failResponse!: (error: Error) => void;
    const responseFailed = new Promise<void>((_, reject) => {
      failResponse = reject;
    });
    const onResponse = vi
      .fn()
      .mockImplementationOnce(() => responseFailed)
      .mockImplementation(() => {});
    let settleOnError!: () => void;
    const onError = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          settleOnError = resolve;
        }),
    );
    const onCancel = vi.fn();
    const { aui, sendCommand } = mountRuntime({
      onError,
      onCancel,
      onResponse,
    });
    await waitFor(() =>
      expect(
        (aui().thread.getState().extras as { sendCommand?: unknown })
          ?.sendCommand,
      ).toBeTypeOf("function"),
    );

    act(() => sendCommand(createMessageCommand("a")));
    await waitFor(() => expect(onResponse).toHaveBeenCalledTimes(1));
    act(() => sendCommand(createMessageCommand("b", "b-id")));
    const boom = new Error("boom");
    await act(async () => failResponse(boom));
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    act(() => sendCommand(createMessageCommand("c", "c-id")));

    act(() => aui().thread.cancelRun());
    await waitFor(() => expect(aui().thread.getState().isRunning).toBe(false));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCancel.mock.calls[0]![0]).not.toHaveProperty("error");
    expect(onCancel.mock.calls[0]![0].commands).toEqual([
      createMessageCommand("c", "c-id"),
    ]);

    act(() => sendCommand(createMessageCommand("d", "d-id")));
    await waitFor(() => expect(fetchMock.requests).toHaveLength(2));

    await act(async () => settleOnError());
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(2));
    expect(onCancel.mock.calls[1]![0].error).toBe(boom);
    expect(onCancel.mock.calls[1]![0].commands).toEqual([
      createMessageCommand("b", "b-id"),
    ]);
    expect(fetchMock.requests[1]!.body["commands"]).toEqual([
      createMessageCommand("d", "d-id"),
    ]);
    expect(aui().thread.getState().isRunning).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("ends a resumed run on cancelRun while its replay waits for a suspended render", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          init.signal!.addEventListener("abort", () =>
            controller.error(init.signal!.reason),
          );
        },
      });
      return new Response(stream, {
        headers: { [REPLAY_CONTENT_LENGTH_HEADER]: "10" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    let released = false;
    let releaseSuspense!: () => void;
    const suspense = new Promise<void>((resolve) => {
      releaseSuspense = () => {
        released = true;
        resolve();
      };
    });
    let suspend!: () => void;
    const Suspender: FC = () => {
      const [suspended, setSuspended] = useState(false);
      suspend = () => setSuspended(true);
      if (!suspended) return null;
      if (!released) throw suspense;
      return <span data-testid="resumed" />;
    };
    const captured: { aui?: ReturnType<typeof useAui> } = {};
    const Capture: FC = () => {
      captured.aui = useAui();
      return null;
    };
    const onCancel = vi.fn();
    const App: FC = () => {
      const runtime = useAssistantTransportRuntime({
        initialState: {},
        api: "https://example.com/api",
        resumeApi: "https://example.com/resume",
        headers: {},
        converter,
        onCancel,
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Capture />
          <Suspender />
        </AssistantRuntimeProvider>
      );
    };
    const { findByTestId } = render(
      <Suspense fallback={null}>
        <App />
      </Suspense>,
    );
    const aui = () => captured.aui!;
    await waitFor(() =>
      expect(
        (aui().thread.getState().extras as { sendCommand?: unknown })
          ?.sendCommand,
      ).toBeTypeOf("function"),
    );

    act(() => suspend());
    act(() => {
      void aui().thread.resumeRun({ parentId: null });
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => {});
    act(() => aui().thread.cancelRun());

    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    expect(aui().thread.getState().isRunning).toBe(false);

    await act(async () => releaseSuspense());
    await findByTestId("resumed");
    expect(aui().thread.getState().isRunning).toBe(false);
  });
});
