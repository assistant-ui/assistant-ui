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
import { useAui, useAuiState } from "@assistant-ui/store";
import { useLangGraphRuntime } from "./useLangGraphRuntime";
import { useLangGraphSend, useLangGraphSendCommand } from "./hooks";
import { mockStreamCallbackFactory } from "./testUtils";
import type { LangChainMessage } from "./types";
import type {
  LangGraphInterruptState,
  LangGraphSendMessageConfig,
} from "./useLangGraphMessages";
import { useMemo, type ReactNode } from "react";

type LoadResult = {
  messages: LangChainMessage[];
  interrupts?: LangGraphInterruptState[];
};

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

    const waitForToolCallPart = async (
      aui: ReturnType<typeof useAui>,
      toolCallId = "tc-1",
    ) => {
      await waitFor(() => {
        const parts = aui.thread
          .getState()
          .messages.flatMap((m): readonly unknown[] => m.content);
        expect(parts).toContainEqual(
          expect.objectContaining({ type: "tool-call", toolCallId }),
        );
      });
    };

    const addToolResult = (
      runtime: AssistantRuntime,
      result: unknown,
      messageId = "ai-1",
      toolCallId = "tc-1",
    ) => {
      act(() => {
        runtime.thread
          .getMessageById(messageId)
          .getMessagePartByToolCallId(toolCallId)
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
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        _config: LangGraphSendMessageConfig,
      ) {
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

    it("preserves run config when a tool result resumes the graph", async () => {
      const runConfig = {
        custom: { configurable: { model_name: "gpt-5.4-nano" } },
      };
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        _config: LangGraphSendMessageConfig,
      ) {
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
        auiResult.current.composer.setRunConfig(runConfig);
        auiResult.current.composer.setText("what's the weather?");
        auiResult.current.composer.send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      expect(streamMock.mock.calls[0]?.[1].runConfig).toEqual(runConfig);
      await waitForToolCallPart(auiResult.current);
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );

      addToolResult(runtimeResult.current, { temperature: 72 });

      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
      expect(streamMock.mock.calls[1]?.[1].runConfig).toEqual(runConfig);
    });

    it("preserves run config for a tool call with a synthesized id", async () => {
      const runConfig = {
        custom: { configurable: { model_name: "gpt-5.4-nano" } },
      };
      const emptyIdToolCallEvent = {
        event: "messages/complete",
        data: [
          {
            id: "ai-empty-id",
            type: "ai" as const,
            content: "",
            tool_calls: [
              { id: "", index: 0, name: "get_weather", args: { city: "sf" } },
            ],
          },
        ],
      };
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        _config: LangGraphSendMessageConfig,
      ) {
        if (streamMock.mock.calls.length === 1) {
          yield emptyIdToolCallEvent;
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({ stream: streamMock }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        auiResult.current.composer.setRunConfig(runConfig);
        auiResult.current.composer.setText("what's the weather?");
        auiResult.current.composer.send();
      });
      await waitForToolCallPart(auiResult.current, "lc-toolcall-ai-empty-id-0");
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );

      addToolResult(
        runtimeResult.current,
        { temperature: 72 },
        "ai-empty-id",
        "lc-toolcall-ai-empty-id-0",
      );

      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
      expect(streamMock.mock.calls[1]?.[0]).toMatchObject([
        { type: "tool", tool_call_id: "lc-toolcall-ai-empty-id-0" },
      ]);
      expect(streamMock.mock.calls[1]?.[1].runConfig).toEqual(runConfig);
    });

    it("canonicalizes a synthesized tool call id after the real id arrives", async () => {
      const runConfig = {
        custom: { configurable: { model_name: "gpt-5.4-nano" } },
      };
      const completionGate = deferred<void>();
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        _config: LangGraphSendMessageConfig,
      ) {
        if (streamMock.mock.calls.length === 1) {
          yield {
            event: "messages/complete",
            data: [
              {
                id: "ai-id-upgrade",
                type: "ai" as const,
                content: "",
                tool_calls: [
                  { id: "", index: 0, name: "get_weather", args: {} },
                ],
              },
            ],
          };
          await completionGate.promise;
          yield {
            event: "messages/complete",
            data: [
              {
                id: "ai-id-upgrade",
                type: "ai" as const,
                content: "",
                tool_calls: [
                  { id: "tc-real", index: 0, name: "get_weather", args: {} },
                ],
              },
            ],
          };
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({ stream: streamMock }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        auiResult.current.composer.setRunConfig(runConfig);
        auiResult.current.composer.setText("what's the weather?");
        auiResult.current.composer.send();
      });
      const synthesizedId = "lc-toolcall-ai-id-upgrade-0";
      await waitForToolCallPart(auiResult.current, synthesizedId);
      const pendingToolPart = runtimeResult.current.thread
        .getMessageById("ai-id-upgrade")
        .getMessagePartByToolCallId(synthesizedId);

      await act(async () => {
        completionGate.resolve();
      });
      await waitForToolCallPart(auiResult.current, "tc-real");
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );

      act(() => {
        pendingToolPart.addToolResult({ temperature: 72 });
      });

      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
      expect(streamMock.mock.calls[1]?.[0]).toMatchObject([
        { type: "tool", tool_call_id: "tc-real" },
      ]);
      expect(streamMock.mock.calls[1]?.[1].runConfig).toEqual(runConfig);
    });

    it("canonicalizes a queued tool result when the real id arrives", async () => {
      const runConfig = {
        custom: { configurable: { model_name: "gpt-5.4-nano" } },
      };
      const completionGate = deferred<void>();
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        _config: LangGraphSendMessageConfig,
      ) {
        if (streamMock.mock.calls.length === 1) {
          yield {
            event: "messages/complete",
            data: [
              {
                id: "ai-queued-upgrade",
                type: "ai" as const,
                content: "",
                tool_calls: [
                  { id: "", index: 0, name: "get_weather", args: {} },
                ],
              },
            ],
          };
          await completionGate.promise;
          yield {
            event: "messages/complete",
            data: [
              {
                id: "ai-queued-upgrade",
                type: "ai" as const,
                content: "",
                tool_calls: [{ id: "tc-real", name: "get_weather", args: {} }],
              },
            ],
          };
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({ stream: streamMock }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        auiResult.current.composer.setRunConfig(runConfig);
        auiResult.current.composer.setText("what's the weather?");
        auiResult.current.composer.send();
      });
      const synthesizedId = "lc-toolcall-ai-queued-upgrade-0";
      await waitForToolCallPart(auiResult.current, synthesizedId);
      addToolResult(
        runtimeResult.current,
        { temperature: 72 },
        "ai-queued-upgrade",
        synthesizedId,
      );

      await act(async () => {
        completionGate.resolve();
      });

      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
      expect(streamMock.mock.calls[1]?.[0]).toMatchObject([
        { type: "tool", tool_call_id: "tc-real" },
      ]);
      expect(streamMock.mock.calls[1]?.[1].runConfig).toEqual(runConfig);
    });

    it("canonicalizes a buffered parallel result when the real id arrives", async () => {
      const runConfig = {
        custom: { configurable: { model_name: "gpt-5.4-nano" } },
      };
      const completionGate = deferred<void>();
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        _config: LangGraphSendMessageConfig,
      ) {
        if (streamMock.mock.calls.length === 1) {
          yield {
            event: "messages/complete",
            data: [
              {
                id: "ai-parallel-upgrade",
                type: "ai" as const,
                content: "",
                tool_calls: [
                  { id: "", index: 0, name: "first_tool", args: {} },
                  { id: "tc-second", index: 1, name: "second_tool", args: {} },
                ],
              },
            ],
          };
          await completionGate.promise;
          yield {
            event: "messages/complete",
            data: [
              {
                id: "ai-parallel-upgrade",
                type: "ai" as const,
                content: "",
                tool_calls: [
                  { id: "tc-first", name: "first_tool", args: {} },
                  { id: "tc-second", index: 1, name: "second_tool", args: {} },
                ],
              },
            ],
          };
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({ stream: streamMock }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        auiResult.current.composer.setRunConfig(runConfig);
        auiResult.current.composer.setText("run both tools");
        auiResult.current.composer.send();
      });
      const synthesizedId = "lc-toolcall-ai-parallel-upgrade-0";
      await waitForToolCallPart(auiResult.current, synthesizedId);
      await waitForToolCallPart(auiResult.current, "tc-second");
      addToolResult(
        runtimeResult.current,
        { first: true },
        "ai-parallel-upgrade",
        synthesizedId,
      );

      await act(async () => {
        completionGate.resolve();
      });
      await waitForToolCallPart(auiResult.current, "tc-first");
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );
      addToolResult(
        runtimeResult.current,
        { second: true },
        "ai-parallel-upgrade",
        "tc-second",
      );

      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
      expect(streamMock.mock.calls[1]?.[0]).toMatchObject([
        { type: "tool", tool_call_id: "tc-first" },
        { type: "tool", tool_call_id: "tc-second" },
      ]);
      expect(streamMock.mock.calls[1]?.[1].runConfig).toEqual(runConfig);
    });

    it("preserves run config through a command before a tool resume", async () => {
      const runConfig = {
        custom: { configurable: { model_name: "gpt-5.4-nano" } },
      };
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        _config: LangGraphSendMessageConfig,
      ) {
        if (streamMock.mock.calls.length === 2) {
          yield toolCallEvent;
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({ stream: streamMock }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });
      const { result: sendCommandResult } = renderHook(
        () => useLangGraphSendCommand(),
        { wrapper },
      );

      await act(async () => {
        auiResult.current.composer.setRunConfig(runConfig);
        auiResult.current.composer.setText("begin");
        auiResult.current.composer.send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );

      await act(async () => {
        await sendCommandResult.current({ resume: "continue" });
      });
      expect(streamMock.mock.calls[1]?.[1].runConfig).toEqual(runConfig);
      await waitForToolCallPart(auiResult.current);

      addToolResult(runtimeResult.current, { temperature: 72 });

      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(3));
      expect(streamMock.mock.calls[2]?.[1].runConfig).toEqual(runConfig);
    });

    it("uses the interrupted run config after an unrelated tool resume", async () => {
      const runConfig = {
        custom: { configurable: { model_name: "gpt-5.4-nano" } },
      };
      const load = vi.fn(
        async (): Promise<LoadResult> => ({
          messages: [
            {
              id: "loaded-ai",
              type: "ai",
              content: "",
              tool_calls: [
                { id: "loaded-tool", name: "get_weather", args: {} },
              ],
            },
          ],
        }),
      );
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        _config: LangGraphSendMessageConfig,
      ) {
        if (streamMock.mock.calls.length === 1) {
          yield {
            event: "updates",
            data: { __interrupt__: [{ value: "approval required" }] },
          };
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({
          stream: streamMock,
          load,
          autoCancelPendingToolCalls: false,
          unstable_threadListAdapter: makeThreadListAdapter(),
        }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });
      const { result: sendCommandResult } = renderHook(
        () => useLangGraphSendCommand(),
        { wrapper },
      );

      await act(async () => {
        await runtimeResult.current.threads.switchToThread("lg-thread-1");
      });
      await waitForToolCallPart(auiResult.current, "loaded-tool");

      await act(async () => {
        auiResult.current.composer.setRunConfig(runConfig);
        auiResult.current.composer.setText("begin configured run");
        auiResult.current.composer.send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));

      addToolResult(
        runtimeResult.current,
        { temperature: 72 },
        "loaded-ai",
        "loaded-tool",
      );
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
      expect(streamMock.mock.calls[1]?.[1].runConfig).toBeUndefined();

      await act(async () => {
        await sendCommandResult.current({ resume: "continue" });
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(3));
      expect(streamMock.mock.calls[2]?.[1].runConfig).toEqual(runConfig);
    });

    it("uses the latest explicitly queued run config for a later command", async () => {
      const firstRunConfig = {
        custom: { configurable: { model_name: "gpt-5.4-nano" } },
      };
      const queuedRunConfig = {
        custom: { configurable: { model_name: "claude-haiku-4-5" } },
      };
      const gate = deferred<void>();
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        _config: LangGraphSendMessageConfig,
      ) {
        if (streamMock.mock.calls.length === 1) await gate.promise;
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({ stream: streamMock }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      renderHook(() => useAui(), { wrapper });
      const { result: sendResult } = renderHook(() => useLangGraphSend(), {
        wrapper,
      });
      const { result: sendCommandResult } = renderHook(
        () => useLangGraphSendCommand(),
        { wrapper },
      );

      act(() => {
        void sendResult.current([{ type: "human", content: "first" }], {
          runConfig: firstRunConfig,
        });
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));

      act(() => {
        void sendResult.current([{ type: "human", content: "queued" }], {
          runConfig: queuedRunConfig,
        });
        void sendCommandResult.current({ resume: "continue" });
      });

      await act(async () => {
        gate.resolve();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(3));
      expect(streamMock.mock.calls[1]?.[1].runConfig).toEqual(queuedRunConfig);
      expect(streamMock.mock.calls[2]?.[1].runConfig).toEqual(queuedRunConfig);
    });

    it("prefers an explicit run config on a command", async () => {
      const previousRunConfig = {
        custom: { configurable: { model_name: "gpt-5.4-nano" } },
      };
      const commandRunConfig = {
        custom: { configurable: { model_name: "claude-haiku-4-5" } },
      };
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        _config: LangGraphSendMessageConfig,
      ) {
        if (streamMock.mock.calls.length === 2) {
          yield toolCallEvent;
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

      await act(async () => {
        await sendResult.current([{ type: "human", content: "begin" }], {
          runConfig: previousRunConfig,
        });
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));

      await act(async () => {
        await sendResult.current([], {
          command: { resume: "continue" },
          runConfig: commandRunConfig,
        });
      });
      expect(streamMock.mock.calls[1]?.[1].runConfig).toEqual(commandRunConfig);
      await waitForToolCallPart(auiResult.current);

      addToolResult(runtimeResult.current, { temperature: 72 });

      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(3));
      expect(streamMock.mock.calls[2]?.[1].runConfig).toEqual(commandRunConfig);
    });

    it("uses the owning run config after a later run has started", async () => {
      const firstRunConfig = {
        custom: { configurable: { model_name: "gpt-5.4-nano" } },
      };
      const nextRunConfig = {
        custom: { configurable: { model_name: "claude-haiku-4-5" } },
      };
      const gate = deferred<void>();
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        _config: LangGraphSendMessageConfig,
      ) {
        if (streamMock.mock.calls.length === 1) {
          yield toolCallEvent;
        } else if (streamMock.mock.calls.length === 2) {
          await gate.promise;
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({
          stream: streamMock,
          autoCancelPendingToolCalls: false,
        }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });
      const { result: sendResult } = renderHook(() => useLangGraphSend(), {
        wrapper,
      });

      await act(async () => {
        auiResult.current.composer.setRunConfig(firstRunConfig);
        auiResult.current.composer.setText("what's the weather?");
        auiResult.current.composer.send();
      });
      await waitForToolCallPart(auiResult.current);
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );

      act(() => {
        void sendResult.current(
          [{ type: "human", content: "use another model next" }],
          { runConfig: nextRunConfig },
        );
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
      expect(auiResult.current.thread.getState().isRunning).toBe(true);
      addToolResult(runtimeResult.current, { temperature: 72 });

      await act(async () => {
        gate.resolve();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(3));
      expect(streamMock.mock.calls[1]?.[1].runConfig).toEqual(nextRunConfig);
      expect(streamMock.mock.calls[2]?.[1].runConfig).toEqual(firstRunConfig);
    });

    it("keeps run ownership when tool calls are reordered", async () => {
      const firstRunConfig = {
        custom: { configurable: { model_name: "gpt-5.4-nano" } },
      };
      const secondRunConfig = {
        custom: { configurable: { model_name: "claude-haiku-4-5" } },
      };
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        _config: LangGraphSendMessageConfig,
      ) {
        if (streamMock.mock.calls.length === 1) {
          yield {
            event: "messages/complete",
            data: [
              {
                id: "ai-reordered",
                type: "ai" as const,
                content: "",
                tool_calls: [
                  { id: "", index: 0, name: "first_tool", args: {} },
                ],
              },
            ],
          };
        } else if (streamMock.mock.calls.length === 2) {
          yield {
            event: "messages/complete",
            data: [
              {
                id: "ai-reordered",
                type: "ai" as const,
                content: "",
                tool_calls: [
                  { id: "tc-new", index: 1, name: "new_tool", args: {} },
                  { id: "tc-first", index: 0, name: "first_tool", args: {} },
                ],
              },
            ],
          };
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({
          stream: streamMock,
          autoCancelPendingToolCalls: false,
        }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        auiResult.current.composer.setRunConfig(firstRunConfig);
        auiResult.current.composer.setText("first turn");
        auiResult.current.composer.send();
      });
      await waitForToolCallPart(
        auiResult.current,
        "lc-toolcall-ai-reordered-0",
      );

      await act(async () => {
        auiResult.current.composer.setRunConfig(secondRunConfig);
        auiResult.current.composer.setText("second turn");
        auiResult.current.composer.send();
      });
      await waitForToolCallPart(auiResult.current, "tc-first");
      await waitForToolCallPart(auiResult.current, "tc-new");

      addToolResult(
        runtimeResult.current,
        { first: true },
        "ai-reordered",
        "tc-first",
      );
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(3));
      expect(streamMock.mock.calls[2]?.[1].runConfig).toEqual(firstRunConfig);

      addToolResult(
        runtimeResult.current,
        { next: true },
        "ai-reordered",
        "tc-new",
      );
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(4));
      expect(streamMock.mock.calls[3]?.[1].runConfig).toEqual(secondRunConfig);
    });

    it("prunes ownership for tool calls removed by the graph", async () => {
      const firstRunConfig = {
        custom: { configurable: { model_name: "gpt-5.4-nano" } },
      };
      const secondRunConfig = {
        custom: { configurable: { model_name: "claude-haiku-4-5" } },
      };
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        _config: LangGraphSendMessageConfig,
      ) {
        if (streamMock.mock.calls.length === 1) {
          yield toolCallEvent;
          yield {
            event: "messages/complete",
            data: [{ id: "ai-1", type: "remove" }],
          };
        } else if (streamMock.mock.calls.length === 2) {
          yield {
            event: "messages/complete",
            data: [
              {
                id: "ai-2",
                type: "ai" as const,
                content: "",
                tool_calls: [
                  { id: "tc-1", name: "get_weather", args: { city: "sf" } },
                ],
              },
            ],
          };
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({ stream: streamMock }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        auiResult.current.composer.setRunConfig(firstRunConfig);
        auiResult.current.composer.setText("first turn");
        auiResult.current.composer.send();
      });
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );

      await act(async () => {
        auiResult.current.composer.setRunConfig(secondRunConfig);
        auiResult.current.composer.setText("second turn");
        auiResult.current.composer.send();
      });
      await waitForToolCallPart(auiResult.current);

      addToolResult(runtimeResult.current, { temperature: 72 }, "ai-2", "tc-1");

      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(3));
      expect(streamMock.mock.calls[2]?.[1].runConfig).toEqual(secondRunConfig);
    });

    it("resumes pending tools separately for each owning run", async () => {
      const firstRunConfig = {
        custom: { configurable: { model_name: "gpt-5.4-nano" } },
      };
      const secondRunConfig = {
        custom: { configurable: { model_name: "claude-haiku-4-5" } },
      };
      const firstToolCallEvent = {
        event: "messages/complete",
        data: [
          {
            id: "ai-first",
            type: "ai" as const,
            content: "",
            tool_calls: [{ id: "tc-first", name: "first_tool", args: {} }],
          },
        ],
      };
      const secondToolCallEvent = {
        event: "messages/complete",
        data: [
          {
            id: "ai-second",
            type: "ai" as const,
            content: "",
            tool_calls: [{ id: "tc-second", name: "second_tool", args: {} }],
          },
        ],
      };
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        _config: LangGraphSendMessageConfig,
      ) {
        if (streamMock.mock.calls.length === 1) {
          yield firstToolCallEvent;
        } else if (streamMock.mock.calls.length === 2) {
          yield secondToolCallEvent;
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({
          stream: streamMock,
          autoCancelPendingToolCalls: false,
        }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        auiResult.current.composer.setRunConfig(firstRunConfig);
        auiResult.current.composer.setText("first turn");
        auiResult.current.composer.send();
      });
      await waitForToolCallPart(auiResult.current, "tc-first");
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );

      await act(async () => {
        auiResult.current.composer.setRunConfig(secondRunConfig);
        auiResult.current.composer.setText("second turn");
        auiResult.current.composer.send();
      });
      await waitForToolCallPart(auiResult.current, "tc-second");
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );

      addToolResult(
        runtimeResult.current,
        { first: true },
        "ai-first",
        "tc-first",
      );
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(3));
      expect(streamMock.mock.calls[2]?.[0]).toMatchObject([
        { type: "tool", tool_call_id: "tc-first" },
      ]);
      expect(streamMock.mock.calls[2]?.[1].runConfig).toEqual(firstRunConfig);
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );

      addToolResult(
        runtimeResult.current,
        { second: true },
        "ai-second",
        "tc-second",
      );
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(4));
      expect(streamMock.mock.calls[3]?.[0]).toMatchObject([
        { type: "tool", tool_call_id: "tc-second" },
      ]);
      expect(streamMock.mock.calls[3]?.[1].runConfig).toEqual(secondRunConfig);
    });

    it("does not reuse run config for a later unconfigured turn", async () => {
      const runConfig = {
        custom: { configurable: { model_name: "gpt-5.4-nano" } },
      };
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        _config: LangGraphSendMessageConfig,
      ) {
        if (streamMock.mock.calls.length === 2) {
          yield toolCallEvent;
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

      await act(async () => {
        auiResult.current.composer.setRunConfig(runConfig);
        auiResult.current.composer.setText("first turn");
        auiResult.current.composer.send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );

      await act(async () => {
        await sendResult.current(
          [{ type: "human", content: "unconfigured turn" }],
          {},
        );
      });
      await waitForToolCallPart(auiResult.current);

      addToolResult(runtimeResult.current, { temperature: 72 });

      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(3));
      expect(streamMock.mock.calls[2]?.[1].runConfig).toBeUndefined();
    });

    it("does not carry run config into a loaded thread", async () => {
      const runConfig = {
        custom: { configurable: { model_name: "gpt-5.4-nano" } },
      };
      const load = vi.fn(async (): Promise<LoadResult> => ({ messages: [] }));
      const adapter: RemoteThreadListAdapter = {
        ...makeThreadListAdapter(),
        list: vi.fn(async () => ({
          threads: ["thread-a", "thread-b"].map((threadId) => ({
            status: "regular" as const,
            remoteId: threadId,
            externalId: threadId,
          })),
        })),
      };
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        _config: LangGraphSendMessageConfig,
      ) {
        if (streamMock.mock.calls.length === 2) {
          yield toolCallEvent;
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({
          stream: streamMock,
          load,
          unstable_threadListAdapter: adapter,
        }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });
      const { result: sendResult } = renderHook(() => useLangGraphSend(), {
        wrapper,
      });
      const { result: sendCommandResult } = renderHook(
        () => useLangGraphSendCommand(),
        { wrapper },
      );

      await act(async () => {
        await runtimeResult.current.threads.switchToThread("thread-a");
      });
      await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

      await act(async () => {
        await sendResult.current([{ type: "human", content: "first thread" }], {
          runConfig,
        });
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );

      await act(async () => {
        await runtimeResult.current.threads.switchToThread("thread-b");
      });
      await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isLoading).toBe(false),
      );

      await act(async () => {
        await sendCommandResult.current({ resume: "continue" });
      });
      await waitForToolCallPart(auiResult.current);

      addToolResult(runtimeResult.current, { temperature: 72 });

      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(3));
      expect(streamMock.mock.calls[2]?.[1].runConfig).toBeUndefined();
    });

    it("does not assign a new run config to a pending tool from loaded history", async () => {
      const runConfig = {
        custom: { configurable: { model_name: "gpt-5.4-nano" } },
      };
      const load = vi.fn(
        async (): Promise<LoadResult> => ({
          messages: [
            {
              type: "ai",
              content: "",
              tool_calls: [{ id: "", index: 0, name: "get_weather", args: {} }],
            },
          ],
        }),
      );
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        _config: LangGraphSendMessageConfig,
      ) {});

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({
          stream: streamMock,
          load,
          autoCancelPendingToolCalls: false,
          unstable_threadListAdapter: makeThreadListAdapter(),
        }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        await runtimeResult.current.threads.switchToThread("lg-thread-1");
      });
      await waitFor(() =>
        expect(
          auiResult.current.thread
            .getState()
            .messages.some((message) =>
              message.content.some((part) => part.type === "tool-call"),
            ),
        ).toBe(true),
      );

      await act(async () => {
        auiResult.current.composer.setRunConfig(runConfig);
        auiResult.current.composer.setText("start a new turn");
        auiResult.current.composer.send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );

      const loadedMessage = auiResult.current.thread
        .getState()
        .messages.find((message) =>
          message.content.some((part) => part.type === "tool-call"),
        )!;
      const loadedToolCall = loadedMessage.content.find(
        (part) => part.type === "tool-call",
      )!;
      addToolResult(
        runtimeResult.current,
        { temperature: 72 },
        loadedMessage.id,
        loadedToolCall.toolCallId,
      );

      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
      expect(streamMock.mock.calls[1]?.[1].runConfig).toBeUndefined();
    });

    it("does not carry run config into a new thread", async () => {
      const runConfig = {
        custom: { configurable: { model_name: "gpt-5.4-nano" } },
      };
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        _config: LangGraphSendMessageConfig,
      ) {
        if (streamMock.mock.calls.length === 2) {
          yield toolCallEvent;
        }
      });

      const { result: runtimeResult } = renderHook(() =>
        useLangGraphRuntime({
          stream: streamMock,
          unstable_threadListAdapter: makeThreadListAdapter(),
        }),
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });
      const { result: sendResult } = renderHook(() => useLangGraphSend(), {
        wrapper,
      });
      const { result: sendCommandResult } = renderHook(
        () => useLangGraphSendCommand(),
        { wrapper },
      );

      await act(async () => {
        await runtimeResult.current.threads.switchToThread("lg-thread-1");
      });

      await act(async () => {
        await sendResult.current([{ type: "human", content: "first thread" }], {
          runConfig,
        });
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));

      await act(async () => {
        await runtimeResult.current.threads.switchToNewThread();
      });
      await waitFor(() =>
        expect(
          auiResult.current.threadListItem.getState().externalId,
        ).toBeUndefined(),
      );

      await act(async () => {
        await sendCommandResult.current({ resume: "continue" });
      });
      await waitForToolCallPart(auiResult.current);

      addToolResult(runtimeResult.current, { temperature: 72 });

      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(3));
      expect(streamMock.mock.calls[2]?.[1].runConfig).toBeUndefined();
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

    it("preserves tool ownership when a result arrives after cancellation", async () => {
      const runConfig = {
        custom: { configurable: { model_name: "gpt-5.4-nano" } },
      };
      const streamMock = vi.fn(async function* (
        _messages: LangChainMessage[],
        config: LangGraphSendMessageConfig & { abortSignal: AbortSignal },
      ) {
        if (streamMock.mock.calls.length === 1) {
          yield toolCallEvent;
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
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      await act(async () => {
        auiResult.current.composer.setRunConfig(runConfig);
        auiResult.current.composer.setText("what's the weather?");
        auiResult.current.composer.send();
      });
      await waitForToolCallPart(auiResult.current);

      await act(async () => {
        runtimeResult.current.thread.cancelRun();
      });
      await waitFor(() =>
        expect(auiResult.current.thread.getState().isRunning).toBe(false),
      );

      addToolResult(runtimeResult.current, { temperature: 72 });

      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
      expect(streamMock.mock.calls[1]?.[1].runConfig).toEqual(runConfig);
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
