import { describe, it, expect, vi } from "vitest";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import type {
  AssistantRuntime,
  AttachmentAdapter,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  useAssistantTool,
} from "@assistant-ui/core/react";
import { getThreadMessageText } from "@assistant-ui/core/internal";
import { useAui, useAuiState } from "@assistant-ui/store";
import { useLangGraphRuntime } from "./useLangGraphRuntime";
import { useLangGraphSend } from "./hooks";
import { mockStreamCallbackFactory } from "./testUtils";
import type { LangChainMessage } from "./types";
import type { LangGraphInterruptState } from "./useLangGraphMessages";
import { useMemo, type ReactNode } from "react";

type LoadResult = {
  messages: LangChainMessage[];
  interrupts?: LangGraphInterruptState[];
};

const textsOf = (runtime: AssistantRuntime) =>
  runtime.thread.getState().messages.map(getThreadMessageText);

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const metadataEvent = {
  event: "metadata",
  data: {
    thread_id: "123",
    run_attempt: 1,
  },
};

const infoEvent = {
  event: "info",
  data: {
    message: "Processing request",
  },
};

const errorEvent = {
  event: "error",
  data: {
    message: "Something went wrong",
  },
};

const customEvent = {
  event: "custom",
  data: {
    type: "test",
    value: "custom data",
  },
};

describe("useLangGraphRuntime", () => {
  const wrapperFactory = (runtime: AssistantRuntime) => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    );
    Wrapper.displayName = "TestWrapper";
    return Wrapper;
  };

  it("should handle metadata events", async () => {
    const onMetadata = vi.fn();

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([metadataEvent])());

    const { result: runtimeResult } = renderHook(
      () =>
        useLangGraphRuntime({
          stream: streamMock,
          eventHandlers: {
            onMetadata,
          },
        }),
      {},
    );

    const wrapper = wrapperFactory(runtimeResult.current);
    const {
      result: { current: sendResult },
    } = renderHook(() => useLangGraphSend(), {
      wrapper,
    });

    // Wait two ticks for the runtime to be fully mounted
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    act(() => {
      sendResult(
        [
          {
            type: "human",
            content: "Hello, world!",
          },
        ],
        {},
      );
    });

    await waitFor(() => {
      expect(streamMock).toHaveBeenCalled();
      expect(onMetadata).toHaveBeenCalledWith(metadataEvent.data);
    });
  });

  it("should handle info events", async () => {
    const onInfo = vi.fn();

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([infoEvent])());

    const { result: runtimeResult } = renderHook(
      () =>
        useLangGraphRuntime({
          stream: streamMock,
          eventHandlers: {
            onInfo,
          },
        }),
      {},
    );

    const wrapper = wrapperFactory(runtimeResult.current);

    const { result: sendResult } = renderHook(() => useLangGraphSend(), {
      wrapper,
    });

    // Wait a tick for the runtime to be fully mounted
    await waitFor(() => {
      expect(sendResult.current).toBeDefined();
    });

    act(() => {
      sendResult.current(
        [
          {
            type: "human",
            content: "Hello, world!",
          },
        ],
        {},
      );
    });

    await waitFor(() => {
      expect(streamMock).toHaveBeenCalled();
      expect(onInfo).toHaveBeenCalledWith(infoEvent.data);
    });
  });

  it("should handle error events", async () => {
    const onError = vi.fn();

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([errorEvent])());

    const { result: runtimeResult } = renderHook(
      () =>
        useLangGraphRuntime({
          stream: streamMock,
          eventHandlers: {
            onError,
          },
        }),
      {},
    );

    const wrapper = wrapperFactory(runtimeResult.current);

    const { result: sendResult } = renderHook(() => useLangGraphSend(), {
      wrapper,
    });

    // Wait a tick for the runtime to be fully mounted
    await waitFor(() => {
      expect(sendResult.current).toBeDefined();
    });

    act(() => {
      sendResult.current(
        [
          {
            type: "human",
            content: "Hello, world!",
          },
        ],
        {},
      );
    });

    await waitFor(() => {
      expect(streamMock).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(errorEvent.data);
    });
  });

  it("should handle custom events", async () => {
    const onCustomEvent = vi.fn();

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([customEvent])());

    const { result: runtimeResult } = renderHook(
      () =>
        useLangGraphRuntime({
          stream: streamMock,
          eventHandlers: {
            onCustomEvent,
          },
        }),
      {},
    );

    const wrapper = wrapperFactory(runtimeResult.current);

    const { result: sendResult } = renderHook(() => useLangGraphSend(), {
      wrapper,
    });

    // Wait a tick for the runtime to be fully mounted
    await waitFor(() => {
      expect(sendResult.current).toBeDefined();
    });

    act(() => {
      sendResult.current(
        [
          {
            type: "human",
            content: "Hello, world!",
          },
        ],
        {},
      );
    });

    await waitFor(() => {
      expect(streamMock).toHaveBeenCalled();
      expect(onCustomEvent).toHaveBeenCalledWith(
        customEvent.event,
        customEvent.data,
      );
    });
  });

  it("should work without any provided callbacks", async () => {
    const streamMock = vi
      .fn()
      .mockImplementation(() =>
        mockStreamCallbackFactory([
          metadataEvent,
          infoEvent,
          errorEvent,
          customEvent,
        ])(),
      );

    const { result: runtimeResult } = renderHook(
      () =>
        useLangGraphRuntime({
          stream: streamMock,
          eventHandlers: {},
        }),
      {},
    );

    const wrapper = wrapperFactory(runtimeResult.current);

    const { result: sendResult } = renderHook(() => useLangGraphSend(), {
      wrapper,
    });

    // Wait a tick for the runtime to be fully mounted
    await waitFor(() => {
      expect(sendResult.current).toBeDefined();
    });

    act(() => {
      sendResult.current(
        [
          {
            type: "human",
            content: "Hello, world!",
          },
        ],
        {},
      );
    });

    await waitFor(() => {
      expect(streamMock).toHaveBeenCalled();
    });

    // Should not throw any errors even when events are processed without handlers
    expect(runtimeResult.current).toBeDefined();
  });

  it("serializes attachment file content in flat LangGraph format", async () => {
    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([])());

    const attachmentAdapter: AttachmentAdapter = {
      accept: "application/pdf",
      add: async ({ file }) => ({
        id: "pending-file-1",
        type: "document",
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      }),
      remove: async () => {},
      send: async (attachment) => ({
        ...attachment,
        status: { type: "complete" },
        content: [
          {
            type: "file",
            filename: attachment.name,
            data: "ZmFrZS1wZGY=",
            mimeType: attachment.contentType ?? "application/pdf",
          },
        ],
      }),
    };

    const { result: runtimeResult } = renderHook(
      () =>
        useLangGraphRuntime({
          stream: streamMock,
          adapters: {
            attachments: attachmentAdapter,
          },
        }),
      {},
    );

    const wrapper = wrapperFactory(runtimeResult.current);
    const { result: auiResult } = renderHook(() => useAui(), { wrapper });

    await act(async () => {
      await auiResult.current
        .composer()
        .addAttachment(
          new File(["fake-pdf"], "document.pdf", { type: "application/pdf" }),
        );
      await auiResult.current.composer.send();
    });

    await waitFor(() => {
      expect(streamMock).toHaveBeenCalledTimes(1);
    });

    const sentMessages = streamMock.mock.calls[0]?.[0];
    expect(sentMessages).toMatchObject([
      {
        type: "human",
        content: [
          { type: "text", text: " " },
          {
            type: "file",
            data: "ZmFrZS1wZGY=",
            mime_type: "application/pdf",
            metadata: { filename: "document.pdf" },
            source_type: "base64",
          },
        ],
      },
    ]);
    expect(sentMessages?.[0]?.content?.[1]).not.toHaveProperty("file");

    // The wire human message must not carry the structured attachments field;
    // only flattened content reaches the stream.
    expect(sentMessages?.[0]).not.toHaveProperty("attachments");

    // The local user message state, however, must expose the CompleteAttachment[]
    // returned by the adapter so MessagePrimitive.Attachments can render them.
    await waitFor(() => {
      const userMessage = auiResult.current
        .thread()
        .getState()
        .messages.find((m) => m.role === "user");
      expect(userMessage?.attachments).toHaveLength(1);
    });

    const userMessage = auiResult.current
      .thread()
      .getState()
      .messages.find((m) => m.role === "user");
    expect(userMessage?.attachments?.[0]).toMatchObject({
      id: "pending-file-1",
      type: "document",
      name: "document.pdf",
      status: { type: "complete" },
    });
    expect(userMessage?.attachments?.[0]?.content).toEqual([
      {
        type: "file",
        filename: "document.pdf",
        data: "ZmFrZS1wZGY=",
        mimeType: "application/pdf",
      },
    ]);

    expect(userMessage?.content).toHaveLength(1);
    expect(userMessage?.content?.[0]).toMatchObject({
      type: "text",
      text: " ",
    });
  });

  it("should use unstable_threadListAdapter in place of the cloud adapter", async () => {
    const list = vi.fn(async () => ({
      threads: [
        {
          status: "regular" as const,
          remoteId: "lg-thread-1",
          externalId: "lg-thread-1",
          title: "Existing LangGraph thread",
        },
      ],
    }));
    const adapter: RemoteThreadListAdapter = {
      list,
      initialize: vi.fn(async () => ({
        remoteId: "lg-thread-1",
        externalId: "lg-thread-1",
      })),
      rename: vi.fn(async () => {}),
      archive: vi.fn(async () => {}),
      unarchive: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      generateTitle: vi.fn(async () => new ReadableStream()),
      fetch: vi.fn(async () => ({
        status: "regular" as const,
        remoteId: "lg-thread-1",
        externalId: "lg-thread-1",
      })),
    };

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([])());

    renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock,
        unstable_threadListAdapter: adapter,
      }),
    );

    await waitFor(() => {
      expect(list).toHaveBeenCalled();
    });
  });

  const makeThreadListAdapter = (): RemoteThreadListAdapter => ({
    list: vi.fn(async () => ({
      threads: [
        {
          status: "regular" as const,
          remoteId: "lg-thread-1",
          externalId: "lg-thread-1",
          title: "Existing LangGraph thread",
        },
      ],
    })),
    initialize: vi.fn(async () => ({
      remoteId: "lg-thread-1",
      externalId: "lg-thread-1",
    })),
    rename: vi.fn(async () => {}),
    archive: vi.fn(async () => {}),
    unarchive: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    generateTitle: vi.fn(async () => new ReadableStream()),
    fetch: vi.fn(async () => ({
      status: "regular" as const,
      remoteId: "lg-thread-1",
      externalId: "lg-thread-1",
    })),
  });

  it("should set thread.isLoading to true while load is pending and false after it resolves", async () => {
    const pending = deferred<LoadResult>();
    const load = vi.fn(() => pending.promise);

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([])());

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock,
        load,
        unstable_threadListAdapter: makeThreadListAdapter(),
      }),
    );

    const wrapper = wrapperFactory(runtimeResult.current);
    const { result: isLoadingResult } = renderHook(
      () => useAuiState((s) => s.thread.isLoading),
      { wrapper },
    );

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });

    await waitFor(() =>
      expect(load).toHaveBeenCalledWith("lg-thread-1", {
        signal: expect.any(AbortSignal),
      }),
    );
    await waitFor(() => expect(isLoadingResult.current).toBe(true));

    await act(async () => {
      pending.resolve({ messages: [] });
    });

    await waitFor(() => expect(isLoadingResult.current).toBe(false));
  });

  it("keeps the streamed version when the load returns the same message id", async () => {
    const pendingLoad = deferred<LoadResult>();
    const load = vi.fn(() => pendingLoad.promise);
    const streamMock = vi.fn(async function* () {
      yield {
        event: "messages/partial",
        data: [{ id: "shared", type: "ai" as const, content: "fresh" }],
      };
    });

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock as never,
        load,
        unstable_threadListAdapter: makeThreadListAdapter(),
      }),
    );
    const wrapper = wrapperFactory(runtimeResult.current);
    renderHook(() => useAuiState((s) => s.thread.isLoading), { wrapper });

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    await act(async () => {
      runtimeResult.current.thread.append("go");
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    // the snapshot predates the run, so its copy of `shared` is the stale one
    await act(async () => {
      pendingLoad.resolve({
        messages: [{ id: "shared", type: "ai" as const, content: "stale" }],
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    const texts = runtimeResult.current.thread.getState().messages.map((m) =>
      m.content
        .filter((p) => p.type === "text")
        .map((p) => (p as { text: string }).text)
        .join(""),
    );
    expect(texts).toEqual(["go", "fresh"]);
  });

  it("keeps an interrupt the racing run raised when the load carries none", async () => {
    const pendingLoad = deferred<LoadResult>();
    const load = vi.fn(() => pendingLoad.promise);
    const streamMock = vi.fn(async function* () {
      yield {
        event: "updates",
        data: { __interrupt__: [{ value: "approval-needed" }] },
      };
    });

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock as never,
        load,
        unstable_threadListAdapter: makeThreadListAdapter(),
      }),
    );
    const wrapper = wrapperFactory(runtimeResult.current);
    renderHook(() => useAuiState((s) => s.thread.isLoading), { wrapper });

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    await act(async () => {
      runtimeResult.current.thread.append("go");
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    await act(async () => {
      pendingLoad.resolve({ messages: [] });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    const extras = runtimeResult.current.thread.getState().extras as {
      interrupt?: unknown;
    };
    expect(extras.interrupt).toEqual({ value: "approval-needed" });
  });

  it("preserves a send that starts while the initial load is pending", async () => {
    const pending = deferred<LoadResult>();
    const streamGate = deferred<void>();
    const load = vi.fn(() => pending.promise);
    const streamMock = vi.fn(async function* () {
      await streamGate.promise;
      yield {
        event: "messages/complete" as const,
        data: [{ id: "reply-1", type: "ai" as const, content: "reply" }],
      };
    });

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock,
        load,
        unstable_threadListAdapter: makeThreadListAdapter(),
      }),
    );
    const wrapper = wrapperFactory(runtimeResult.current);
    const { result: auiResult } = renderHook(() => useAui(), { wrapper });

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });
    await waitFor(() => expect(load).toHaveBeenCalled());

    await act(async () => {
      auiResult.current.composer.setText("sent during load");
      auiResult.current.composer.send();
    });
    await waitFor(() =>
      expect(
        auiResult.current.thread
          .getState()
          .messages.flatMap((message) =>
            message.parts.flatMap((part) =>
              part.type === "text" ? [part.text] : [],
            ),
          ),
      ).toContain("sent during load"),
    );

    await act(async () => {
      pending.resolve({
        messages: [{ id: "history-1", type: "human", content: "history" }],
      });
    });
    await waitFor(() =>
      expect(auiResult.current.thread.getState().isLoading).toBe(false),
    );

    await act(async () => {
      streamGate.resolve();
    });
    await waitFor(() =>
      expect(auiResult.current.thread.getState().isRunning).toBe(false),
    );

    expect(
      auiResult.current.thread
        .getState()
        .messages.flatMap((message) =>
          message.parts.flatMap((part) =>
            part.type === "text" ? [part.text] : [],
          ),
        ),
    ).toEqual(["history", "sent during load", "reply"]);
  });

  it("reports loading on the first frame of a controlled thread", async () => {
    const pending = deferred<LoadResult>();
    const load = vi.fn(() => pending.promise);
    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([])());
    const adapter = makeThreadListAdapter();
    const frames: Array<{ threadId: string; isLoading: boolean }> = [];

    const LoadingProbe = () => {
      const threadId = useAuiState((s) => s.threads.mainThreadId);
      const isLoading = useAuiState((s) => s.thread.isLoading);
      frames.push({ threadId, isLoading });
      return null;
    };

    const TestRuntime = () => {
      const runtime = useLangGraphRuntime({
        stream: streamMock,
        load,
        unstable_threadListAdapter: adapter,
        threadId: "lg-thread-1",
      });

      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <LoadingProbe />
        </AssistantRuntimeProvider>
      );
    };

    const { unmount } = render(<TestRuntime />);

    await waitFor(() =>
      expect(load).toHaveBeenCalledWith("lg-thread-1", {
        signal: expect.any(AbortSignal),
      }),
    );

    const firstThreadFrame = frames.find(
      ({ threadId }) => threadId === "lg-thread-1",
    );
    expect(firstThreadFrame?.isLoading).toBe(true);

    unmount();
  });

  it("should reset thread.isLoading to false and surface the error when load rejects", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    const loadError = new Error("failed to load thread");
    const load = vi.fn(() => Promise.reject<LoadResult>(loadError));

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([])());

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock,
        load,
        unstable_threadListAdapter: makeThreadListAdapter(),
      }),
    );

    const wrapper = wrapperFactory(runtimeResult.current);
    const { result: isLoadingResult } = renderHook(
      () => useAuiState((s) => s.thread.isLoading),
      { wrapper },
    );

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });

    await waitFor(() =>
      expect(load).toHaveBeenCalledWith("lg-thread-1", {
        signal: expect.any(AbortSignal),
      }),
    );
    await waitFor(() => expect(isLoadingResult.current).toBe(false));

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "useLangGraphRuntime: load handler rejected",
      loadError,
    );
    consoleWarnSpy.mockRestore();
  });

  it("reloadMainThread re-runs load in place: composer draft survives, no loading flash, interrupts refreshed", async () => {
    const loadResults: LoadResult[] = [
      { messages: [] },
      {
        messages: [],
        interrupts: [{ value: "approval-needed" } as LangGraphInterruptState],
      },
    ];
    const load = vi.fn(async () => loadResults[load.mock.calls.length - 1]!);

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([])());

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock,
        load,
        unstable_threadListAdapter: makeThreadListAdapter(),
      }),
    );

    const wrapper = wrapperFactory(runtimeResult.current);
    const { result: isLoadingResult } = renderHook(
      () => useAuiState((s) => s.thread.isLoading),
      { wrapper },
    );

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(isLoadingResult.current).toBe(false));

    // a remount would destroy the runtime and this draft with it
    act(() => {
      runtimeResult.current.thread.composer.setText("half-typed draft");
    });

    const loadingFrames: boolean[] = [];
    const unsubscribe = runtimeResult.current.thread.subscribe(() => {
      loadingFrames.push(runtimeResult.current.thread.getState().isLoading);
    });

    await act(async () => {
      await runtimeResult.current.threads.reloadMainThread();
    });
    unsubscribe();

    expect(load).toHaveBeenCalledTimes(2);
    expect(runtimeResult.current.thread.composer.getState().text).toBe(
      "half-typed draft",
    );
    // existing messages stay rendered while fresh state is fetched
    expect(loadingFrames.every((v) => v === false)).toBe(true);
    // fresh interrupts from the second load are surfaced
    await waitFor(() => {
      const extras = runtimeResult.current.thread.getState().extras as {
        interrupt?: unknown;
      };
      expect(extras.interrupt).toEqual({ value: "approval-needed" });
    });
  });

  it("reloadMainThread leaves a run alone when the app opted out of cancellation", async () => {
    const load = vi
      .fn<() => Promise<LoadResult>>()
      .mockImplementationOnce(async () => ({ messages: [] }))
      .mockImplementationOnce(async () => ({ messages: [] }));

    const firstChunkSent = deferred<void>();
    let streamAborted = false;
    const streamMock = vi.fn(
      (_messages: unknown, { abortSignal }: { abortSignal: AbortSignal }) =>
        (async function* () {
          abortSignal.addEventListener("abort", () => {
            streamAborted = true;
          });
          yield {
            event: "messages/complete",
            data: [{ type: "ai" as const, id: "run-1", content: "chunk one" }],
          };
          firstChunkSent.resolve();
          await new Promise((resolve) => setTimeout(resolve, 50));
        })(),
    );

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock as never,
        load,
        unstable_threadListAdapter: makeThreadListAdapter(),
      }),
    );
    const wrapper = wrapperFactory(runtimeResult.current);
    renderHook(() => useAuiState((s) => s.thread.isLoading), { wrapper });

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    await act(async () => {
      runtimeResult.current.thread.append("start a run");
      await firstChunkSent.promise;
    });

    await act(async () => {
      await runtimeResult.current.threads.reloadMainThread();
    });

    expect(streamAborted).toBe(false);
    // the refetch still happened, it just did not take the run down with it
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("reloadMainThread leaves an in-flight run alone and still keeps the refetch", async () => {
    const load = vi
      .fn<() => Promise<LoadResult>>()
      .mockImplementationOnce(async () => ({ messages: [] }))
      .mockImplementationOnce(async () => ({
        messages: [
          { type: "ai" as const, id: "server-1", content: "refetched" },
        ],
      }));

    // a stream gated between two chunks so the reload lands mid-run
    const firstChunkSent = deferred<void>();
    const releaseSecondChunk = deferred<void>();
    let streamAborted = false;
    const streamMock = vi.fn(
      (_messages: unknown, { abortSignal }: { abortSignal: AbortSignal }) =>
        (async function* () {
          abortSignal.addEventListener("abort", () => {
            streamAborted = true;
          });
          yield {
            event: "messages/complete",
            data: [{ type: "ai" as const, id: "run-1", content: "chunk one" }],
          };
          firstChunkSent.resolve();
          await releaseSecondChunk.promise;
          if (abortSignal.aborted) return;
          yield {
            event: "messages/complete",
            data: [{ type: "ai" as const, id: "run-2", content: "chunk two" }],
          };
        })(),
    );

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock as never,
        load,
        unstable_threadListAdapter: makeThreadListAdapter(),
        unstable_allowCancellation: true,
      }),
    );

    const wrapper = wrapperFactory(runtimeResult.current);
    renderHook(() => useAuiState((s) => s.thread.isLoading), { wrapper });

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    // start a run and let it stream its first chunk
    await act(async () => {
      runtimeResult.current.thread.append("start a run");
      await firstChunkSent.promise;
    });

    await act(async () => {
      await runtimeResult.current.threads.reloadMainThread();
    });
    // the run is not the refetch's business, and the merge does not need it
    // stopped to keep what the refetch brought back
    expect(streamAborted).toBe(false);

    // release the gated run; both its chunk and the refetch survive
    await act(async () => {
      releaseSecondChunk.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const messageTexts = textsOf(runtimeResult.current).join(" | ");
    expect(messageTexts).toContain("refetched");
    expect(messageTexts).toContain("chunk two");
  });

  it("reloadMainThread keeps state staged via setState for the next send", async () => {
    const load = vi
      .fn<() => Promise<LoadResult>>()
      .mockImplementation(async () => ({ messages: [] }));

    const sentConfigs: unknown[] = [];
    const streamMock = vi.fn((_messages: unknown, config: unknown) => {
      sentConfigs.push(config);
      return mockStreamCallbackFactory([])();
    });

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock as never,
        load,
        unstable_threadListAdapter: makeThreadListAdapter(),
      }),
    );

    const wrapper = wrapperFactory(runtimeResult.current);
    renderHook(() => useAuiState((s) => s.thread.isLoading), { wrapper });

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    // stage state for the next send
    act(() => {
      (
        runtimeResult.current.thread.getState().extras as {
          setState: (next: Record<string, unknown>) => void;
        }
      ).setState({ staged_for_next_send: true });
    });

    // a background-poll reload must not discard it
    await act(async () => {
      await runtimeResult.current.threads.reloadMainThread();
    });

    await act(async () => {
      runtimeResult.current.thread.append("next send");
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => expect(sentConfigs.length).toBeGreaterThan(0));
    expect(sentConfigs[0]).toMatchObject({
      state: { staged_for_next_send: true },
    });
  });

  it("a refetch survives a stream that ignores its abortSignal, without stopping it", async () => {
    const load = vi
      .fn<() => Promise<LoadResult>>()
      .mockImplementationOnce(async () => ({ messages: [] }))
      .mockImplementationOnce(async () => ({
        messages: [
          { type: "ai" as const, id: "server-1", content: "refetched" },
        ],
      }));

    // deliberately never checks abortSignal: the refetch has to hold without
    // the stream cooperating, and without being cancelled
    const firstChunkSent = deferred<void>();
    const releaseSecondChunk = deferred<void>();
    const streamMock = vi.fn(() =>
      (async function* () {
        yield {
          event: "messages/complete",
          data: [{ type: "ai" as const, id: "run-1", content: "chunk one" }],
        };
        firstChunkSent.resolve();
        await releaseSecondChunk.promise;
        yield {
          event: "messages/complete",
          data: [{ type: "ai" as const, id: "run-2", content: "chunk two" }],
        };
      })(),
    );

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock as never,
        load,
        unstable_threadListAdapter: makeThreadListAdapter(),
        unstable_allowCancellation: true,
      }),
    );

    const wrapper = wrapperFactory(runtimeResult.current);
    renderHook(() => useAuiState((s) => s.thread.isLoading), { wrapper });

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    await act(async () => {
      runtimeResult.current.thread.append("start a run");
      await firstChunkSent.promise;
    });

    await act(async () => {
      await runtimeResult.current.threads.reloadMainThread();
    });

    await act(async () => {
      releaseSecondChunk.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // consecutive assistant messages render as one, so assert on the text
    const messageTexts = textsOf(runtimeResult.current).join(" | ");
    // the load boundary keeps the refetch without stopping the run, so the
    // chunk that arrives after it is kept too rather than discarded
    expect(messageTexts).toContain("refetched");
    expect(messageTexts).toContain("chunk two");
  });

  it("unmount aborts a reload that is still in flight", async () => {
    const reloadPending = deferred<LoadResult>();
    const load = vi
      .fn<() => Promise<LoadResult>>()
      .mockImplementationOnce(async () => ({ messages: [] }))
      .mockImplementationOnce(() => reloadPending.promise);

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([])());

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock,
        load,
        unstable_threadListAdapter: makeThreadListAdapter(),
      }),
    );

    // the load effect lives in the binder inside the provider tree, so the
    // provider tree is what must unmount (same shape as the initial-load test)
    const wrapper = wrapperFactory(runtimeResult.current);
    const { unmount } = renderHook(
      () => useAuiState((s) => s.thread.isLoading),
      { wrapper },
    );

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    act(() => {
      runtimeResult.current.threads.reloadMainThread().catch(() => {});
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    const reloadSignal = (
      load.mock.calls[1] as unknown as [string, { signal: AbortSignal }]
    )[1].signal;
    expect(reloadSignal.aborted).toBe(false);

    unmount();

    expect(reloadSignal.aborted).toBe(true);
    reloadPending.resolve({ messages: [] });
  });

  it("reloadMainThread rejects when the reload's load fails, while an initial load only warns", async () => {
    const loadError = new Error("refetch failed");
    const load = vi
      .fn<() => Promise<LoadResult>>()
      .mockImplementationOnce(async () => ({ messages: [] }))
      .mockImplementationOnce(() => Promise.reject(loadError));

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([])());

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock,
        load,
        unstable_threadListAdapter: makeThreadListAdapter(),
      }),
    );

    const wrapper = wrapperFactory(runtimeResult.current);
    renderHook(() => useAuiState((s) => s.thread.isLoading), { wrapper });

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    await act(async () => {
      await expect(
        runtimeResult.current.threads.reloadMainThread(),
      ).rejects.toThrow("refetch failed");
    });
  });

  it("reloadMainThread preserves LangGraph graph state (values), and touches nothing when the reload rejects", async () => {
    const load = vi
      .fn<() => Promise<LoadResult>>()
      .mockImplementationOnce(async () => ({ messages: [] }))
      .mockImplementationOnce(async () => ({ messages: [] }))
      .mockImplementationOnce(() => Promise.reject(new Error("boom")));

    const streamMock = vi
      .fn()
      .mockImplementation(() =>
        mockStreamCallbackFactory([
          { event: "values", data: { my_graph_field: "established" } },
        ])(),
      );

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock,
        load,
        unstable_threadListAdapter: makeThreadListAdapter(),
      }),
    );

    const wrapper = wrapperFactory(runtimeResult.current);
    renderHook(() => useAuiState((s) => s.thread.isLoading), { wrapper });

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    // establish graph state via a run's values event
    await act(async () => {
      runtimeResult.current.thread.append("run once");
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const stateOf = () =>
      (
        runtimeResult.current.thread.getState().extras as {
          state?: Record<string, unknown>;
        }
      ).state;
    await waitFor(() =>
      expect(stateOf()).toEqual({ my_graph_field: "established" }),
    );

    await act(async () => {
      await runtimeResult.current.threads.reloadMainThread();
    });
    expect(stateOf()).toEqual({ my_graph_field: "established" });

    await act(async () => {
      await expect(
        runtimeResult.current.threads.reloadMainThread(),
      ).rejects.toThrow("boom");
    });
    expect(stateOf()).toEqual({ my_graph_field: "established" });
  });

  it("a newer reload aborts the in-flight one so stale results never land", async () => {
    const second = deferred<LoadResult>();
    const third = deferred<LoadResult>();
    const load = vi
      .fn<
        (
          id: string,
          opts?: { signal: AbortSignal } | undefined,
        ) => Promise<LoadResult>
      >()
      .mockImplementationOnce(async () => ({ messages: [] }))
      .mockImplementationOnce(() => second.promise)
      .mockImplementationOnce(() => third.promise);

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([])());

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock,
        load,
        unstable_threadListAdapter: makeThreadListAdapter(),
      }),
    );

    const wrapper = wrapperFactory(runtimeResult.current);
    renderHook(() => useAuiState((s) => s.thread.isLoading), { wrapper });

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    let firstReload!: Promise<void>;
    let secondReload!: Promise<void>;
    act(() => {
      firstReload = runtimeResult.current.threads.reloadMainThread();
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    const firstSignal = load.mock.calls[1]![1]!.signal;

    act(() => {
      secondReload = runtimeResult.current.threads.reloadMainThread();
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(3));

    expect(firstSignal.aborted).toBe(true);
    expect(load.mock.calls[2]![1]!.signal.aborted).toBe(false);

    // the stale result resolving must not clobber the newer load's outcome
    await act(async () => {
      second.resolve({
        messages: [],
        interrupts: [{ value: "stale" } as LangGraphInterruptState],
      });
      third.resolve({
        messages: [],
        interrupts: [{ value: "fresh" } as LangGraphInterruptState],
      });
      await Promise.all([firstReload, secondReload]);
    });

    const extras = runtimeResult.current.thread.getState().extras as {
      interrupt?: unknown;
    };
    expect(extras.interrupt).toEqual({ value: "fresh" });
  });

  it("reloadMainThread defers to an initial load that is still in flight", async () => {
    const pending = deferred<LoadResult>();
    const load = vi.fn(() => pending.promise);

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([])());

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock,
        load,
        unstable_threadListAdapter: makeThreadListAdapter(),
      }),
    );
    const wrapper = wrapperFactory(runtimeResult.current);
    renderHook(() => useAuiState((s) => s.thread.isLoading), { wrapper });

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    // the initial load is already fetching what a refetch would ask for, and
    // the refetch settles with it rather than resolving ahead of it
    let refetch!: Promise<void>;
    act(() => {
      refetch = runtimeResult.current.threads.reloadMainThread();
    });
    let refetchSettled = false;
    void refetch.then(() => {
      refetchSettled = true;
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(load).toHaveBeenCalledTimes(1);
    expect(refetchSettled).toBe(false);

    await act(async () => {
      pending.resolve({
        messages: [
          { type: "ai" as const, id: "server-1", content: "persisted" },
        ],
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await refetch;
    });
    expect(refetchSettled).toBe(true);
    expect(runtimeResult.current.thread.getState().isLoading).toBe(false);
    expect(textsOf(runtimeResult.current)).toContain("persisted");
  });

  it("a send while the initial load is pending leaves the history and loading flag intact", async () => {
    const pending = deferred<LoadResult>();
    const load = vi.fn(() => pending.promise);

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([])());

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock,
        load,
        unstable_threadListAdapter: makeThreadListAdapter(),
      }),
    );

    const wrapper = wrapperFactory(runtimeResult.current);
    renderHook(() => useAuiState((s) => s.thread.isLoading), { wrapper });

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    expect(runtimeResult.current.thread.getState().isLoading).toBe(true);

    // the composer is live during a load, so this is reachable from the UI
    await act(async () => {
      void runtimeResult.current.thread.append("hello");
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      pending.resolve({
        messages: [
          { type: "ai" as const, id: "server-1", content: "persisted" },
        ],
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // aborting the initial load here would strand both of these
    expect(runtimeResult.current.thread.getState().isLoading).toBe(false);
    expect(textsOf(runtimeResult.current)).toContain("persisted");
  });

  it("should abort the pending load when the runtime unmounts", async () => {
    const pending = deferred<LoadResult>();
    const load = vi.fn(() => pending.promise);

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([])());

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock,
        load,
        unstable_threadListAdapter: makeThreadListAdapter(),
      }),
    );

    const wrapper = wrapperFactory(runtimeResult.current);
    const { unmount } = renderHook(
      () => useAuiState((s) => s.thread.isLoading),
      { wrapper },
    );

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });

    await waitFor(() =>
      expect(load).toHaveBeenCalledWith("lg-thread-1", {
        signal: expect.any(AbortSignal),
      }),
    );
    const signal = (
      load.mock.calls[0] as unknown as [string, { signal: AbortSignal }]
    )?.[1]?.signal;
    expect(signal?.aborted).toBe(false);

    unmount();

    expect(signal?.aborted).toBe(true);
  });

  it("forwards onThreadIdChange so the settled remote thread id reaches the consumer", async () => {
    const onThreadIdChange = vi.fn();
    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([])());

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock,
        unstable_threadListAdapter: makeThreadListAdapter(),
        onThreadIdChange,
      }),
    );

    const wrapper = wrapperFactory(runtimeResult.current);
    renderHook(() => useAuiState((s) => s.threads.mainThreadId), { wrapper });

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });

    await waitFor(() =>
      expect(onThreadIdChange).toHaveBeenLastCalledWith("lg-thread-1"),
    );
  });

  it("forwards threadId so the runtime switches to the specified thread", async () => {
    const fetch = vi.fn(async (threadId: string) => ({
      status: "regular" as const,
      remoteId: threadId,
      externalId: threadId,
    }));
    // Empty list so switching has to fetch the routed thread instead of finding
    // it already loaded.
    const adapter: RemoteThreadListAdapter = {
      ...makeThreadListAdapter(),
      list: vi.fn(async () => ({ threads: [] })),
      fetch,
    };
    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([])());

    renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock,
        unstable_threadListAdapter: adapter,
        threadId: "lg-thread-1",
      }),
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("lg-thread-1"));
  });

  it("invokes user-provided create when stream calls initialize without cloud", async () => {
    const userCreate = vi.fn(async () => ({ externalId: "lg-thread-xyz" }));

    let initResult:
      | { remoteId: string; externalId: string | undefined }
      | undefined;
    const streamMock = vi.fn().mockImplementation(async function* (
      _messages: LangChainMessage[],
      config: {
        initialize: () => Promise<{
          remoteId: string;
          externalId: string | undefined;
        }>;
      },
    ) {
      initResult = await config.initialize();
    });

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock,
        create: userCreate,
      }),
    );

    const wrapper = wrapperFactory(runtimeResult.current);
    const {
      result: { current: sendResult },
    } = renderHook(() => useLangGraphSend(), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    act(() => {
      sendResult([{ type: "human", content: "Hello, world!" }], {});
    });

    await waitFor(() => {
      expect(streamMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(userCreate).toHaveBeenCalled();
    });

    expect(initResult?.externalId).toBe("lg-thread-xyz");
  });

  describe("unstable_enableMessageQueue", () => {
    it("queues a message sent while running and drains it once the run settles", async () => {
      const gate = deferred<void>();
      const streamMock = vi.fn(async function* (_messages: LangChainMessage[]) {
        // hold the first run open so the second send is queued
        if (streamMock.mock.calls.length === 1) {
          await gate.promise;
        }
      });

      const { result: runtimeResult } = renderHook(
        () =>
          useLangGraphRuntime({
            stream: streamMock,
            unstable_enableMessageQueue: true,
          }),
        {},
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      const send = async (text: string) => {
        await act(async () => {
          auiResult.current.composer.setText(text);
          auiResult.current.composer.send();
        });
      };

      await send("first");
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(true),
      );

      // sending while running queues instead of starting a second run
      await send("second");
      expect(streamMock).toHaveBeenCalledTimes(1);
      expect(
        auiResult.current
          .thread()
          .composer()
          .getState()
          .queue.map((q) => q.prompt),
      ).toEqual(["second"]);
      expect(auiResult.current.thread.getState().capabilities.queue).toBe(true);

      // settling the first run drains the queued message
      await act(async () => {
        gate.resolve();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
      expect(auiResult.current.thread.composer().getState().queue).toEqual([]);

      const secondRun = streamMock.mock.calls[1]?.[0];
      expect(secondRun).toMatchObject([{ type: "human", content: "second" }]);
    });

    it("drains two queued items in separate runs, not all at once", async () => {
      const releases: Array<() => void> = [];
      const streamMock = vi.fn(async function* (_messages: LangChainMessage[]) {
        await new Promise<void>((resolve) => {
          releases.push(resolve);
        });
      });

      const { result: runtimeResult } = renderHook(
        () =>
          useLangGraphRuntime({
            stream: streamMock,
            unstable_enableMessageQueue: true,
          }),
        {},
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      const send = async (text: string) => {
        await act(async () => {
          auiResult.current.composer.setText(text);
          auiResult.current.composer.send();
          await new Promise((r) => setTimeout(r, 0));
        });
      };

      await send("first");
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));

      // queue two while the first run is held open
      await send("a");
      await send("b");
      expect(
        auiResult.current
          .thread()
          .composer()
          .getState()
          .queue.map((q) => q.prompt),
      ).toEqual(["a", "b"]);

      // releasing only the first run flushes "a" (run #2); "b" stays queued
      await act(async () => {
        releases[0]!();
        await new Promise((r) => setTimeout(r, 0));
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(streamMock).toHaveBeenCalledTimes(2);
      expect(
        auiResult.current
          .thread()
          .composer()
          .getState()
          .queue.map((q) => q.prompt),
      ).toEqual(["b"]);

      // releasing the second run flushes "b" (run #3)
      await act(async () => {
        releases[1]!();
        await new Promise((r) => setTimeout(r, 0));
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(streamMock).toHaveBeenCalledTimes(3);
      expect(auiResult.current.thread.composer().getState().queue).toEqual([]);
    });

    it("handles a queued run rejection", async () => {
      const gate = deferred<void>();
      const streamMock = vi.fn(async function* (_messages: LangChainMessage[]) {
        if (streamMock.mock.calls.length === 1) {
          await gate.promise;
          return;
        }
        throw new Error("queued run failed");
      });
      const onUnhandledRejection = vi.fn();
      process.on("unhandledRejection", onUnhandledRejection);

      try {
        const { result: runtimeResult } = renderHook(
          () =>
            useLangGraphRuntime({
              stream: streamMock,
              unstable_enableMessageQueue: true,
            }),
          {},
        );
        const wrapper = wrapperFactory(runtimeResult.current);
        const { result: auiResult } = renderHook(() => useAui(), { wrapper });

        const send = async (text: string) => {
          await act(async () => {
            auiResult.current.composer.setText(text);
            auiResult.current.composer.send();
          });
        };

        await send("first");
        await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
        await send("second");

        await act(async () => {
          gate.resolve();
        });
        await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(onUnhandledRejection).not.toHaveBeenCalled();
      } finally {
        process.off("unhandledRejection", onUnhandledRejection);
      }
    });

    it("does not expose the queue capability when the flag is off", async () => {
      const streamMock = vi.fn(async function* () {});
      const { result: runtimeResult } = renderHook(
        () => useLangGraphRuntime({ stream: streamMock }),
        {},
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      expect(auiResult.current.thread.getState().capabilities.queue).toBe(
        false,
      );
    });
  });

  describe("run serialization", () => {
    const toolCallEvent = {
      event: "messages/complete",
      data: [
        {
          id: "ai-1",
          type: "ai" as const,
          content: "",
          tool_calls: [
            { id: "tc-1", name: "get_weather", args: { city: "sf" } },
          ],
        },
      ],
    };

    const waitForToolCallPart = async (aui: ReturnType<typeof useAui>) => {
      await waitFor(() => {
        const parts = aui.thread
          .getState()
          .messages.flatMap((m): readonly unknown[] => m.content);
        expect(parts).toContainEqual(
          expect.objectContaining({ type: "tool-call", toolCallId: "tc-1" }),
        );
      });
    };

    const addToolResult = (runtime: AssistantRuntime, result: unknown) => {
      act(() => {
        runtime.thread
          .getMessageById("ai-1")
          .getMessagePartByToolCallId("tc-1")
          .addToolResult(result);
      });
    };

    it("defers a tool-result resume until the in-flight run drains, without dropping isRunning", async () => {
      const gate = deferred<void>();
      const streamMock = vi.fn(async function* (_messages: LangChainMessage[]) {
        if (streamMock.mock.calls.length === 1) {
          yield toolCallEvent;
          await gate.promise;
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({ stream: streamMock }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });
      const observedIsRunning: boolean[] = [];
      renderHook(
        () => {
          observedIsRunning.push(useAuiState((s) => s.thread.isRunning));
        },
        { wrapper },
      );

      await act(async () => {
        auiResult.current.composer.setText("what's the weather?");
        auiResult.current.composer.send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitForToolCallPart(auiResult.current);

      addToolResult(runtimeResult.current, { temperature: 72 });

      // the resume waits for run #1 to drain instead of starting a second run
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(streamMock).toHaveBeenCalledTimes(1);
      expect(auiResult.current.thread.getState().isRunning).toBe(true);

      await act(async () => {
        gate.resolve();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
      expect(streamMock.mock.calls[1]?.[0]).toMatchObject([
        {
          type: "tool",
          tool_call_id: "tc-1",
          name: "get_weather",
          content: JSON.stringify({ temperature: 72 }),
          status: "success",
        },
      ]);

      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );
      const transitions = observedIsRunning.filter(
        (value, i) => i === 0 || observedIsRunning[i - 1] !== value,
      );
      expect(transitions).toEqual([false, true, false]);
    });

    it("sends a tool result immediately when no run is in flight", async () => {
      const streamMock = vi.fn(async function* (_messages: LangChainMessage[]) {
        if (streamMock.mock.calls.length === 1) {
          yield toolCallEvent;
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({ stream: streamMock }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        auiResult.current.composer.setText("what's the weather?");
        auiResult.current.composer.send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitForToolCallPart(auiResult.current);
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );

      addToolResult(runtimeResult.current, { temperature: 72 });

      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
    });

    it("drops the queued resume when the run is cancelled", async () => {
      const gate = deferred<void>();
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        config: { abortSignal: AbortSignal },
      ) {
        if (streamMock.mock.calls.length === 1) {
          yield toolCallEvent;
          await Promise.race([
            gate.promise,
            new Promise<void>((resolve) => {
              config.abortSignal.addEventListener("abort", () => resolve(), {
                once: true,
              });
            }),
          ]);
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({
          stream: streamMock,
          unstable_allowCancellation: true,
        }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        auiResult.current.composer.setText("what's the weather?");
        auiResult.current.composer.send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitForToolCallPart(auiResult.current);

      addToolResult(runtimeResult.current, { temperature: 72 });

      await act(async () => {
        runtimeResult.current.thread.cancelRun();
      });

      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
      expect(streamMock).toHaveBeenCalledTimes(1);
    });

    it("rejects a queued send when the run is cancelled", async () => {
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        config: { abortSignal: AbortSignal },
      ) {
        if (streamMock.mock.calls.length === 1) {
          await new Promise<void>((resolve) => {
            config.abortSignal.addEventListener("abort", () => resolve(), {
              once: true,
            });
          });
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({
          stream: streamMock,
          unstable_allowCancellation: true,
        }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: sendResult } = renderHook(() => useLangGraphSend(), {
        wrapper,
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));

      let firstRun!: Promise<void>;
      await act(async () => {
        firstRun = sendResult.current(
          [{ type: "human", content: "first" }],
          {},
        );
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));

      let queuedRun!: Promise<void>;
      await act(async () => {
        queuedRun = sendResult.current(
          [{ type: "human", content: "queued" }],
          {},
        );
      });
      const queuedRunResult = queuedRun.then(
        () => undefined,
        (error) => error,
      );

      await act(async () => {
        runtimeResult.current.thread.cancelRun();
      });

      await expect(queuedRunResult).resolves.toEqual(
        expect.objectContaining({ message: "Queued run was dropped." }),
      );
      await firstRun;
      await waitFor(() =>
        expect(runtimeResult.current.thread.getState().isRunning).toBe(false),
      );
      expect(streamMock).toHaveBeenCalledTimes(1);
    });

    it("stops applying chunks after cancelRun even when the stream ignores its abortSignal", async () => {
      const gate = deferred<void>();
      const streamMock = vi.fn(async function* () {
        yield {
          event: "messages/partial",
          data: [
            { type: "ai" as const, id: "run-1", content: "before-cancel" },
          ],
        };
        await gate.promise;
        yield {
          event: "messages/partial",
          data: [{ type: "ai" as const, id: "run-2", content: "after-cancel" }],
        };
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({
          stream: streamMock as never,
          unstable_allowCancellation: true,
        }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        auiResult.current.composer.setText("hello");
        auiResult.current.composer.send();
      });
      await waitFor(() =>
        expect(
          JSON.stringify(runtimeResult.current.thread.getState().messages),
        ).toContain("before-cancel"),
      );

      await act(async () => {
        runtimeResult.current.thread.cancelRun();
      });

      await act(async () => {
        gate.resolve();
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      expect(
        JSON.stringify(runtimeResult.current.thread.getState().messages),
      ).not.toContain("after-cancel");
    });

    it("cancelRun settles a run whose stream hangs instead of yielding", async () => {
      // never resolved: the stream ignores its abortSignal and parks on its own
      // work, so the consuming loop is left waiting on next()
      const hang = deferred<void>();
      const streamMock = vi.fn(async function* () {
        if (streamMock.mock.calls.length === 1) {
          yield {
            event: "messages/partial",
            data: [
              { type: "ai" as const, id: "run-1", content: "before-cancel" },
            ],
          };
          await hang.promise;
          return;
        }
        yield {
          event: "messages/partial",
          data: [{ type: "ai" as const, id: "run-2", content: "second-run" }],
        };
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({
          stream: streamMock as never,
          unstable_allowCancellation: true,
        }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        auiResult.current.composer.setText("hello");
        auiResult.current.composer.send();
      });
      await waitFor(() =>
        expect(
          JSON.stringify(runtimeResult.current.thread.getState().messages),
        ).toContain("before-cancel"),
      );

      await act(async () => {
        runtimeResult.current.thread.cancelRun();
      });

      // the parked run must stop being the active run
      await waitFor(() =>
        expect(runtimeResult.current.thread.getState().isRunning).toBe(false),
      );

      // and the queue must accept work behind it
      await act(async () => {
        auiResult.current.composer.setText("second");
        auiResult.current.composer.send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(
          JSON.stringify(runtimeResult.current.thread.getState().messages),
        ).toContain("second-run"),
      );
      // the second run has to settle on its own, not inherit the parked state
      await waitFor(() =>
        expect(runtimeResult.current.thread.getState().isRunning).toBe(false),
      );
    });

    it("cancelRun settles a run whose stream hangs before yielding the iterable", async () => {
      // parks before handing the iterable over, one await earlier than the
      // loop, and ignores the signal just the same
      const hang = deferred<void>();
      const streamMock = vi.fn(async () => {
        if (streamMock.mock.calls.length === 1) {
          await hang.promise;
        }
        return (async function* () {
          yield {
            event: "messages/partial",
            data: [{ type: "ai" as const, id: "run-2", content: "second-run" }],
          };
        })();
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({
          stream: streamMock as never,
          unstable_allowCancellation: true,
        }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        auiResult.current.composer.setText("hello");
        auiResult.current.composer.send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));

      await act(async () => {
        runtimeResult.current.thread.cancelRun();
      });

      await waitFor(() =>
        expect(runtimeResult.current.thread.getState().isRunning).toBe(false),
      );

      await act(async () => {
        auiResult.current.composer.setText("second");
        auiResult.current.composer.send();
      });
      await waitFor(() =>
        expect(
          JSON.stringify(runtimeResult.current.thread.getState().messages),
        ).toContain("second-run"),
      );
    });

    it("drops the queued resume when the draining run errors", async () => {
      const gate = deferred<void>();
      const streamMock = vi.fn(async function* (_messages: LangChainMessage[]) {
        if (streamMock.mock.calls.length === 1) {
          yield toolCallEvent;
          await gate.promise;
          throw new Error("stream failed");
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({ stream: streamMock }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });
      const { result: sendResult } = renderHook(() => useLangGraphSend(), {
        wrapper,
      });
      await waitFor(() => expect(sendResult.current).toBeDefined());

      let runError: unknown;
      act(() => {
        sendResult
          .current([{ type: "human", content: "what's the weather?" }], {})
          .catch((error: unknown) => {
            runError = error;
          });
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitForToolCallPart(auiResult.current);

      addToolResult(runtimeResult.current, { temperature: 72 });

      await act(async () => {
        gate.resolve();
      });

      await waitFor(() => expect(runError).toBeInstanceOf(Error));
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
      expect(streamMock).toHaveBeenCalledTimes(1);
    });

    it("replaces a duplicate result in the queued resume instead of double-sending", async () => {
      const gate = deferred<void>();
      const streamMock = vi.fn(async function* (_messages: LangChainMessage[]) {
        if (streamMock.mock.calls.length === 1) {
          yield toolCallEvent;
          await gate.promise;
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({ stream: streamMock }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        auiResult.current.composer.setText("what's the weather?");
        auiResult.current.composer.send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitForToolCallPart(auiResult.current);

      addToolResult(runtimeResult.current, { attempt: 1 });
      addToolResult(runtimeResult.current, { attempt: 2 });

      await act(async () => {
        gate.resolve();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));

      const resume = streamMock.mock.calls[1]?.[0];
      expect(resume).toHaveLength(1);
      expect(resume?.[0]).toMatchObject({
        type: "tool",
        tool_call_id: "tc-1",
        content: JSON.stringify({ attempt: 2 }),
      });
    });

    it("drops the queued resume when the run ends with a top-level error event", async () => {
      const gate = deferred<void>();
      const streamMock = vi.fn(async function* (_messages: LangChainMessage[]) {
        if (streamMock.mock.calls.length === 1) {
          yield toolCallEvent;
          await gate.promise;
          yield { event: "error", data: { message: "graph failed" } };
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({ stream: streamMock }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        auiResult.current.composer.setText("what's the weather?");
        auiResult.current.composer.send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitForToolCallPart(auiResult.current);

      addToolResult(runtimeResult.current, { temperature: 72 });

      await act(async () => {
        gate.resolve();
      });

      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
      expect(streamMock).toHaveBeenCalledTimes(1);
    });

    it("still sends the queued resume when only a subgraph reports an error", async () => {
      const gate = deferred<void>();
      const streamMock = vi.fn(async function* (_messages: LangChainMessage[]) {
        if (streamMock.mock.calls.length === 1) {
          yield toolCallEvent;
          await gate.promise;
          yield { event: "error|subgraph", data: { message: "recoverable" } };
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({ stream: streamMock }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        auiResult.current.composer.setText("what's the weather?");
        auiResult.current.composer.send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitForToolCallPart(auiResult.current);

      addToolResult(runtimeResult.current, { temperature: 72 });

      await act(async () => {
        gate.resolve();
      });

      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
      expect(streamMock.mock.calls[1]?.[0]).toMatchObject([
        { type: "tool", tool_call_id: "tc-1", status: "success" },
      ]);
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );
    });

    it("drops the queued resume when a new user turn starts, cancelling the dangling tool call", async () => {
      const gate = deferred<void>();
      const streamMock = vi.fn(async function* (_messages: LangChainMessage[]) {
        if (streamMock.mock.calls.length === 1) {
          yield toolCallEvent;
          await gate.promise;
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({ stream: streamMock }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        auiResult.current.composer.setText("what's the weather?");
        auiResult.current.composer.send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitForToolCallPart(auiResult.current);

      addToolResult(runtimeResult.current, { temperature: 72 });

      await act(async () => {
        auiResult.current.composer.setText("never mind");
        auiResult.current.composer.send();
      });

      await act(async () => {
        gate.resolve();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));

      // the second run is the new turn (with the pending call cancelled), not the resume
      expect(streamMock.mock.calls[1]?.[0]).toMatchObject([
        {
          type: "tool",
          tool_call_id: "tc-1",
          content: JSON.stringify({ cancelled: true }),
          status: "error",
        },
        { type: "human", content: "never mind" },
      ]);

      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
      expect(streamMock).toHaveBeenCalledTimes(2);
    });

    describe("with a registered frontend tool", () => {
      const ToolRegistrar = ({
        execute,
      }: {
        execute: (args: Record<string, unknown>) => Promise<unknown>;
      }) => {
        const tool = useMemo(
          () =>
            ({
              toolName: "my_tool",
              type: "frontend",
              parameters: { type: "object", properties: {} },
              execute,
            }) as const,
          [execute],
        );
        useAssistantTool(tool);
        return null;
      };

      const wrapperWithTool = (
        runtime: AssistantRuntime,
        execute: (args: Record<string, unknown>) => Promise<unknown>,
      ) => {
        const Wrapper = ({ children }: { children: ReactNode }) => (
          <AssistantRuntimeProvider runtime={runtime}>
            <ToolRegistrar execute={execute} />
            {children}
          </AssistantRuntimeProvider>
        );
        Wrapper.displayName = "TestWrapperWithTool";
        return Wrapper;
      };

      it("merges a staggered same-run tool result into the queued resume", async () => {
        const gateB = deferred<void>();
        const gateDrain = deferred<void>();
        const firstAiMessage = {
          event: "messages/complete",
          data: [
            {
              id: "ai-1",
              type: "ai" as const,
              content: "",
              tool_calls: [{ id: "tc-1", name: "my_tool", args: {} }],
            },
          ],
        };
        const staggeredAiMessage = {
          event: "messages/complete",
          data: [
            {
              id: "ai-1",
              type: "ai" as const,
              content: "",
              tool_calls: [
                { id: "tc-1", name: "my_tool", args: {} },
                { id: "tc-2", name: "my_tool", args: {} },
              ],
            },
          ],
        };
        const streamMock = vi.fn(async function* (
          _messages: LangChainMessage[],
        ) {
          if (streamMock.mock.calls.length === 1) {
            yield firstAiMessage;
            await gateB.promise;
            yield staggeredAiMessage;
            await gateDrain.promise;
            return;
          }
        });
        const execute = vi.fn(async () => ({ ok: true }));

        const { result: runtimeResult } = renderHook(() =>
          useLangGraphRuntime({ stream: streamMock }),
        );
        const wrapper = wrapperWithTool(runtimeResult.current, execute);
        const { result: auiResult } = renderHook(() => useAui(), { wrapper });

        await new Promise((r) => setTimeout(r, 0));
        await new Promise((r) => setTimeout(r, 0));

        await act(async () => {
          auiResult.current.composer.setText("hi");
          auiResult.current.composer.send();
        });

        await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
        // flush so tool A's batch is queued before tool B streams in
        await act(async () => {});
        expect(streamMock).toHaveBeenCalledTimes(1);

        await act(async () => {
          gateB.resolve();
        });
        await waitFor(() => expect(execute).toHaveBeenCalledTimes(2));
        expect(streamMock).toHaveBeenCalledTimes(1);

        await act(async () => {
          gateDrain.resolve();
        });
        await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
        expect(streamMock.mock.calls[1]![0]).toMatchObject([
          { type: "tool", tool_call_id: "tc-1", status: "success" },
          { type: "tool", tool_call_id: "tc-2", status: "success" },
        ]);
        await waitFor(() =>
          expect(auiResult.current.thread.getState().isRunning).toBe(false),
        );
      });
    });

    it("drops a late tool result for a call already answered by a new turn's auto-cancellation instead of resuming the graph", async () => {
      const streamMock = vi.fn(async function* (_messages: LangChainMessage[]) {
        if (streamMock.mock.calls.length === 1) {
          yield toolCallEvent;
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({ stream: streamMock }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        auiResult.current.composer.setText("what's the weather?");
        auiResult.current.composer.send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitForToolCallPart(auiResult.current);
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );

      // a new turn auto-cancels the dangling tool call with a tool message
      await act(async () => {
        auiResult.current.composer.setText("never mind");
        auiResult.current.composer.send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
      expect(streamMock.mock.calls[1]?.[0]).toMatchObject([
        {
          type: "tool",
          tool_call_id: "tc-1",
          content: JSON.stringify({ cancelled: true }),
          status: "error",
        },
        { type: "human", content: "never mind" },
      ]);

      // a result arriving after the call was already answered must not resume
      addToolResult(runtimeResult.current, { temperature: 72 });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
      expect(streamMock).toHaveBeenCalledTimes(2);
    });
  });
});
