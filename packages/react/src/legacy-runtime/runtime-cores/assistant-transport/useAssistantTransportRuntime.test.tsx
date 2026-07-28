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

    act(() => fetchMock.servers[0]!.close());

    await waitFor(() => expect(aui().thread.getState().isRunning).toBe(false));
    await act(async () => {});
    expect(onError).not.toHaveBeenCalled();
    expect(fetchMock.requests).toHaveLength(1);
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
});
