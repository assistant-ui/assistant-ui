// @vitest-environment jsdom

import { act, render, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  AppendMessage,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { useAui } from "@assistant-ui/store";
import type { LangChainBaseMessage } from "./types";
import type { ReactNode } from "react";
import {
  useLangChainRespond,
  useLangChainRespondAll,
  useLangChainSend,
  useLangChainSendCommand,
  useLangChainSubmit,
} from "./hooks";

const { mockUseChannel, mockUseStream, streamController } = vi.hoisted(() => ({
  mockUseChannel: vi.fn(() => []),
  mockUseStream: vi.fn(),
  streamController: Symbol("STREAM_CONTROLLER"),
}));

vi.mock("@langchain/react", () => ({
  STREAM_CONTROLLER: streamController,
  useChannel: mockUseChannel,
  useStream: mockUseStream,
}));

import { useStreamRuntime } from "./useStreamRuntime";

type MockStream = {
  messages: LangChainBaseMessage[];
  isLoading: boolean;
  isThreadLoading: boolean;
  values: Record<string, unknown>;
  interrupts: unknown[];
  toolCalls: unknown[];
  subagents: unknown[];
  subgraphs: unknown[];
  error: unknown;
  submit: ReturnType<typeof vi.fn>;
  respond: ReturnType<typeof vi.fn>;
  respondAll: ReturnType<typeof vi.fn>;
  interrupt: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  client: Record<string, unknown>;
  [streamController]: {
    messageMetadataStore: {
      getSnapshot: ReturnType<typeof vi.fn>;
    };
  };
};

const message = (
  id: string,
  type: "human" | "ai",
  content: string,
): LangChainBaseMessage & { id: string } => ({
  id,
  _getType: () => type,
  content,
});

const createMockStream = (
  messages: LangChainBaseMessage[] = [],
): MockStream => ({
  messages,
  isLoading: false,
  isThreadLoading: false,
  values: {},
  interrupts: [],
  toolCalls: [],
  subagents: [],
  subgraphs: [],
  error: undefined,
  submit: vi.fn(async () => {}),
  respond: vi.fn(),
  respondAll: vi.fn(),
  interrupt: vi.fn(),
  stop: vi.fn(),
  client: {},
  [streamController]: {
    messageMetadataStore: {
      getSnapshot: vi.fn(),
    },
  },
});

const renderRuntime = (stream: MockStream) => {
  mockUseStream.mockReturnValue(stream);
  return renderHook(() => useStreamRuntime({ apiUrl: "/api" } as never));
};

const renderAui = (stream: MockStream) => {
  const runtimeHook = renderRuntime(stream);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AssistantRuntimeProvider runtime={runtimeHook.result.current}>
      {children}
    </AssistantRuntimeProvider>
  );
  Wrapper.displayName = "TestWrapper";
  const auiHook = renderHook(() => useAui(), { wrapper: Wrapper });
  return {
    auiResult: auiHook.result,
    rerender: () => {
      runtimeHook.rerender();
      auiHook.rerender();
    },
  };
};

const getText = (aui: ReturnType<typeof useAui>) =>
  aui.thread.getState().messages.map((m) =>
    m.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(""),
  );

const makeThreadListAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [
      {
        status: "regular" as const,
        remoteId: "thread-a",
        externalId: "thread-a",
        title: "Thread A",
      },
      {
        status: "regular" as const,
        remoteId: "thread-b",
        externalId: "thread-b",
        title: "Thread B",
      },
    ],
  })),
  initialize: vi.fn(async () => ({
    remoteId: "thread-new",
    externalId: "thread-new",
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream()),
  fetch: vi.fn(async (threadId) => ({
    status: "regular" as const,
    remoteId: threadId,
    externalId: threadId,
  })),
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("useStreamRuntime thread options", () => {
  it("keeps stream options isolated between mounted threads", async () => {
    mockUseStream.mockReturnValue(createMockStream());
    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    const threadListAdapter = makeThreadListAdapter();

    const TestRuntime = () => {
      const runtime = useStreamRuntime({
        apiUrl: "/api",
        unstable_threadListAdapter: threadListAdapter,
      } as never);
      capture.runtime = runtime;
      return <AssistantRuntimeProvider runtime={runtime} />;
    };

    const view = render(<TestRuntime />);

    await act(async () => {
      await capture.runtime!.threads.switchToThread("thread-a");
    });

    const threadAOptions = mockUseStream.mock.calls
      .map(([options]) => options as { threadId?: string | null })
      .findLast((options) => options.threadId === "thread-a");
    expect(threadAOptions).toBeDefined();

    await act(async () => {
      await capture.runtime!.threads.switchToThread("thread-b");
    });

    const threadBOptions = mockUseStream.mock.calls
      .map(([options]) => options as { threadId?: string | null })
      .findLast((options) => options.threadId === "thread-b");
    expect(threadBOptions).toBeDefined();
    expect(threadAOptions).not.toBe(threadBOptions);
    expect(threadAOptions?.threadId).toBe("thread-a");

    view.unmount();
  });

  it("renders before initialization and submits with the initialized thread id", async () => {
    const stream = createMockStream();
    mockUseStream.mockReturnValue(stream);
    const initialization = deferred<{
      remoteId: string;
      externalId: string;
    }>();
    const threadListAdapter = makeThreadListAdapter();
    threadListAdapter.list = vi.fn(async () => ({ threads: [] }));
    threadListAdapter.initialize = vi.fn(() => initialization.promise);

    const capture: {
      runtime: AssistantRuntime | null;
      aui?: ReturnType<typeof useAui>;
    } = { runtime: null };
    const Capture = () => {
      capture.aui = useAui();
      return null;
    };
    const TestRuntime = () => {
      const runtime = useStreamRuntime({
        apiUrl: "/api",
        unstable_threadListAdapter: threadListAdapter,
      } as never);
      capture.runtime = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Capture />
        </AssistantRuntimeProvider>
      );
    };

    const view = render(<TestRuntime />);
    await waitFor(() => expect(capture.aui).toBeDefined());

    await act(async () => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
      });
      await Promise.resolve();
    });

    expect(stream.submit).not.toHaveBeenCalled();
    expect(getText(capture.aui!)).toEqual(["hello"]);

    await act(async () => {
      initialization.resolve({ remoteId: "thread-b", externalId: "thread-b" });
    });

    await waitFor(() =>
      expect(stream.submit).toHaveBeenCalledWith(
        {
          messages: [
            expect.objectContaining({
              id: expect.any(String),
              type: "human",
              content: "hello",
            }),
          ],
        },
        { threadId: "thread-b" },
      ),
    );

    stream.messages = [message("echo-hello", "human", "hello")];
    view.rerender(<TestRuntime />);
    await waitFor(() => {
      expect(getText(capture.aui!)).toEqual(["hello"]);
      expect(capture.aui!.thread.getState().messages).toHaveLength(1);
    });
    view.unmount();
  });

  it("omits the threadId override when initialization yields no external id", async () => {
    const stream = createMockStream();
    mockUseStream.mockReturnValue(stream);
    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    const TestRuntime = () => {
      const runtime = useStreamRuntime({ apiUrl: "/api" } as never);
      capture.runtime = runtime;
      return <AssistantRuntimeProvider runtime={runtime} />;
    };
    const view = render(<TestRuntime />);
    await waitFor(() => expect(capture.runtime).not.toBeNull());

    await act(async () => {
      await capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "one" }],
      });
    });
    await act(async () => {
      await capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "two" }],
      });
    });

    expect(stream.submit).toHaveBeenCalledTimes(2);
    for (const call of stream.submit.mock.calls) {
      expect(call[1]).not.toHaveProperty("threadId");
    }
    view.unmount();
  });

  it.each(["initialization", "submit"] as const)(
    "removes the staged message when %s fails",
    async (failurePoint) => {
      const stream = createMockStream();
      mockUseStream.mockReturnValue(stream);
      const initialization = deferred<{
        remoteId: string;
        externalId: string;
      }>();
      const threadListAdapter = makeThreadListAdapter();
      threadListAdapter.list = vi.fn(async () => ({ threads: [] }));
      threadListAdapter.initialize = vi.fn(() => initialization.promise);

      const capture: {
        runtime: AssistantRuntime | null;
        aui?: ReturnType<typeof useAui>;
      } = { runtime: null };
      const Capture = () => {
        capture.aui = useAui();
        return null;
      };
      const TestRuntime = () => {
        const runtime = useStreamRuntime({
          apiUrl: "/api",
          unstable_threadListAdapter: threadListAdapter,
        } as never);
        capture.runtime = runtime;
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            <Capture />
          </AssistantRuntimeProvider>
        );
      };

      const view = render(<TestRuntime />);
      await waitFor(() => expect(capture.aui).toBeDefined());

      if (failurePoint === "submit") {
        stream.submit.mockRejectedValueOnce(new Error("submit failed"));
      }

      const core = (
        capture.runtime!.thread as unknown as {
          __internal_threadBinding: {
            getState(): { append(message: AppendMessage): Promise<void> };
          };
        }
      ).__internal_threadBinding.getState();
      let appendPromise!: Promise<void>;
      await act(async () => {
        appendPromise = core.append({
          role: "user",
          content: [{ type: "text", text: "failed" }],
          parentId: null,
          sourceId: null,
          runConfig: undefined,
          attachments: [],
          metadata: { custom: {} },
          createdAt: new Date(0),
        });
        await Promise.resolve();
      });
      const appendResult = appendPromise.then(
        () => undefined,
        (error: unknown) => error,
      );
      expect(getText(capture.aui!)).toEqual(["failed"]);

      await act(async () => {
        if (failurePoint === "initialization") {
          initialization.reject(new Error("initialize failed"));
        } else {
          initialization.resolve({
            remoteId: "thread-failed",
            externalId: "thread-failed",
          });
        }
      });
      await expect(appendResult).resolves.toMatchObject({
        message:
          failurePoint === "initialization"
            ? "initialize failed"
            : "submit failed",
      });
      await waitFor(() => expect(getText(capture.aui!)).toEqual([]));
      if (failurePoint === "initialization") {
        expect(stream.submit).not.toHaveBeenCalled();
      } else {
        expect(stream.submit).toHaveBeenCalledTimes(1);
      }
      view.unmount();
    },
  );
});

describe("useStreamRuntime run configuration", () => {
  it("preserves custom configuration for automatic tool-result resumes", async () => {
    const stream = createMockStream();
    const { auiResult, rerender } = renderAui(stream);

    await act(async () => {
      await auiResult.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
        runConfig: { custom: { model_name: "gpt-5.4-nano" } },
      });
    });

    stream.messages = [
      {
        id: "assistant-1",
        _getType: () => "ai",
        content: "",
        tool_calls: [{ id: "tool-1", name: "lookup", args: {} }],
      },
    ];
    rerender();

    await waitFor(() => {
      expect(auiResult.current.thread.getState().messages).toContainEqual(
        expect.objectContaining({
          id: "assistant-1",
          content: expect.arrayContaining([
            expect.objectContaining({
              type: "tool-call",
              toolCallId: "tool-1",
            }),
          ]),
        }),
      );
    });

    act(() => {
      auiResult.current.thread
        .message({ id: "assistant-1" })
        .part({ toolCallId: "tool-1" })
        .addToolResult({ answer: 42 });
    });
    await waitFor(() => expect(stream.submit).toHaveBeenCalledTimes(2));

    const config = { config: { configurable: { model_name: "gpt-5.4-nano" } } };
    expect(stream.submit).toHaveBeenNthCalledWith(
      1,
      {
        messages: [
          expect.objectContaining({ type: "human", content: "hello" }),
        ],
      },
      config,
    );
    expect(stream.submit).toHaveBeenNthCalledWith(
      2,
      {
        messages: [
          {
            type: "tool",
            name: "lookup",
            tool_call_id: "tool-1",
            content: JSON.stringify({ answer: 42 }),
            status: "success",
          },
        ],
      },
      config,
    );
  });

  it("inherits custom configuration through exposed resume helpers", async () => {
    const stream = createMockStream();
    mockUseStream.mockReturnValue(stream);
    const capture: {
      runtime: AssistantRuntime | null;
      respond?: ReturnType<typeof useLangChainRespond>;
      respondAll?: ReturnType<typeof useLangChainRespondAll>;
      sendCommand?: ReturnType<typeof useLangChainSendCommand>;
    } = { runtime: null };

    const Capture = () => {
      capture.respond = useLangChainRespond();
      capture.respondAll = useLangChainRespondAll();
      capture.sendCommand = useLangChainSendCommand();
      return null;
    };
    Capture.displayName = "Capture";

    const TestRuntime = () => {
      const runtime = useStreamRuntime({ apiUrl: "/api" } as never);
      capture.runtime = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Capture />
        </AssistantRuntimeProvider>
      );
    };
    TestRuntime.displayName = "TestRuntime";

    const view = render(<TestRuntime />);
    await waitFor(() => expect(capture.respond).toBeDefined());

    await act(async () => {
      await capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
        runConfig: { custom: { model_name: "gpt-5.4-nano" } },
      });
    });

    const config = { config: { configurable: { model_name: "gpt-5.4-nano" } } };
    await act(async () => {
      await capture.respond!({ approved: true });
      await capture.respondAll!({ "interrupt-1": { approved: true } });
      await capture.sendCommand!({ resume: "continue" });
    });

    expect(stream.respond).toHaveBeenCalledWith({ approved: true }, config);
    expect(stream.respondAll).toHaveBeenCalledWith(
      { "interrupt-1": { approved: true } },
      config,
    );
    expect(stream.submit).toHaveBeenLastCalledWith(null, {
      command: { resume: "continue" },
      ...config,
    });
    view.unmount();
  });

  it("keeps a delayed tool result on the run that produced it", async () => {
    const stream = createMockStream();
    const { auiResult, rerender } = renderAui(stream);

    await act(async () => {
      await auiResult.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "first" }],
        runConfig: { custom: { model_name: "model-a" } },
      });
    });

    stream.messages = [
      {
        id: "assistant-1",
        _getType: () => "ai",
        content: "",
        tool_calls: [{ id: "tool-1", name: "lookup", args: {} }],
      },
    ];
    rerender();
    await waitFor(() => {
      expect(auiResult.current.thread.getState().messages).toContainEqual(
        expect.objectContaining({ id: "assistant-1" }),
      );
    });

    await act(async () => {
      await auiResult.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "second" }],
        runConfig: { custom: { model_name: "model-b" } },
      });
    });

    act(() => {
      auiResult.current.thread
        .message({ id: "assistant-1" })
        .part({ toolCallId: "tool-1" })
        .addToolResult({ answer: 42 });
    });
    await waitFor(() => expect(stream.submit).toHaveBeenCalledTimes(3));

    expect(stream.submit).toHaveBeenLastCalledWith(
      {
        messages: [
          {
            type: "tool",
            name: "lookup",
            tool_call_id: "tool-1",
            content: JSON.stringify({ answer: 42 }),
            status: "success",
          },
        ],
      },
      { config: { configurable: { model_name: "model-a" } } },
    );
  });

  it("does not let a caller-supplied resume config replace the recorded configurable", async () => {
    const stream = createMockStream();
    mockUseStream.mockReturnValue(stream);
    const capture: {
      runtime: AssistantRuntime | null;
      aui?: ReturnType<typeof useAui>;
      submit?: ReturnType<typeof useLangChainSubmit>;
    } = { runtime: null };

    const Capture = () => {
      capture.aui = useAui();
      capture.submit = useLangChainSubmit();
      return null;
    };
    Capture.displayName = "Capture";

    const TestRuntime = () => {
      const runtime = useStreamRuntime({ apiUrl: "/api" } as never);
      capture.runtime = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Capture />
        </AssistantRuntimeProvider>
      );
    };
    TestRuntime.displayName = "TestRuntime";

    const view = render(<TestRuntime />);
    await waitFor(() => expect(capture.submit).toBeDefined());

    await act(async () => {
      await capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
        runConfig: { custom: { model_name: "gpt-5.4-nano" } },
      });
    });

    await act(async () => {
      await capture.submit!(null, { command: { resume: "continue" } });
      await capture.submit!(null, {
        command: { resume: "continue" },
        config: { recursion_limit: 5 },
      });
    });

    stream.messages = [
      {
        id: "assistant-1",
        _getType: () => "ai",
        content: "",
        tool_calls: [{ id: "tool-1", name: "lookup", args: {} }],
      },
    ];
    view.rerender(<TestRuntime />);
    await waitFor(() => {
      expect(capture.aui!.thread.getState().messages).toContainEqual(
        expect.objectContaining({ id: "assistant-1" }),
      );
    });

    act(() => {
      capture
        .aui!.thread.message({ id: "assistant-1" })
        .part({ toolCallId: "tool-1" })
        .addToolResult({ answer: 42 });
    });
    await waitFor(() => expect(stream.submit).toHaveBeenCalledTimes(4));

    expect(stream.submit).toHaveBeenNthCalledWith(2, null, {
      command: { resume: "continue" },
      config: { configurable: { model_name: "gpt-5.4-nano" } },
    });
    expect(stream.submit).toHaveBeenNthCalledWith(3, null, {
      command: { resume: "continue" },
      config: { recursion_limit: 5 },
    });
    expect(stream.submit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ tool_call_id: "tool-1" }),
        ]),
      }),
      { config: { configurable: { model_name: "gpt-5.4-nano" } } },
    );
    view.unmount();
  });

  it("does not inject the recorded config into a raw new-run submit", async () => {
    const stream = createMockStream();
    mockUseStream.mockReturnValue(stream);
    const capture: {
      runtime: AssistantRuntime | null;
      send?: ReturnType<typeof useLangChainSend>;
    } = { runtime: null };

    const Capture = () => {
      capture.send = useLangChainSend();
      return null;
    };
    Capture.displayName = "Capture";

    const TestRuntime = () => {
      const runtime = useStreamRuntime({ apiUrl: "/api" } as never);
      capture.runtime = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Capture />
        </AssistantRuntimeProvider>
      );
    };
    TestRuntime.displayName = "TestRuntime";

    const view = render(<TestRuntime />);
    await waitFor(() => expect(capture.send).toBeDefined());

    await act(async () => {
      await capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
        runConfig: { custom: { model_name: "gpt-5.4-nano" } },
      });
    });

    await act(async () => {
      await capture.send!([{ type: "human", content: "next" }]);
    });

    expect(stream.submit).toHaveBeenLastCalledWith(
      { messages: [{ type: "human", content: "next" }] },
      undefined,
    );
    view.unmount();
  });
});

describe("useStreamRuntime staged messages", () => {
  it("stages a new user message without submitting when startRun is false", async () => {
    const stream = createMockStream([message("u1", "human", "earlier")]);
    const { auiResult } = renderAui(stream);

    await act(async () => {
      auiResult.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "draft" }],
        startRun: false,
      });
    });

    await waitFor(() => {
      expect(getText(auiResult.current)).toEqual(["earlier", "draft"]);
    });
    expect(stream.submit).not.toHaveBeenCalled();
  });

  it("keeps a staged edit truncated when stream messages update before promotion", async () => {
    const stream = createMockStream([
      message("u1", "human", "first"),
      message("a1", "ai", "first answer"),
      message("u2", "human", "second"),
    ]);
    const { auiResult, rerender } = renderAui(stream);

    await act(async () => {
      auiResult.current.thread.append({
        role: "user",
        parentId: "u1",
        content: [{ type: "text", text: "edited" }],
        startRun: false,
      });
    });

    await waitFor(() => {
      expect(getText(auiResult.current)).toEqual(["first", "edited"]);
    });

    stream.messages = [
      message("u1", "human", "first"),
      message("a1", "ai", "first answer from refresh"),
      message("u2", "human", "second from refresh"),
    ];
    rerender();

    await waitFor(() => {
      expect(getText(auiResult.current)).toEqual(["first", "edited"]);
    });
    expect(stream.submit).not.toHaveBeenCalled();
  });

  it("does not resurrect a staged draft that an edit already truncated", async () => {
    const stream = createMockStream([
      message("u1", "human", "first"),
      message("a1", "ai", "first answer"),
      message("u2", "human", "second"),
    ]);
    const { auiResult, rerender } = renderAui(stream);

    await act(async () => {
      auiResult.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "draft" }],
        startRun: false,
      });
    });
    await waitFor(() => {
      expect(getText(auiResult.current)).toEqual([
        "first",
        "first answer",
        "second",
        "draft",
      ]);
    });

    await act(async () => {
      auiResult.current.thread.append({
        role: "user",
        parentId: "u1",
        content: [{ type: "text", text: "edited" }],
        startRun: false,
      });
    });
    await waitFor(() => {
      expect(getText(auiResult.current)).toEqual(["first", "edited"]);
    });

    stream.messages = [
      message("u1", "human", "first"),
      message("a1", "ai", "first answer from refresh"),
      message("u2", "human", "second from refresh"),
    ];
    rerender();

    await waitFor(() => {
      expect(getText(auiResult.current)).toEqual(["first", "edited"]);
    });
    expect(stream.submit).not.toHaveBeenCalled();
  });

  it("keeps later staged messages visible after promoting one staged parent", async () => {
    const stream = createMockStream([message("u1", "human", "earlier")]);
    const { auiResult, rerender } = renderAui(stream);

    await act(async () => {
      auiResult.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "first staged" }],
        startRun: false,
      });
      auiResult.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "second staged" }],
        startRun: false,
      });
    });

    await waitFor(() => {
      expect(getText(auiResult.current)).toEqual([
        "earlier",
        "first staged",
        "second staged",
      ]);
    });

    const firstStagedId = auiResult.current.thread.getState().messages[1]!.id;
    await act(async () => {
      await auiResult.current.thread.startRun({
        parentId: firstStagedId,
        sourceId: null,
        runConfig: {},
      });
    });

    expect(stream.submit).toHaveBeenCalledWith(
      {
        messages: [
          expect.objectContaining({
            id: firstStagedId,
            type: "human",
            content: "first staged",
          }),
        ],
      },
      undefined,
    );

    stream.messages = [
      message("u1", "human", "earlier"),
      message(firstStagedId, "human", "first staged"),
      message("a1", "ai", "answer"),
    ];
    rerender();

    await waitFor(() => {
      expect(getText(auiResult.current)).toEqual([
        "earlier",
        "first staged",
        "answer",
        "second staged",
      ]);
    });
  });
});
