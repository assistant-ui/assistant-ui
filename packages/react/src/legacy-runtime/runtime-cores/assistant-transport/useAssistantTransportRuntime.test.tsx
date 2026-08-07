// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAui } from "@assistant-ui/store";
import { AssistantRuntimeProvider } from "../../../context";
import {
  useAssistantTransportRuntime,
  useAssistantTransportSendCommand,
} from "./useAssistantTransportRuntime";
import type {
  AssistantTransportCommand,
  AssistantTransportOptions,
  AssistantTransportStateConverter,
} from "./types";

const converter: AssistantTransportStateConverter<unknown> = (
  _state,
  meta,
) => ({
  messages: [],
  isRunning: meta.isSending,
});

const createMessageCommand = (text: string): AssistantTransportCommand => ({
  type: "add-message",
  message: {
    role: "user",
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
    expect(fetchMock.requests[2]!.body["commands"]).toEqual([
      createMessageCommand("b"),
    ]);

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
      expect(fetchMock.requests[1]!.body["commands"]).toEqual([
        createMessageCommand("b"),
      ]);

      await act(async () => {
        fetchMock.pending[1]!.resolve(new Response("", { status: 200 }));
      });
      await waitFor(() =>
        expect(aui().thread.getState().isRunning).toBe(false),
      );
      expect(onError).toHaveBeenCalledTimes(settlement === "error" ? 1 : 0);
    },
  );

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
});
