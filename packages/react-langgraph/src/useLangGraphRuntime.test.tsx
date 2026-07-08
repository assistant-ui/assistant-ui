import { describe, it, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
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
import { useLangGraphSend } from "./hooks";
import { mockStreamCallbackFactory } from "./testUtils";
import type { LangChainMessage } from "./types";
import type { LangGraphInterruptState } from "./useLangGraphMessages";
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
      await auiResult.current.composer().send();
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
          auiResult.current.composer().setText(text);
          auiResult.current.composer().send();
        });
      };

      await send("first");
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(auiResult.current.thread().getState().isRunning).toBe(true),
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
      expect(auiResult.current.thread().getState().capabilities.queue).toBe(
        true,
      );

      // settling the first run drains the queued message
      await act(async () => {
        gate.resolve();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
      expect(auiResult.current.thread().composer().getState().queue).toEqual(
        [],
      );

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
          auiResult.current.composer().setText(text);
          auiResult.current.composer().send();
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
      expect(auiResult.current.thread().composer().getState().queue).toEqual(
        [],
      );
    });

    it("does not expose the queue capability when the flag is off", async () => {
      const streamMock = vi.fn(async function* () {});
      const { result: runtimeResult } = renderHook(
        () => useLangGraphRuntime({ stream: streamMock }),
        {},
      );
      const wrapper = wrapperFactory(runtimeResult.current);
      const { result: auiResult } = renderHook(() => useAui(), { wrapper });

      expect(auiResult.current.thread().getState().capabilities.queue).toBe(
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
        const parts = aui
          .thread()
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
        auiResult.current.composer().setText("what's the weather?");
        auiResult.current.composer().send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitForToolCallPart(auiResult.current);

      addToolResult(runtimeResult.current, { temperature: 72 });

      // the resume waits for run #1 to drain instead of starting a second run
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(streamMock).toHaveBeenCalledTimes(1);
      expect(auiResult.current.thread().getState().isRunning).toBe(true);

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
        expect(auiResult.current.thread().getState().isRunning).toBe(false),
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
        auiResult.current.composer().setText("what's the weather?");
        auiResult.current.composer().send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitForToolCallPart(auiResult.current);
      await waitFor(() =>
        expect(auiResult.current.thread().getState().isRunning).toBe(false),
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
        auiResult.current.composer().setText("what's the weather?");
        auiResult.current.composer().send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitForToolCallPart(auiResult.current);

      addToolResult(runtimeResult.current, { temperature: 72 });

      await act(async () => {
        runtimeResult.current.thread.cancelRun();
      });

      await waitFor(() =>
        expect(auiResult.current.thread().getState().isRunning).toBe(false),
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
      expect(streamMock).toHaveBeenCalledTimes(1);
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
        expect(auiResult.current.thread().getState().isRunning).toBe(false),
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
        auiResult.current.composer().setText("what's the weather?");
        auiResult.current.composer().send();
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
        auiResult.current.composer().setText("what's the weather?");
        auiResult.current.composer().send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitForToolCallPart(auiResult.current);

      addToolResult(runtimeResult.current, { temperature: 72 });

      await act(async () => {
        gate.resolve();
      });

      await waitFor(() =>
        expect(auiResult.current.thread().getState().isRunning).toBe(false),
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
        auiResult.current.composer().setText("what's the weather?");
        auiResult.current.composer().send();
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
        expect(auiResult.current.thread().getState().isRunning).toBe(false),
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
        auiResult.current.composer().setText("what's the weather?");
        auiResult.current.composer().send();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
      await waitForToolCallPart(auiResult.current);

      addToolResult(runtimeResult.current, { temperature: 72 });

      await act(async () => {
        auiResult.current.composer().setText("never mind");
        auiResult.current.composer().send();
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
        expect(auiResult.current.thread().getState().isRunning).toBe(false),
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
          auiResult.current.composer().setText("hi");
          auiResult.current.composer().send();
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
          expect(auiResult.current.thread().getState().isRunning).toBe(false),
        );
      });
    });
  });
});
