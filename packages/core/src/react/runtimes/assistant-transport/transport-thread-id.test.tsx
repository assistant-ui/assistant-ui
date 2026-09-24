// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { useState, type FC } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "assistant-cloud";
import { useAui } from "@assistant-ui/store";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import type { AssistantRuntime } from "../../../runtime/api/assistant-runtime";
import type { RemoteThreadListAdapter } from "../../../runtimes/remote-thread-list/types";
import {
  deferred,
  makeAdapter,
} from "../../../tests/remote-thread-list-test-helpers";
import { useRemoteThreadListRuntime } from "../useRemoteThreadListRuntime";
import { useAssistantTransportRuntime } from "./useAssistantTransportRuntime";
import type {
  AssistantTransportOptions,
  AssistantTransportStateConverter,
} from "./types";

const API = "http://localhost/api";
const RESUME_API = "http://localhost/resume";
const RESUME_STATE_API = "http://localhost/resume-state";

const converter: AssistantTransportStateConverter<unknown> = (
  _state,
  meta,
) => ({
  messages: [],
  isRunning: meta.isSending,
});

// Shows queued messages, so an append made during a run gets a parent.
const pendingMessagesConverter: AssistantTransportStateConverter<unknown> = (
  _state,
  meta,
) => ({
  messages: meta.pendingCommands.flatMap((command, index) =>
    command.type === "add-message"
      ? [
          {
            id: `pending-${index}`,
            role: "user" as const,
            content: command.message.parts,
            attachments: [],
            createdAt: new Date(0),
            metadata: { custom: {} },
          },
        ]
      : [],
  ),
  isRunning: meta.isSending,
});

type ChatState = {
  messages?: { id: string; role: "user" | "assistant"; text: string }[];
};

// Draws the messages the backend put in the state.
const messagesConverter: AssistantTransportStateConverter<ChatState> = (
  state,
  meta,
) => ({
  messages: (state.messages ?? []).map((message) =>
    message.role === "user"
      ? {
          id: message.id,
          role: "user" as const,
          content: [{ type: "text" as const, text: message.text }],
          attachments: [],
          createdAt: new Date(0),
          metadata: { custom: {} },
        }
      : {
          id: message.id,
          role: "assistant" as const,
          content: [{ type: "text" as const, text: message.text }],
          status: { type: "complete" as const, reason: "stop" as const },
          createdAt: new Date(0),
          metadata: {
            unstable_state: null,
            unstable_annotations: [],
            unstable_data: [],
            steps: [],
            custom: {},
          },
        },
  ),
  isRunning: meta.isSending,
});

type RecordedRequest = { url: string; body: Record<string, unknown> };

const recordRequests = (respond?: (url: string) => Response | undefined) => {
  const requests: RecordedRequest[] = [];
  vi.stubGlobal("fetch", async (url: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(url), body: JSON.parse(init!.body as string) });
    return (
      respond?.(String(url)) ??
      new Response(
        new ReadableStream({ start: (controller) => controller.close() }),
        { status: 200 },
      )
    );
  });
  return requests;
};

const renderRuntime = async (useRuntime: () => AssistantRuntime) => {
  let aui: ReturnType<typeof useAui> | undefined;
  const Capture: FC = () => {
    aui = useAui();
    return null;
  };
  const App: FC = () => {
    const runtime = useRuntime();
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Capture />
      </AssistantRuntimeProvider>
    );
  };
  render(<App />);
  await waitFor(() => expect(aui).toBeDefined());
  return aui!;
};

const renderInThreadList = (
  adapter: RemoteThreadListAdapter,
  options: Partial<AssistantTransportOptions<unknown>> = {},
) =>
  renderRuntime(function useThreadListRuntime() {
    return useRemoteThreadListRuntime({
      adapter,
      runtimeHook: function useThreadRuntime() {
        return useAssistantTransportRuntime({
          initialState: {},
          api: API,
          headers: {},
          converter,
          ...options,
        });
      },
    });
  });

const deferredInitialization = () => {
  const initialization = deferred<{
    remoteId: string;
    externalId: string | undefined;
  }>();
  const adapter = makeAdapter({
    initialize: vi.fn(() => initialization.promise),
  });
  return { adapter, initialization };
};

const makeCloud = (
  threads: {
    id: string;
    title: string;
    is_archived: boolean;
    external_id: string | null;
    metadata: Record<string, unknown> | null;
    last_message_at: Date | null;
  }[] = [],
  telemetry: { enabled: boolean } = { enabled: false },
) =>
  ({
    registerSdk: vi.fn(),
    telemetry,
    events: { track: vi.fn() },
    threads: {
      list: vi.fn(async ({ is_archived }: { is_archived?: boolean }) => ({
        threads: threads.filter(
          (thread) => thread.is_archived === !!is_archived,
        ),
      })),
      create: vi.fn(async () => ({ thread_id: "cloud-thread" })),
      update: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      get: vi.fn(),
      messages: {
        list: vi.fn(async () => ({ messages: [] })),
        create: vi.fn(
          async (_threadId: string, body: { external_id?: string }) => ({
            message_id: `cloud-${body.external_id ?? "message"}`,
          }),
        ),
        update: vi.fn(async () => {}),
        feedback: vi.fn(async () => {}),
      },
    },
    runs: {
      stream: vi.fn(async () => new ReadableStream()),
    },
  }) as unknown as AssistantCloud;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("assistant transport thread id", () => {
  it("uses the Cloud thread list and posts the created Cloud thread id", async () => {
    const cloud = makeCloud([
      {
        id: "listed-thread",
        title: "Listed thread",
        is_archived: false,
        external_id: null,
        metadata: null,
        last_message_at: null,
      },
      {
        id: "archived-thread",
        title: "Archived thread",
        is_archived: true,
        external_id: null,
        metadata: null,
        last_message_at: null,
      },
    ]);
    const requests = recordRequests();
    const aui = await renderRuntime(function useCloudRuntime() {
      return useAssistantTransportRuntime({
        initialState: {},
        api: API,
        headers: {},
        converter,
        cloud,
      });
    });

    await waitFor(() =>
      expect(aui.threads.getState().threadIds).toEqual(["listed-thread"]),
    );
    expect(aui.threads.getState().archivedThreadIds).toEqual([
      "archived-thread",
    ]);

    act(() => {
      aui.threads.switchToNewThread();
      void aui.thread.append("hello");
    });

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(cloud.threads.create).toHaveBeenCalledOnce();
    expect(requests[0]!.body["threadId"]).toBe("cloud-thread");
  });

  it("copies a settled turn to the Cloud thread and stores feedback on the copy", async () => {
    const cloud = makeCloud([], { enabled: true });
    const response = deferred<Response>();
    vi.stubGlobal("fetch", async () => response.promise);
    const aui = await renderRuntime(function useCloudRuntime() {
      return useAssistantTransportRuntime<ChatState>({
        initialState: {},
        api: API,
        headers: {},
        converter: messagesConverter,
        cloud,
      });
    });

    act(() => {
      aui.threads.switchToNewThread();
      void aui.thread.append("hello");
    });
    await waitFor(() => expect(aui.thread.getState().isRunning).toBe(true));
    await act(async () => {
      response.resolve(
        new Response(
          `aui-state:${JSON.stringify([
            {
              type: "set",
              path: ["messages"],
              value: [
                { id: "user-1", role: "user", text: "hello" },
                { id: "assistant-1", role: "assistant", text: "hi" },
              ],
            },
          ])}\n`,
          { status: 200 },
        ),
      );
    });

    await waitFor(() =>
      expect(cloud.threads.messages.create).toHaveBeenCalledTimes(2),
    );
    expect(
      vi
        .mocked(cloud.threads.messages.create)
        .mock.calls.map(([threadId, body]) => [
          threadId,
          body.external_id,
          body.parent_external_id,
        ]),
    ).toEqual([
      ["cloud-thread", "user-1", undefined],
      ["cloud-thread", "assistant-1", "user-1"],
    ]);

    act(() => {
      aui.thread
        .message({ id: "assistant-1" })
        .submitFeedback({ type: "positive" });
    });

    await waitFor(() =>
      expect(cloud.threads.messages.feedback).toHaveBeenCalledWith(
        "cloud-thread",
        "cloud-assistant-1",
        { type: "positive" },
      ),
    );
  });

  it("waits for a new thread's initialization and posts its remote id", async () => {
    const { adapter, initialization } = deferredInitialization();
    const requests = recordRequests();
    const aui = await renderInThreadList(adapter);

    act(() => {
      void aui.thread.append("hello");
    });
    await waitFor(() => expect(adapter.initialize).toHaveBeenCalledOnce());
    await act(async () => {});
    expect(requests).toHaveLength(0);

    initialization.resolve({ remoteId: "remote-1", externalId: undefined });

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]!.body["threadId"]).toBe("remote-1");
  });

  it("keeps each run's parentId when a message is appended while the thread initializes", async () => {
    const { adapter, initialization } = deferredInitialization();
    const requests = recordRequests();
    const aui = await renderInThreadList(adapter, {
      converter: pendingMessagesConverter,
    });

    act(() => {
      void aui.thread.append("first");
    });
    await waitFor(() =>
      expect(aui.thread.getState().messages).not.toHaveLength(0),
    );
    const secondParentId = aui.thread.getState().messages.at(-1)!.id;
    act(() => {
      void aui.thread.append("second");
    });
    initialization.resolve({ remoteId: "remote-1", externalId: undefined });

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests.map((request) => request.body["parentId"])).toEqual([
      null,
      secondParentId,
    ]);
  });

  it("resumes a thread that was never initialized without creating it", async () => {
    const adapter = makeAdapter();
    const requests = recordRequests(() => new Response(null, { status: 204 }));
    const aui = await renderInThreadList(adapter, {
      resumeApi: RESUME_API,
      resumeStateApi: RESUME_STATE_API,
    });

    act(() => {
      void aui.thread.resumeRun({ parentId: null });
    });

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toEqual({ url: RESUME_STATE_API, body: {} });
    expect(adapter.initialize).not.toHaveBeenCalled();
  });

  it("resumes an initialized thread with its remote id", async () => {
    const adapter = makeAdapter();
    const requests = recordRequests((url) =>
      url === RESUME_STATE_API
        ? new Response(null, { status: 204 })
        : undefined,
    );
    const aui = await renderInThreadList(adapter, {
      resumeApi: RESUME_API,
      resumeStateApi: RESUME_STATE_API,
    });

    act(() => {
      void aui.thread.append("hello");
    });
    await waitFor(() => expect(requests).toHaveLength(1));
    await waitFor(() => expect(aui.thread.getState().isRunning).toBe(false));
    act(() => {
      void aui.thread.resumeRun({ parentId: null });
    });

    await waitFor(() => expect(requests).toHaveLength(2));
    const threadId = requests[0]!.body["threadId"];
    expect(threadId).toEqual(expect.any(String));
    expect(requests[1]).toEqual({ url: RESUME_STATE_API, body: { threadId } });
    expect(adapter.initialize).toHaveBeenCalledOnce();
  });

  it("sends nothing and hands the batch to onError when initialization fails", async () => {
    const adapter = makeAdapter({
      initialize: vi.fn(async () => {
        throw new Error("initialize failed");
      }),
    });
    const requests = recordRequests();
    const onError = vi.fn();
    const aui = await renderInThreadList(adapter, { onError });

    act(() => {
      void aui.thread.append("hello");
    });

    await waitFor(() => expect(onError).toHaveBeenCalledOnce());
    expect(onError).toHaveBeenCalledWith(
      new Error("initialize failed"),
      expect.objectContaining({
        commands: [expect.objectContaining({ type: "add-message" })],
      }),
    );
    expect(requests).toHaveLength(0);
  });

  it("releases a run cancelled while its thread initializes", async () => {
    const { adapter, initialization } = deferredInitialization();
    const requests = recordRequests();
    const onCancel = vi.fn();
    const aui = await renderInThreadList(adapter, { onCancel });

    act(() => {
      void aui.thread.append("first");
    });
    await waitFor(() => expect(aui.thread.getState().isRunning).toBe(true));
    act(() => {
      aui.thread.cancelRun();
    });
    await waitFor(() => expect(aui.thread.getState().isRunning).toBe(false));
    expect(onCancel).toHaveBeenCalledWith(
      expect.objectContaining({
        commands: [expect.objectContaining({ type: "add-message" })],
      }),
    );

    act(() => {
      void aui.thread.append("second");
    });
    initialization.resolve({ remoteId: "remote-1", externalId: undefined });

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]!.body).toMatchObject({
      threadId: "remote-1",
      commands: [{ message: { parts: [{ text: "second" }] } }],
    });
  });

  it("creates no thread for a run cancelled before it starts", async () => {
    const adapter = makeAdapter({
      initialize: vi.fn(async () => {
        throw new Error("initialize failed");
      }),
    });
    const requests = recordRequests();
    const aui = await renderInThreadList(adapter);

    const { sendCommand } = aui.thread.getState().extras as {
      sendCommand: (command: { type: string }) => void;
    };
    act(() => {
      sendCommand({ type: "start-session" });
      aui.thread.cancelRun();
    });

    await waitFor(() => expect(aui.thread.getState().isRunning).toBe(false));
    await act(async () => {});
    expect(adapter.initialize).not.toHaveBeenCalled();
    expect(requests).toHaveLength(0);
  });

  it("titles a thread whose first run is a custom command", async () => {
    const generateTitle = vi.fn<RemoteThreadListAdapter["generateTitle"]>(
      async () => new ReadableStream(),
    );
    const adapter = makeAdapter({ generateTitle });
    vi.stubGlobal("fetch", () => new Promise<Response>(() => {}));
    const aui = await renderInThreadList(adapter, {
      converter: pendingMessagesConverter,
    });

    const { sendCommand } = aui.thread.getState().extras as {
      sendCommand: (command: { type: string }) => void;
    };
    act(() => {
      sendCommand({ type: "start-session" });
    });
    await waitFor(() => expect(adapter.initialize).toHaveBeenCalledOnce());
    act(() => {
      void aui.thread.append("hello");
    });

    await waitFor(() => expect(generateTitle).toHaveBeenCalledOnce());
    expect(adapter.initialize).toHaveBeenCalledOnce();
  });

  it("posts the thread id from the first request with the default thread list", async () => {
    const requests = recordRequests();
    const aui = await renderRuntime(function useDefaultRuntime() {
      return useAssistantTransportRuntime({
        initialState: {},
        api: API,
        headers: {},
        converter,
      });
    });

    act(() => {
      void aui.thread.append("first");
    });
    await waitFor(() => expect(requests).toHaveLength(1));
    await waitFor(() => expect(aui.thread.getState().isRunning).toBe(false));
    act(() => {
      void aui.thread.append("second");
    });

    await waitFor(() => expect(requests).toHaveLength(2));
    const [first, second] = requests.map((request) => request.body["threadId"]);
    expect(first).toEqual(expect.any(String));
    expect(second).toBe(first);
  });

  it("keeps sending with the default thread list after its host re-renders", async () => {
    const requests = recordRequests();
    const onError = vi.fn();
    let rerenderHost!: () => void;
    const aui = await renderRuntime(function useDefaultRuntime() {
      const [, setRenders] = useState(0);
      rerenderHost = () => setRenders((renders) => renders + 1);
      return useAssistantTransportRuntime({
        initialState: {},
        api: API,
        headers: {},
        converter,
        onError,
      });
    });

    act(() => {
      void aui.thread.append("first");
    });
    await waitFor(() => expect(requests).toHaveLength(1));
    await waitFor(() => expect(aui.thread.getState().isRunning).toBe(false));
    act(() => {
      rerenderHost();
    });
    act(() => {
      void aui.thread.append("second");
    });

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(onError).not.toHaveBeenCalled();
    expect(requests[1]!.body["threadId"]).toBe(requests[0]!.body["threadId"]);
  });
});
