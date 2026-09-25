// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { bindExternalStoreMessage } from "@assistant-ui/core";
import type {
  AssistantRuntime,
  MessageFormatAdapter,
  MessageFormatRepository,
  ThreadAssistantMessage,
  ThreadHistoryAdapter,
  ThreadMessage,
  RespondToToolApprovalOptions,
  Unstable_ToolInteractionLog,
} from "@assistant-ui/core";

const mocks = vi.hoisted(() => ({
  remoteId: undefined as string | undefined,
  hasThreadListItem: false,
  listeners: new Set<() => void>(),
}));

const auiClient = {
  threadListItem: {
    get source() {
      return mocks.hasThreadListItem ? "threads" : null;
    },
    getState: () => ({ remoteId: mocks.remoteId }),
  },
  subscribe: (listener: () => void) => {
    mocks.listeners.add(listener);
    return () => {
      mocks.listeners.delete(listener);
    };
  },
};

vi.mock("@assistant-ui/store", () => ({
  useAui: () => auiClient,
}));

import { MessageRepository } from "@assistant-ui/core/internal";
import {
  toExportedMessageRepository,
  useExternalHistory,
} from "./useExternalHistory";

const noopThread = {
  subscribe: () => () => {},
  getState: () => ({ isRunning: false, messages: [] }),
  import: () => {},
  export: () => ({ headId: null, messages: [] }),
} as unknown as AssistantRuntime["thread"];

const runtimeRef = {
  current: { thread: noopThread } as AssistantRuntime,
};

const storageFormat: MessageFormatAdapter<unknown, Record<string, unknown>> = {
  format: "test",
  encode: (item) => ({ data: item.message }),
  decode: (stored) => ({
    parentId: stored.parent_id,
    message: stored.content,
  }),
  getId: () => "id",
};

const toThreadMessages = (_messages: unknown[]): ThreadMessage[] => [];
const onSetMessages = () => {};

describe("useExternalHistory withFormat contract", () => {
  beforeEach(() => {
    mocks.remoteId = undefined;
    mocks.hasThreadListItem = false;
    mocks.listeners.clear();
  });

  it("throws when the adapter omits withFormat", () => {
    const adapterWithoutWithFormat: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({ headId: null, messages: [] }),
      append: vi.fn().mockResolvedValue(undefined),
    };

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      renderHook(() =>
        useExternalHistory(
          runtimeRef,
          adapterWithoutWithFormat,
          toThreadMessages,
          storageFormat,
          onSetMessages,
        ),
      ),
    ).toThrow(/withFormat/);

    errorSpy.mockRestore();
  });

  it("does not throw when no adapter is supplied", () => {
    expect(() =>
      renderHook(() =>
        useExternalHistory(
          runtimeRef,
          undefined,
          toThreadMessages,
          storageFormat,
          onSetMessages,
        ),
      ),
    ).not.toThrow();
  });

  it("accepts an adapter that implements withFormat", () => {
    const withFormatResult = {
      load: vi.fn().mockResolvedValue({ headId: null, messages: [] }),
      append: vi.fn().mockResolvedValue(undefined),
    };
    const adapter: ThreadHistoryAdapter = {
      load: vi.fn(),
      append: vi.fn(),
      withFormat: vi.fn().mockReturnValue(withFormatResult),
    };

    expect(() =>
      renderHook(() =>
        useExternalHistory(
          runtimeRef,
          adapter,
          toThreadMessages,
          storageFormat,
          onSetMessages,
        ),
      ),
    ).not.toThrow();

    expect(adapter.withFormat).toHaveBeenCalledWith(storageFormat);
  });

  it("loads history when threadListItem.remoteId appears after the first paint", async () => {
    const load = vi.fn().mockResolvedValue({ headId: null, messages: [] });
    const adapter: ThreadHistoryAdapter = {
      load: vi.fn(),
      append: vi.fn(),
      withFormat: vi.fn().mockReturnValue({
        load,
        append: vi.fn().mockResolvedValue(undefined),
      }),
    };

    const { rerender } = renderHook(() =>
      useExternalHistory(
        runtimeRef,
        adapter,
        toThreadMessages,
        storageFormat,
        onSetMessages,
      ),
    );

    await act(async () => {});
    expect(load).not.toHaveBeenCalled();

    mocks.hasThreadListItem = true;
    mocks.remoteId = "remote-thread";
    await act(async () => {
      for (const listener of mocks.listeners) listener();
    });
    rerender();

    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  });

  it("loads when a mounted thread later receives a remoteId", async () => {
    mocks.hasThreadListItem = true;
    let resolveLoad!: (repo: MessageFormatRepository<unknown>) => void;
    const load = vi.fn(
      () =>
        new Promise<MessageFormatRepository<unknown>>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const adapter: ThreadHistoryAdapter = {
      load: vi.fn(),
      append: vi.fn(),
      withFormat: vi.fn().mockReturnValue({
        load,
        append: vi.fn().mockResolvedValue(undefined),
      }),
    };

    const { result } = renderHook(() =>
      useExternalHistory(
        runtimeRef,
        adapter,
        toThreadMessages,
        storageFormat,
        onSetMessages,
      ),
    );

    await act(async () => {});
    expect(load).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);

    mocks.remoteId = "remote-thread";
    await act(async () => {
      for (const listener of mocks.listeners) listener();
    });

    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      resolveLoad({ headId: null, messages: [] });
    });
  });

  it("does not load history when remoteId appears during an active run", async () => {
    mocks.hasThreadListItem = true;
    const load = vi.fn().mockResolvedValue({ headId: null, messages: [] });
    const adapter: ThreadHistoryAdapter = {
      load: vi.fn(),
      append: vi.fn(),
      withFormat: vi.fn().mockReturnValue({
        load,
        append: vi.fn().mockResolvedValue(undefined),
      }),
    };
    const runningRuntimeRef = {
      current: {
        thread: {
          subscribe: () => () => {},
          getState: () => ({ isRunning: true, messages: [{ id: "u1" }] }),
          import: () => {},
          export: () => ({ headId: null, messages: [] }),
        },
      } as unknown as AssistantRuntime,
    };

    renderHook(() =>
      useExternalHistory(
        runningRuntimeRef,
        adapter,
        toThreadMessages,
        storageFormat,
        onSetMessages,
      ),
    );

    await act(async () => {});
    expect(load).not.toHaveBeenCalled();

    mocks.remoteId = "remote-thread";
    await act(async () => {
      for (const listener of mocks.listeners) listener();
    });

    await act(async () => {});
    expect(load).not.toHaveBeenCalled();
  });

  it("reports loading before an asynchronous history load settles", async () => {
    mocks.hasThreadListItem = true;
    mocks.remoteId = "remote-thread";
    let resolveLoad!: (repo: MessageFormatRepository<unknown>) => void;
    const load = vi.fn(
      () =>
        new Promise<MessageFormatRepository<unknown>>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const adapter: ThreadHistoryAdapter = {
      load: vi.fn(),
      append: vi.fn(),
      withFormat: vi.fn().mockReturnValue({
        load,
        append: vi.fn().mockResolvedValue(undefined),
      }),
    };

    const { result } = renderHook(() =>
      useExternalHistory(
        runtimeRef,
        adapter,
        toThreadMessages,
        storageFormat,
        onSetMessages,
      ),
    );

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    await act(async () => {
      resolveLoad({ headId: null, messages: [] });
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("loads from a replacement history adapter", async () => {
    mocks.hasThreadListItem = true;
    mocks.remoteId = "remote-thread";
    const firstLoad = vi.fn().mockResolvedValue({ headId: null, messages: [] });
    const secondLoad = vi
      .fn()
      .mockResolvedValue({ headId: null, messages: [] });
    const createAdapter = (load: typeof firstLoad): ThreadHistoryAdapter => ({
      load: vi.fn(),
      append: vi.fn(),
      withFormat: vi.fn().mockReturnValue({
        load,
        append: vi.fn().mockResolvedValue(undefined),
      }),
    });
    let adapter = createAdapter(firstLoad);

    const { rerender } = renderHook(() =>
      useExternalHistory(
        runtimeRef,
        adapter,
        toThreadMessages,
        storageFormat,
        onSetMessages,
      ),
    );

    await waitFor(() => expect(firstLoad).toHaveBeenCalledTimes(1));

    adapter = createAdapter(secondLoad);
    rerender();

    await waitFor(() => expect(secondLoad).toHaveBeenCalledTimes(1));
  });

  it("ignores a load that settles after the history adapter is replaced", async () => {
    mocks.hasThreadListItem = true;
    mocks.remoteId = "remote-thread";
    let resolveFirstLoad!: (repo: MessageFormatRepository<unknown>) => void;
    const firstLoad = vi.fn(
      () =>
        new Promise<MessageFormatRepository<unknown>>((resolve) => {
          resolveFirstLoad = resolve;
        }),
    );
    const secondLoad = vi
      .fn()
      .mockResolvedValue({ headId: null, messages: [] });
    const createAdapter = (load: typeof secondLoad): ThreadHistoryAdapter => ({
      load: vi.fn(),
      append: vi.fn(),
      withFormat: vi.fn().mockReturnValue({
        load,
        append: vi.fn().mockResolvedValue(undefined),
      }),
    });
    const firstAdapter = createAdapter(firstLoad);
    const secondAdapter = createAdapter(secondLoad);
    const importMessages = vi.fn();
    const staleLoadRuntimeRef = {
      current: {
        thread: {
          ...noopThread,
          import: importMessages,
        },
      } as unknown as AssistantRuntime,
    };

    const Harness = ({
      adapter,
      settlePreviousLoad,
      onReplacementCommit,
    }: {
      adapter: ThreadHistoryAdapter;
      settlePreviousLoad: boolean;
      onReplacementCommit?: () => void;
    }) => {
      useLayoutEffect(() => {
        if (!settlePreviousLoad) return;
        resolveFirstLoad({
          headId: "stale",
          messages: [{ parentId: null, message: { id: "stale" } }],
        });
        onReplacementCommit?.();
      }, [onReplacementCommit, settlePreviousLoad]);

      useExternalHistory(
        staleLoadRuntimeRef,
        adapter,
        toThreadMessages,
        storageFormat,
        onSetMessages,
      );
      return null;
    };
    const container = document.createElement("div");
    const root = createRoot(container);
    onTestFinished(async () => {
      await act(async () => root.unmount());
    });

    await act(async () => {
      root.render(
        createElement(Harness, {
          adapter: firstAdapter,
          settlePreviousLoad: false,
        }),
      );
    });

    await waitFor(() => expect(firstLoad).toHaveBeenCalledTimes(1));

    let replacementCommitted!: () => void;
    const replacementCommit = new Promise<void>((resolve) => {
      replacementCommitted = resolve;
    });
    root.render(
      createElement(Harness, {
        adapter: secondAdapter,
        settlePreviousLoad: true,
        onReplacementCommit: replacementCommitted,
      }),
    );

    await replacementCommit;
    expect(importMessages).not.toHaveBeenCalled();

    await act(async () => {});
    await waitFor(() => expect(secondLoad).toHaveBeenCalledTimes(1));
  });
});

describe("toExportedMessageRepository", () => {
  const convert = (items: { id: string; ok: boolean }[]): ThreadMessage[] =>
    items[0]!.ok ? [{ id: items[0]!.id } as ThreadMessage] : [];

  it("drops a malformed row together with its now-orphaned descendants", () => {
    const repo: MessageFormatRepository<{ id: string; ok: boolean }> = {
      headId: "c",
      messages: [
        { parentId: null, message: { id: "a", ok: true } },
        { parentId: "a", message: { id: "b", ok: false } },
        { parentId: "b", message: { id: "c", ok: true } },
      ],
    };

    const result = toExportedMessageRepository(convert, repo);

    expect(result.messages.map((m) => m.message.id)).toEqual(["a"]);
    expect(result.headId).toBeNull();
    expect(() => new MessageRepository().import(result)).not.toThrow();
  });

  it("drops a headId that points at a filtered row", () => {
    const repo: MessageFormatRepository<{ id: string; ok: boolean }> = {
      headId: "b",
      messages: [
        { parentId: null, message: { id: "a", ok: true } },
        { parentId: "a", message: { id: "b", ok: false } },
      ],
    };

    const result = toExportedMessageRepository(convert, repo);

    expect(result.messages.map((m) => m.message.id)).toEqual(["a"]);
    expect(result.headId).toBeNull();
    expect(() => new MessageRepository().import(result)).not.toThrow();
  });

  it("drops a malformed root and its entire subtree", () => {
    const repo: MessageFormatRepository<{ id: string; ok: boolean }> = {
      headId: "b",
      messages: [
        { parentId: null, message: { id: "a", ok: false } },
        { parentId: "a", message: { id: "b", ok: true } },
      ],
    };

    const result = toExportedMessageRepository(convert, repo);

    expect(result.messages).toHaveLength(0);
    expect(result.headId).toBeNull();
    expect(() => new MessageRepository().import(result)).not.toThrow();
  });
});

describe("useExternalHistory persistence", () => {
  beforeEach(() => {
    mocks.remoteId = undefined;
    mocks.hasThreadListItem = false;
    mocks.listeners.clear();
  });

  type InnerMessage = {
    id: string;
    parts: unknown[];
    role?: string;
    metadata?: Record<string, unknown>;
  };

  const persistenceStorageFormat: MessageFormatAdapter<
    InnerMessage,
    Record<string, unknown>
  > = {
    format: "test",
    encode: (item) => ({ data: item.message }),
    decode: (stored) => ({
      parentId: stored.parent_id,
      message: stored.content as unknown as InnerMessage,
    }),
    getId: (message) => message.id,
  };

  const createAssistantMessage = (
    status: ThreadAssistantMessage["status"],
    innerMessages: InnerMessage[],
    id = "assistant-a",
  ): ThreadMessage => {
    const message: ThreadAssistantMessage = {
      id,
      role: "assistant",
      content: [],
      createdAt: new Date(),
      status,
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    };
    bindExternalStoreMessage(message, innerMessages);
    return message;
  };

  const createPersistenceHarness = (
    supportsUpdate: boolean,
    options?: {
      loadMessages?: MessageFormatRepository<InnerMessage>;
      toThreadMessages?: (messages: InnerMessage[]) => ThreadMessage[];
      initialIsRunning?: boolean;
      onSetMessages?: (messages: InnerMessage[]) => void;
      toolArtifacts?: Map<string, unknown>;
      onToolArtifactsRestored?: () => void;
      toolInteractions?: Map<string, Unstable_ToolInteractionLog>;
      onToolInteractionsRestored?: () => void;
      toolApprovalResponses?: Map<string, RespondToToolApprovalOptions>;
      onToolApprovalResponsesRestored?: () => void;
    },
  ) => {
    const append = vi.fn(
      async (_item: { parentId: string | null; message: InnerMessage }) => {},
    );
    const update = vi.fn(
      async (
        _item: { parentId: string | null; message: InnerMessage },
        _localMessageId: string,
      ) => {},
    );
    const deleteItems = vi.fn(
      async (
        _items: { parentId: string | null; message: InnerMessage }[],
      ) => {},
    );
    const reportTelemetry = vi.fn();
    const load = vi
      .fn()
      .mockResolvedValue(options?.loadMessages ?? { messages: [] });
    const formattedAdapter = {
      load,
      append,
      delete: deleteItems,
      reportTelemetry,
      ...(supportsUpdate ? { update } : {}),
    };
    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn(),
      append: vi.fn(),
      withFormat: vi.fn().mockReturnValue(formattedAdapter),
    };

    let listener: (() => void) | undefined;
    let isRunning = options?.initialIsRunning ?? false;
    let messages: ThreadMessage[] = [];
    const getState = vi.fn(() => ({ isRunning, messages }));
    const importMessages = vi.fn();
    const thread = {
      subscribe: (nextListener: () => void) => {
        listener = nextListener;
        return () => {};
      },
      getState,
      import: importMessages,
      export: vi.fn(() => ({ headId: null, messages: [] })),
    } as unknown as AssistantRuntime["thread"];
    const persistenceRuntimeRef = {
      current: { thread } as AssistantRuntime,
    };

    mocks.hasThreadListItem = true;
    mocks.remoteId = "remote-thread";

    const { result, unmount } = renderHook(() =>
      useExternalHistory(
        persistenceRuntimeRef,
        historyAdapter,
        options?.toThreadMessages ?? (() => []),
        persistenceStorageFormat,
        options?.onSetMessages ?? (() => {}),
        options?.toolArtifacts,
        options?.onToolArtifactsRestored,
        options?.toolInteractions,
        options?.onToolInteractionsRestored,
        options?.toolApprovalResponses,
        options?.onToolApprovalResponsesRestored,
      ),
    );

    const runCycle = async (nextMessages: ThreadMessage[]) => {
      await act(async () => {
        messages = nextMessages;
        isRunning = true;
        listener?.();
      });
      await act(async () => {
        isRunning = false;
        listener?.();
      });
    };

    const flush = () =>
      act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

    const step = (partial: {
      isRunning?: boolean;
      messages?: ThreadMessage[];
    }) =>
      act(async () => {
        if (partial.messages !== undefined) messages = partial.messages;
        if (partial.isRunning !== undefined) isRunning = partial.isRunning;
        listener?.();
      });

    return {
      append,
      update,
      deleteItems,
      formattedAdapter,
      importMessages,
      deleteMessage: result.current.deleteMessage,
      reportTelemetry,
      load,
      persistToolInteractions: result.current.persistToolInteractions,
      persistToolApprovalResponses: result.current.persistToolApprovalResponses,
      runCycle,
      flush,
      step,
      unmount,
    };
  };

  it("clears tool data and invokes restore callbacks when loaded history is empty", async () => {
    const toolArtifacts = new Map<string, unknown>([
      ["call-1", { preview: "72°F and sunny" }],
    ]);
    const toolInteractions = new Map<string, Unstable_ToolInteractionLog>([
      ["call-1", { entries: [{ type: "action", occurredAt: 1, payload: {} }] }],
    ]);
    const toolApprovalResponses = new Map<string, RespondToToolApprovalOptions>(
      [["approval-1", { approvalId: "approval-1", approved: true }]],
    );
    const onToolArtifactsRestored = vi.fn();
    const onToolInteractionsRestored = vi.fn();
    const onToolApprovalResponsesRestored = vi.fn();
    const { importMessages, load } = createPersistenceHarness(false, {
      loadMessages: { messages: [] },
      toolArtifacts,
      onToolArtifactsRestored,
      toolInteractions,
      onToolInteractionsRestored,
      toolApprovalResponses,
      onToolApprovalResponsesRestored,
    });

    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    expect(toolArtifacts).toEqual(new Map());
    expect(toolInteractions).toEqual(new Map());
    expect(toolApprovalResponses).toEqual(new Map());
    expect(onToolArtifactsRestored).toHaveBeenCalledOnce();
    expect(onToolInteractionsRestored).toHaveBeenCalledOnce();
    expect(onToolApprovalResponsesRestored).toHaveBeenCalledOnce();
    expect(importMessages).not.toHaveBeenCalled();
  });

  it("persists a message that lands while the thread is idle", async () => {
    const { append, step } = createPersistenceHarness(false);
    const message = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "spoken-1", parts: ["spoken"] }],
    );

    await step({ messages: [message] });

    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));
    expect(append).toHaveBeenCalledWith({
      parentId: null,
      message: { id: "spoken-1", parts: ["spoken"] },
    });
  });

  it("does not persist loaded messages again when the history adapter changes", async () => {
    const innerMessage: InnerMessage = {
      id: "inner-a",
      role: "assistant",
      parts: ["answer"],
    };
    const message = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [innerMessage],
    );
    const firstFormattedAdapter = {
      load: vi.fn().mockResolvedValue({
        headId: "inner-a",
        messages: [{ parentId: null, message: innerMessage }],
      }),
      append: vi.fn().mockResolvedValue(undefined),
      reportTelemetry: vi.fn(),
    };
    const secondFormattedAdapter = {
      load: vi.fn().mockResolvedValue({ headId: null, messages: [] }),
      append: vi.fn().mockResolvedValue(undefined),
      reportTelemetry: vi.fn(),
    };
    const createAdapter = (formattedAdapter: {
      load: typeof firstFormattedAdapter.load;
      append: typeof firstFormattedAdapter.append;
      reportTelemetry: typeof firstFormattedAdapter.reportTelemetry;
    }): ThreadHistoryAdapter => ({
      load: vi.fn(),
      append: vi.fn(),
      withFormat: vi.fn().mockReturnValue(formattedAdapter),
    });
    let historyAdapter = createAdapter(firstFormattedAdapter);
    let messages: ThreadMessage[] = [];
    const thread = {
      subscribe: () => () => {},
      getState: () => ({ isRunning: false, messages }),
      import: vi.fn(),
      export: vi.fn(() => ({ headId: null, messages: [] })),
    } as unknown as AssistantRuntime["thread"];
    const loadedRuntimeRef = {
      current: { thread } as AssistantRuntime,
    };

    mocks.hasThreadListItem = true;
    mocks.remoteId = "remote-thread";

    const { rerender } = renderHook(() =>
      useExternalHistory(
        loadedRuntimeRef,
        historyAdapter,
        () => [message],
        persistenceStorageFormat,
        () => {},
      ),
    );

    await waitFor(() =>
      expect(firstFormattedAdapter.load).toHaveBeenCalledTimes(1),
    );

    messages = [message];
    historyAdapter = createAdapter(secondFormattedAdapter);
    rerender();
    await act(async () => {
      await Promise.resolve();
    });

    expect(secondFormattedAdapter.load).not.toHaveBeenCalled();
    expect(secondFormattedAdapter.append).not.toHaveBeenCalled();
    expect(secondFormattedAdapter.reportTelemetry).not.toHaveBeenCalled();
  });

  it("updates stored tool artifacts without mutating chat messages", async () => {
    const toolArtifacts = new Map<string, unknown>();
    const { append, update, runCycle } = createPersistenceHarness(true, {
      toolArtifacts,
    });
    const innerMessage: InnerMessage = {
      id: "inner-a",
      role: "assistant",
      parts: [
        {
          type: "tool-weather",
          toolCallId: "call-1",
          state: "output-available",
          input: { city: "New York" },
          output: { temperature: 72 },
        },
      ],
    };
    const content: ThreadAssistantMessage["content"] = [
      {
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "weather",
        args: { city: "New York" },
        argsText: '{"city":"New York"}',
        result: { temperature: 72 },
        isError: false,
      },
    ];
    const message = Object.assign(
      createAssistantMessage({ type: "complete", reason: "stop" }, [
        innerMessage,
      ]),
      { content },
    );

    await runCycle([message]);
    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));
    expect(append).toHaveBeenCalledWith({
      parentId: null,
      message: innerMessage,
    });

    toolArtifacts.set("call-1", { preview: "72°F and sunny" });
    await runCycle([message]);

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        {
          parentId: null,
          message: {
            ...innerMessage,
            metadata: {
              __aui_toolArtifacts: {
                "call-1": { preview: "72°F and sunny" },
              },
            },
          },
        },
        "inner-a",
      ),
    );
    expect(innerMessage.metadata).toBeUndefined();
  });

  it("keeps tool artifacts out of run telemetry", async () => {
    const toolArtifacts = new Map<string, unknown>([
      ["call-1", { preview: "72°F and sunny" }],
    ]);
    const { append, load, reportTelemetry, runCycle } =
      createPersistenceHarness(false, { toolArtifacts });
    const innerMessage: InnerMessage = {
      id: "inner-a",
      role: "assistant",
      parts: [
        {
          type: "tool-weather",
          toolCallId: "call-1",
          state: "output-available",
        },
      ],
    };
    const message = Object.assign(
      createAssistantMessage({ type: "complete", reason: "stop" }, [
        innerMessage,
      ]),
      {
        content: [
          {
            type: "tool-call" as const,
            toolCallId: "call-1",
            toolName: "weather",
            args: {},
            argsText: "{}",
            result: { temperature: 72 },
            isError: false,
          },
        ],
      },
    );

    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    toolArtifacts.set("call-1", { preview: "72°F and sunny" });

    await runCycle([message]);

    await waitFor(() => expect(reportTelemetry).toHaveBeenCalledTimes(1));
    expect(append.mock.calls[0]?.[0].message).toHaveProperty(
      "metadata.__aui_toolArtifacts",
    );
    expect(reportTelemetry.mock.calls[0]?.[0]).toEqual([
      { parentId: null, message: innerMessage },
    ]);
  });

  it("keeps tool interactions and approval responses out of run telemetry", async () => {
    const toolInteractions = new Map<string, Unstable_ToolInteractionLog>([
      [
        "call-1",
        {
          entries: [
            {
              type: "action",
              occurredAt: 1,
              payload: { refresh: true },
            },
          ],
        },
      ],
    ]);
    const toolApprovalResponses = new Map<string, RespondToToolApprovalOptions>(
      [
        [
          "approval-1",
          { approvalId: "approval-1", approved: true, reason: "Approved" },
        ],
      ],
    );
    const { append, load, reportTelemetry, runCycle } =
      createPersistenceHarness(false, {
        toolInteractions,
        toolApprovalResponses,
      });
    const innerMessage: InnerMessage = {
      id: "inner-a",
      role: "assistant",
      parts: [
        {
          type: "tool-weather",
          toolCallId: "call-1",
          state: "output-available",
        },
        {
          type: "tool-deploy",
          toolCallId: "call-2",
          state: "approval-requested",
          approval: { id: "approval-1" },
        },
      ],
    };
    const message = Object.assign(
      createAssistantMessage({ type: "complete", reason: "stop" }, [
        innerMessage,
      ]),
      {
        content: [
          {
            type: "tool-call" as const,
            toolCallId: "call-1",
            toolName: "weather",
            args: {},
            argsText: "{}",
            result: { temperature: 72 },
            isError: false,
          },
          {
            type: "tool-call" as const,
            toolCallId: "call-2",
            toolName: "deploy",
            args: {},
            argsText: "{}",
            result: undefined,
            isError: false,
            approval: { id: "approval-1" },
          },
        ],
      },
    );

    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    toolInteractions.set("call-1", {
      entries: [
        {
          type: "action",
          occurredAt: 1,
          payload: { refresh: true },
        },
      ],
    });
    toolApprovalResponses.set("approval-1", {
      approvalId: "approval-1",
      approved: true,
      reason: "Approved",
    });

    await runCycle([message]);

    await waitFor(() => expect(reportTelemetry).toHaveBeenCalledTimes(1));
    expect(append.mock.calls[0]?.[0].message).toMatchObject({
      metadata: {
        __aui_toolInteractions: { "call-1": toolInteractions.get("call-1") },
        __aui_toolApprovalResponses: {
          "approval-1": { approved: true, reason: "Approved" },
        },
      },
    });
    expect(reportTelemetry.mock.calls[0]?.[0]).toEqual([
      { parentId: null, message: innerMessage },
    ]);
  });

  it("stores host approval responses with the first message write", async () => {
    const toolApprovalResponses = new Map<string, RespondToToolApprovalOptions>(
      [
        [
          "approval-1",
          {
            approvalId: "approval-1",
            approved: true,
            optionId: "allow-once",
            text: "Staging only",
            reason: "Approved by operator",
          },
        ],
      ],
    );
    const { append, load, runCycle } = createPersistenceHarness(false, {
      toolApprovalResponses,
    });
    const innerMessage: InnerMessage = {
      id: "inner-a",
      role: "assistant",
      parts: [
        {
          type: "tool-deploy",
          toolCallId: "call-1",
          state: "approval-requested",
          approval: { id: "approval-1" },
        },
      ],
    };
    const message = Object.assign(
      createAssistantMessage({ type: "complete", reason: "stop" }, [
        innerMessage,
      ]),
      {
        content: [
          {
            type: "tool-call" as const,
            toolCallId: "call-1",
            toolName: "deploy",
            args: {},
            argsText: "{}",
            result: undefined,
            isError: false,
            approval: { id: "approval-1" },
          },
        ],
      },
    );

    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    toolApprovalResponses.set("approval-1", {
      approvalId: "approval-1",
      approved: true,
      optionId: "allow-once",
      text: "Staging only",
      reason: "Approved by operator",
    });

    await runCycle([message]);

    await waitFor(() =>
      expect(append).toHaveBeenCalledWith({
        parentId: null,
        message: {
          ...innerMessage,
          metadata: {
            __aui_toolApprovalResponses: {
              "approval-1": {
                approved: true,
                optionId: "allow-once",
                text: "Staging only",
                reason: "Approved by operator",
              },
            },
          },
        },
      }),
    );
    expect(innerMessage.metadata).toBeUndefined();
  });

  it("logs and retries a failed host approval response update after a settled run", async () => {
    const toolApprovalResponses = new Map<
      string,
      RespondToToolApprovalOptions
    >();
    const { append, update, persistToolApprovalResponses, runCycle } =
      createPersistenceHarness(true, { toolApprovalResponses });
    const innerMessage: InnerMessage = {
      id: "inner-a",
      role: "assistant",
      parts: [
        {
          type: "tool-deploy",
          toolCallId: "call-1",
          state: "approval-requested",
          approval: { id: "approval-1" },
        },
      ],
    };
    const message = Object.assign(
      createAssistantMessage({ type: "complete", reason: "stop" }, [
        innerMessage,
      ]),
      {
        content: [
          {
            type: "tool-call" as const,
            toolCallId: "call-1",
            toolName: "deploy",
            args: {},
            argsText: "{}",
            result: undefined,
            isError: false,
            approval: { id: "approval-1" },
          },
        ],
      },
    );

    await runCycle([message]);
    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));

    toolApprovalResponses.set("approval-1", {
      approvalId: "approval-1",
      approved: false,
      reason: "Not now",
    });
    const failure = new Error("storage unavailable");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    update.mockRejectedValueOnce(failure);

    try {
      await act(async () => {
        await persistToolApprovalResponses("inner-a");
      });

      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to persist tool data:",
        failure,
      );
      await act(async () => {
        await persistToolApprovalResponses("inner-a");
      });

      expect(update).toHaveBeenCalledTimes(2);
      expect(update).toHaveBeenLastCalledWith(
        {
          parentId: null,
          message: {
            ...innerMessage,
            metadata: {
              __aui_toolApprovalResponses: {
                "approval-1": { approved: false, reason: "Not now" },
              },
            },
          },
        },
        "inner-a",
      );
      expect(append).toHaveBeenCalledTimes(1);
      expect(innerMessage.metadata).toBeUndefined();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("stores tool interactions with the first message write", async () => {
    const toolInteractions = new Map<string, Unstable_ToolInteractionLog>([
      [
        "call-1",
        {
          entries: [
            {
              type: "action",
              occurredAt: 1,
              payload: { refresh: true },
            },
          ],
        },
      ],
    ]);
    const { append, load, runCycle } = createPersistenceHarness(false, {
      toolArtifacts: new Map(),
      toolInteractions,
    });
    const innerMessage: InnerMessage = {
      id: "inner-a",
      role: "assistant",
      parts: [
        {
          type: "tool-weather",
          toolCallId: "call-1",
          state: "output-available",
        },
      ],
    };
    const message = Object.assign(
      createAssistantMessage({ type: "complete", reason: "stop" }, [
        innerMessage,
      ]),
      {
        content: [
          {
            type: "tool-call" as const,
            toolCallId: "call-1",
            toolName: "weather",
            args: {},
            argsText: "{}",
            result: { temperature: 72 },
            isError: false,
          },
        ],
      },
    );

    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    toolInteractions.set("call-1", {
      entries: [
        {
          type: "action",
          occurredAt: 1,
          payload: { refresh: true },
        },
      ],
    });

    await runCycle([message]);

    await waitFor(() =>
      expect(append).toHaveBeenCalledWith({
        parentId: null,
        message: {
          ...innerMessage,
          metadata: {
            __aui_toolInteractions: {
              "call-1": toolInteractions.get("call-1"),
            },
          },
        },
      }),
    );
    expect(innerMessage.metadata).toBeUndefined();
  });

  it("leaves stored rows unchanged without tool artifacts", async () => {
    const toolArtifacts = new Map<string, unknown>();
    const { append, runCycle } = createPersistenceHarness(false, {
      toolArtifacts,
    });
    const innerMessage = { id: "inner-a", parts: ["answer"] };
    const message = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [innerMessage],
    );

    await runCycle([message]);

    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));
    expect(append).toHaveBeenCalledWith({
      parentId: null,
      message: innerMessage,
    });
    expect(append.mock.calls[0]?.[0].message).toBe(innerMessage);
  });

  it("logs and retries a failed tool interaction update after a settled run", async () => {
    const toolInteractions = new Map<string, Unstable_ToolInteractionLog>();
    const { append, update, persistToolInteractions, runCycle } =
      createPersistenceHarness(true, { toolInteractions });
    const initialInnerMessage: InnerMessage = {
      id: "inner-a",
      role: "assistant",
      parts: [
        {
          type: "tool-weather",
          toolCallId: "call-1",
          state: "output-available",
        },
      ],
    };
    const createMessage = (innerMessage: InnerMessage) =>
      Object.assign(
        createAssistantMessage({ type: "complete", reason: "stop" }, [
          innerMessage,
        ]),
        {
          content: [
            {
              type: "tool-call" as const,
              toolCallId: "call-1",
              toolName: "weather",
              args: {},
              argsText: "{}",
              result: undefined,
              isError: false,
            },
          ],
        },
      );

    await runCycle([createMessage(initialInnerMessage)]);
    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));

    const log: Unstable_ToolInteractionLog = {
      entries: [
        {
          type: "human-response",
          occurredAt: 2,
          payload: "yes",
        },
      ],
    };
    toolInteractions.set("call-1", log);
    const failure = new Error("storage unavailable");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    update.mockRejectedValueOnce(failure);

    try {
      await act(async () => {
        await persistToolInteractions("assistant-a");
      });

      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to persist tool data:",
        failure,
      );
      await act(async () => {
        await persistToolInteractions("assistant-a");
      });

      expect(update).toHaveBeenCalledTimes(2);
      expect(update).toHaveBeenLastCalledWith(
        {
          parentId: null,
          message: {
            ...initialInnerMessage,
            metadata: {
              __aui_toolInteractions: { "call-1": log },
            },
          },
        },
        "inner-a",
      );
      expect(append).toHaveBeenCalledTimes(1);

      const rewrittenInnerMessage = {
        ...initialInnerMessage,
        parts: [...initialInnerMessage.parts, { type: "text", text: "done" }],
      };
      await runCycle([createMessage(rewrittenInnerMessage)]);

      await waitFor(() =>
        expect(update).toHaveBeenLastCalledWith(
          {
            parentId: null,
            message: {
              ...rewrittenInnerMessage,
              metadata: {
                __aui_toolInteractions: { "call-1": log },
              },
            },
          },
          "inner-a",
        ),
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("leaves stored rows unchanged without tool artifacts or interactions", async () => {
    const toolArtifacts = new Map<string, unknown>();
    const toolInteractions = new Map<string, Unstable_ToolInteractionLog>();
    const { append, runCycle } = createPersistenceHarness(false, {
      toolArtifacts,
      toolInteractions,
    });
    const innerMessage = {
      id: "inner-a",
      parts: [
        {
          type: "tool-weather",
          toolCallId: "call-1",
          state: "output-available",
        },
      ],
    };
    const message = Object.assign(
      createAssistantMessage({ type: "complete", reason: "stop" }, [
        innerMessage,
      ]),
      {
        content: [
          {
            type: "tool-call" as const,
            toolCallId: "call-1",
            toolName: "weather",
            args: {},
            argsText: "{}",
            result: undefined,
            isError: false,
          },
        ],
      },
    );

    await runCycle([message]);

    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));
    expect(append).toHaveBeenCalledWith({
      parentId: null,
      message: innerMessage,
    });
    expect(append.mock.calls[0]?.[0].message).toBe(innerMessage);
  });

  it("restores stored tool interactions without returning metadata to the chat", async () => {
    const toolInteractions = new Map<string, Unstable_ToolInteractionLog>();
    const onSetMessages = vi.fn();
    const log: Unstable_ToolInteractionLog = {
      entries: [
        {
          type: "human-response",
          occurredAt: 3,
          payload: "yes",
        },
      ],
    };
    const storedMessage: InnerMessage = {
      id: "inner-a",
      role: "assistant",
      parts: [
        {
          type: "tool-weather",
          toolCallId: "call-1",
          state: "output-available",
        },
      ],
      metadata: {
        __aui_toolInteractions: { "call-1": log },
      },
    };
    const { importMessages, load } = createPersistenceHarness(true, {
      loadMessages: {
        messages: [{ parentId: null, message: storedMessage }],
      },
      toThreadMessages: (messages) =>
        messages.map((message) => {
          const tool = message.parts[0] as { toolCallId: string };
          const converted = createAssistantMessage(
            { type: "complete", reason: "stop" },
            [message],
            message.id,
          ) as ThreadAssistantMessage;
          return Object.assign(converted, {
            content: [
              {
                type: "tool-call" as const,
                toolCallId: tool.toolCallId,
                toolName: "weather",
                args: {},
                argsText: "{}",
                result: undefined,
                isError: false,
                unstable_interactions: toolInteractions.get(tool.toolCallId),
              },
            ],
          });
        }),
      onSetMessages,
      toolInteractions,
    });

    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(importMessages).toHaveBeenCalledTimes(1));

    const imported = importMessages.mock.calls[0]?.[0] as {
      messages: { message: ThreadMessage }[];
    };
    expect(imported.messages[0]?.message.content[0]).toMatchObject({
      type: "tool-call",
      toolCallId: "call-1",
      unstable_interactions: log,
    });
    expect(toolInteractions.get("call-1")).toEqual(log);
    expect(onSetMessages.mock.calls[0]?.[0][0]).not.toHaveProperty(
      "metadata.__aui_toolInteractions",
    );
  });

  it("restores host approval responses without returning metadata to the chat", async () => {
    const toolApprovalResponses = new Map<
      string,
      RespondToToolApprovalOptions
    >();
    const onSetMessages = vi.fn();
    const storedMessage: InnerMessage = {
      id: "inner-a",
      role: "assistant",
      parts: [
        {
          type: "tool-deploy",
          toolCallId: "call-1",
          state: "approval-requested",
          approval: { id: "approval-1" },
        },
      ],
      metadata: {
        __aui_toolApprovalResponses: {
          "approval-1": {
            approved: true,
            optionId: "allow-once",
            text: "Staging only",
            reason: "Approved by operator",
          },
        },
      },
    };
    const { importMessages, load } = createPersistenceHarness(true, {
      loadMessages: {
        messages: [{ parentId: null, message: storedMessage }],
      },
      toThreadMessages: (messages) =>
        messages.map((message) => {
          const tool = message.parts[0] as {
            toolCallId: string;
            approval: { id: string };
          };
          const response = toolApprovalResponses.get(tool.approval.id);
          const converted = createAssistantMessage(
            { type: "complete", reason: "stop" },
            [message],
            message.id,
          ) as ThreadAssistantMessage;
          return Object.assign(converted, {
            content: [
              {
                type: "tool-call" as const,
                toolCallId: tool.toolCallId,
                toolName: "deploy",
                args: {},
                argsText: "{}",
                result: undefined,
                isError: false,
                approval: {
                  id: tool.approval.id,
                  ...(response && { approved: response.approved }),
                  ...(response?.optionId && { optionId: response.optionId }),
                  ...(response?.text && { text: response.text }),
                  ...(response?.reason && { reason: response.reason }),
                },
              },
            ],
          });
        }),
      onSetMessages,
      toolApprovalResponses,
    });

    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(importMessages).toHaveBeenCalledTimes(1));

    const imported = importMessages.mock.calls[0]?.[0] as {
      messages: { message: ThreadMessage }[];
    };
    expect(imported.messages[0]?.message.content[0]).toMatchObject({
      type: "tool-call",
      toolCallId: "call-1",
      approval: {
        id: "approval-1",
        approved: true,
        optionId: "allow-once",
        text: "Staging only",
        reason: "Approved by operator",
      },
    });
    expect(toolApprovalResponses.get("approval-1")).toEqual({
      approvalId: "approval-1",
      approved: true,
      optionId: "allow-once",
      text: "Staging only",
      reason: "Approved by operator",
    });
    expect(onSetMessages.mock.calls[0]?.[0][0]).not.toHaveProperty(
      "metadata.__aui_toolApprovalResponses",
    );
  });

  it("restores stored tool artifacts without returning metadata to the chat", async () => {
    const toolArtifacts = new Map<string, unknown>();
    const onSetMessages = vi.fn();
    const storedMessage: InnerMessage = {
      id: "inner-a",
      role: "assistant",
      parts: [
        {
          type: "tool-weather",
          toolCallId: "call-1",
          state: "output-available",
          input: { city: "New York" },
          output: { temperature: 72 },
        },
      ],
      metadata: {
        __aui_toolArtifacts: {
          "call-1": { preview: "72°F and sunny" },
        },
      },
    };
    const { importMessages, load } = createPersistenceHarness(true, {
      loadMessages: {
        messages: [{ parentId: null, message: storedMessage }],
      },
      toThreadMessages: (messages) =>
        messages.map((message) => {
          const tool = message.parts[0] as { toolCallId: string };
          const converted = createAssistantMessage(
            { type: "complete", reason: "stop" },
            [message],
            message.id,
          ) as ThreadAssistantMessage;
          return Object.assign(converted, {
            content: [
              {
                type: "tool-call" as const,
                toolCallId: tool.toolCallId,
                toolName: "weather",
                args: { city: "New York" },
                argsText: '{"city":"New York"}',
                result: { temperature: 72 },
                isError: false,
                artifact: toolArtifacts.get(tool.toolCallId),
              },
            ],
          });
        }),
      onSetMessages,
      toolArtifacts,
    });

    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(importMessages).toHaveBeenCalledTimes(1));

    const imported = importMessages.mock.calls[0]?.[0] as {
      messages: { message: ThreadMessage }[];
    };
    expect(imported.messages[0]?.message.content[0]).toMatchObject({
      type: "tool-call",
      toolCallId: "call-1",
      artifact: { preview: "72°F and sunny" },
    });
    expect(toolArtifacts.get("call-1")).toEqual({
      preview: "72°F and sunny",
    });
    expect(onSetMessages.mock.calls[0]?.[0][0]).not.toHaveProperty(
      "metadata.__aui_toolArtifacts",
    );
  });

  it("schedules one idle persistence attempt per landed message when append fails", async () => {
    const { append, step, flush } = createPersistenceHarness(false);
    append.mockRejectedValueOnce(new Error("offline"));
    const first = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "spoken-1", parts: ["first"] }],
      "assistant-a",
    );

    await step({ messages: [first] });
    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));
    await step({ messages: [first] });
    await step({ messages: [first] });
    await flush();
    expect(append).toHaveBeenCalledTimes(1);

    const second = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "spoken-2", parts: ["second"] }],
      "assistant-b",
    );
    await step({ messages: [first, second] });
    await waitFor(() => expect(append).toHaveBeenCalledTimes(3));
    expect(append.mock.calls.map(([item]) => item)).toEqual([
      { parentId: null, message: { id: "spoken-1", parts: ["first"] } },
      { parentId: null, message: { id: "spoken-1", parts: ["first"] } },
      { parentId: "spoken-1", message: { id: "spoken-2", parts: ["second"] } },
    ]);
  });

  it("persists a settled turn when the history adapter becomes active after it", async () => {
    let listener: (() => void) | undefined;
    let isRunning = false;
    let messages: ThreadMessage[] = [];
    const append = vi.fn(async () => {});
    const formattedAdapter = {
      load: vi.fn().mockResolvedValue({ messages: [] }),
      append,
    };
    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn(),
      append: vi.fn(),
      withFormat: vi.fn().mockReturnValue(formattedAdapter),
    };
    let activeAdapter: ThreadHistoryAdapter | undefined;
    const thread = {
      subscribe: (next: () => void) => {
        listener = next;
        return () => {};
      },
      getState: () => ({ isRunning, messages }),
      import: vi.fn(),
      export: vi.fn(() => ({ headId: null, messages: [] })),
    } as unknown as AssistantRuntime["thread"];
    const persistenceRuntimeRef = {
      current: { thread } as AssistantRuntime,
    };
    const message = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "inner-1", parts: ["answer"] }],
    );

    mocks.hasThreadListItem = true;
    mocks.remoteId = "remote-thread";

    const { rerender } = renderHook(() =>
      useExternalHistory(
        persistenceRuntimeRef,
        activeAdapter,
        () => [],
        persistenceStorageFormat,
        () => {},
      ),
    );

    await act(async () => {
      messages = [message];
      isRunning = true;
      listener?.();
      isRunning = false;
      listener?.();
    });

    activeAdapter = historyAdapter;
    await act(async () => rerender());

    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));
    expect(append).toHaveBeenCalledWith({
      parentId: null,
      message: { id: "inner-1", parts: ["answer"] },
    });
  });

  it("persists a turn that is already running when the subscription starts", async () => {
    const { append, step } = createPersistenceHarness(false, {
      initialIsRunning: true,
    });
    const message = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "inner-1", parts: ["answer"] }],
    );

    await step({ isRunning: false, messages: [message] });

    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));
  });

  it("retries a failed append on the next persistence pass", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    onTestFinished(() => consoleError.mockRestore());
    const { append, runCycle, flush } = createPersistenceHarness(false);
    const innerMessage = { id: "inner-a", parts: ["final"] };
    const message = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [innerMessage],
    );
    append.mockRejectedValueOnce(new Error("temporary storage failure"));

    await runCycle([message]);
    await flush();
    expect(append).toHaveBeenCalledTimes(1);

    await runCycle([message]);
    await flush();
    expect(append).toHaveBeenCalledTimes(2);
    expect(append).toHaveBeenLastCalledWith({
      parentId: null,
      message: innerMessage,
    });

    await runCycle([message]);
    await flush();
    expect(append).toHaveBeenCalledTimes(2);
  });

  it("does not replay appends that succeeded before a mid-batch failure", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    onTestFinished(() => consoleError.mockRestore());
    const { append, runCycle, flush } = createPersistenceHarness(false);
    const first = { id: "inner-1", parts: ["first"] };
    const second = { id: "inner-2", parts: ["second"] };
    const message = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [first, second],
    );
    append.mockImplementationOnce(async () => {});
    append.mockRejectedValueOnce(new Error("temporary storage failure"));

    await runCycle([message]);
    await flush();
    expect(append).toHaveBeenCalledTimes(2);

    await runCycle([message]);
    await flush();
    expect(append).toHaveBeenCalledTimes(3);
    expect(append.mock.calls.map((c) => c[0].message.id)).toEqual([
      "inner-1",
      "inner-2",
      "inner-2",
    ]);
  });

  it("persists assistant messages awaiting tool approval when the adapter supports update", async () => {
    const { append, runCycle } = createPersistenceHarness(true);
    const innerMessage = { id: "inner-a", parts: ["pending"] };

    await runCycle([
      createAssistantMessage(
        { type: "requires-action", reason: "tool-calls" },
        [innerMessage],
      ),
    ]);

    await waitFor(() =>
      expect(append).toHaveBeenCalledWith({
        parentId: null,
        message: innerMessage,
      }),
    );
    expect(append).toHaveBeenCalledTimes(1);
  });

  it("keeps paused messages unpersisted when the adapter lacks update", async () => {
    const { append, runCycle, flush } = createPersistenceHarness(false);
    const finalInnerMessage = { id: "inner-a", parts: ["pending", "final"] };

    await runCycle([
      createAssistantMessage(
        { type: "requires-action", reason: "tool-calls" },
        [{ id: "inner-a", parts: ["pending"] }],
      ),
    ]);

    await flush();
    expect(append).not.toHaveBeenCalled();

    await runCycle([
      createAssistantMessage({ type: "complete", reason: "stop" }, [
        finalInnerMessage,
      ]),
    ]);

    await waitFor(() =>
      expect(append).toHaveBeenCalledWith({
        parentId: null,
        message: finalInnerMessage,
      }),
    );
    expect(append).toHaveBeenCalledTimes(1);
  });

  it("updates the previously persisted message when its run completes", async () => {
    const { append, update, runCycle } = createPersistenceHarness(true);
    const pendingInnerMessage = { id: "inner-a", parts: ["pending"] };
    const finalInnerMessage = { id: "inner-a", parts: ["pending", "final"] };

    await runCycle([
      createAssistantMessage(
        { type: "requires-action", reason: "tool-calls" },
        [pendingInnerMessage],
      ),
    ]);
    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));

    await runCycle([
      createAssistantMessage({ type: "complete", reason: "stop" }, [
        finalInnerMessage,
      ]),
    ]);

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        { parentId: null, message: finalInnerMessage },
        "inner-a",
      ),
    );
    expect(append).toHaveBeenCalledTimes(1);
  });

  it("appends continuation inner messages after approval", async () => {
    const { append, update, runCycle } = createPersistenceHarness(true);
    const pendingInnerMessage = { id: "inner-a", parts: ["pending"] };
    const finalInnerMessage = { id: "inner-a", parts: ["pending", "final"] };
    const continuationInnerMessage = { id: "inner-b", parts: ["answer"] };

    await runCycle([
      createAssistantMessage(
        { type: "requires-action", reason: "tool-calls" },
        [pendingInnerMessage],
      ),
    ]);
    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));

    await runCycle([
      createAssistantMessage({ type: "complete", reason: "stop" }, [
        finalInnerMessage,
        continuationInnerMessage,
      ]),
    ]);

    await waitFor(() =>
      expect(append).toHaveBeenCalledWith({
        parentId: "inner-a",
        message: continuationInnerMessage,
      }),
    );
    expect(append.mock.calls.map(([item]) => item.message.id)).toEqual([
      "inner-a",
      "inner-b",
    ]);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      { parentId: null, message: finalInnerMessage },
      "inner-a",
    );
  });

  it("defers run telemetry until the paused message completes", async () => {
    const { reportTelemetry, runCycle, flush } = createPersistenceHarness(true);
    const pendingInnerMessage = { id: "inner-a", parts: ["pending"] };
    const finalInnerMessage = { id: "inner-a", parts: ["pending", "final"] };
    const continuationInnerMessage = { id: "inner-b", parts: ["answer"] };

    await runCycle([
      createAssistantMessage(
        { type: "requires-action", reason: "tool-calls" },
        [pendingInnerMessage],
      ),
    ]);
    await flush();
    expect(reportTelemetry).not.toHaveBeenCalled();

    await runCycle([
      createAssistantMessage({ type: "complete", reason: "stop" }, [
        finalInnerMessage,
        continuationInnerMessage,
      ]),
    ]);
    await flush();

    expect(reportTelemetry).toHaveBeenCalledTimes(1);
    expect(reportTelemetry).toHaveBeenCalledWith(
      [
        { parentId: null, message: finalInnerMessage },
        { parentId: "inner-a", message: continuationInnerMessage },
      ],
      expect.any(Object),
    );
    expect(reportTelemetry.mock.calls[0]![1]).toMatchObject({
      message: expect.objectContaining({
        id: "assistant-a",
        status: { type: "complete", reason: "stop" },
      }),
    });
  });

  it("reports a run that failed before any assistant message", async () => {
    const { append, reportTelemetry, runCycle, flush } =
      createPersistenceHarness(true);
    const failed = createAssistantMessage(
      {
        type: "incomplete",
        reason: "error",
        error: { code: "AI_APICallError", message: "upstream failed" },
      },
      [],
    );

    await runCycle([failed]);
    await flush();

    expect(append).not.toHaveBeenCalled();
    expect(reportTelemetry).toHaveBeenCalledTimes(1);
    expect(reportTelemetry).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ message: failed }),
    );
  });

  it("restores deferred telemetry for reloaded paused messages", async () => {
    const { append, update, reportTelemetry, load, runCycle, flush } =
      createPersistenceHarness(true, {
        loadMessages: {
          messages: [
            {
              parentId: null,
              message: { id: "inner-a", parts: ["pending"] },
            },
          ],
        },
        toThreadMessages: (msgs) => [
          createAssistantMessage(
            { type: "requires-action", reason: "tool-calls" },
            msgs,
          ),
        ],
      });

    await waitFor(() => expect(load).toHaveBeenCalled());
    await flush();

    const finalInnerMessage = { id: "inner-a", parts: ["pending", "final"] };
    const continuationInnerMessage = { id: "inner-b", parts: ["answer"] };

    await runCycle([
      createAssistantMessage({ type: "complete", reason: "stop" }, [
        finalInnerMessage,
        continuationInnerMessage,
      ]),
    ]);
    await flush();

    expect(append).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledWith({
      parentId: "inner-a",
      message: continuationInnerMessage,
    });
    expect(update).toHaveBeenCalledWith(
      { parentId: null, message: finalInnerMessage },
      "inner-a",
    );
    expect(reportTelemetry).toHaveBeenCalledTimes(1);
    expect(reportTelemetry).toHaveBeenCalledWith(
      [
        { parentId: null, message: finalInnerMessage },
        { parentId: "inner-a", message: continuationInnerMessage },
      ],
      expect.any(Object),
    );
  });

  it("serializes overlapping persistence passes", async () => {
    const { append, runCycle, flush } = createPersistenceHarness(true);
    let releaseFirstAppend!: () => void;
    const firstAppend = new Promise<void>((resolve) => {
      releaseFirstAppend = resolve;
    });
    append.mockImplementationOnce(() => firstAppend);

    const message = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "inner-a", parts: ["answer"] }],
    );

    await runCycle([message]);
    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));

    await runCycle([message]);
    await flush();
    const callsWhileFirstAppendWasPending = append.mock.calls.length;

    releaseFirstAppend();
    await flush();
    await flush();

    expect(callsWhileFirstAppendWasPending).toBe(1);
    expect(append).toHaveBeenCalledTimes(1);
  });

  it("preserves telemetry timing for runs queued behind a pending append", async () => {
    const { append, reportTelemetry, step, flush } =
      createPersistenceHarness(false);
    let releaseFirstAppend!: () => void;
    const firstAppend = new Promise<void>((resolve) => {
      releaseFirstAppend = resolve;
    });
    append.mockImplementationOnce(() => firstAppend);

    let now = 0;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => now);
    const firstMessage = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "inner-a", parts: ["first"] }],
      "assistant-a",
    );
    const secondMessage = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "inner-b", parts: ["second"] }],
      "assistant-b",
    );
    const thirdMessage = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "inner-c", parts: ["third"] }],
      "assistant-c",
    );

    try {
      await step({ isRunning: true, messages: [firstMessage] });
      now = 10;
      await step({ isRunning: false });
      await waitFor(() => expect(append).toHaveBeenCalledTimes(1));

      now = 100;
      await step({
        isRunning: true,
        messages: [firstMessage, secondMessage],
      });
      now = 110;
      await step({ isRunning: false });
      await flush();

      now = 200;
      await step({
        isRunning: true,
        messages: [firstMessage, secondMessage, thirdMessage],
      });
      now = 230;
      await step({ isRunning: false });
      await flush();

      releaseFirstAppend();
      await waitFor(() => expect(reportTelemetry).toHaveBeenCalledTimes(3));

      const durations = Object.fromEntries(
        reportTelemetry.mock.calls.map(([items, options]) => [
          items[0]?.message.id,
          options.durationMs,
        ]),
      );
      expect(durations).toEqual({
        "inner-a": 10,
        "inner-b": 10,
        "inner-c": 30,
      });
    } finally {
      releaseFirstAppend();
      nowSpy.mockRestore();
    }
  });

  it("finishes queued persistence passes after unmount", async () => {
    const { append, runCycle, flush, unmount } =
      createPersistenceHarness(false);
    let releaseFirstAppend!: () => void;
    const firstAppend = new Promise<void>((resolve) => {
      releaseFirstAppend = resolve;
    });
    append.mockImplementationOnce(() => firstAppend);

    const firstMessage = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "inner-a", parts: ["first"] }],
      "assistant-a",
    );
    const secondMessage = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "inner-b", parts: ["second"] }],
      "assistant-b",
    );

    await runCycle([firstMessage]);
    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));

    await runCycle([firstMessage, secondMessage]);
    await flush();
    unmount();

    releaseFirstAppend();
    await flush();
    await flush();

    expect(append.mock.calls.map(([item]) => item.message.id)).toEqual([
      "inner-a",
      "inner-b",
    ]);
  });

  it("serializes deletion after pending persistence passes", async () => {
    const { append, deleteItems, deleteMessage, runCycle, flush } =
      createPersistenceHarness(false);
    const events: string[] = [];
    let releaseFirstAppend!: () => void;
    const firstAppend = new Promise<void>((resolve) => {
      releaseFirstAppend = resolve;
    });
    append.mockImplementation(async (item) => {
      events.push(`append:${item.message.id}`);
    });
    append.mockImplementationOnce(async (item) => {
      events.push(`append:${item.message.id}:start`);
      await firstAppend;
      events.push(`append:${item.message.id}:end`);
    });
    deleteItems.mockImplementation(async (items) => {
      events.push(`delete:${items[0]?.message.id}`);
    });

    const firstMessage = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "inner-a", parts: ["first"] }],
      "assistant-a",
    );
    const secondMessage = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "inner-b", parts: ["second"] }],
      "assistant-b",
    );

    try {
      await runCycle([firstMessage]);
      await waitFor(() => expect(append).toHaveBeenCalledTimes(1));

      await runCycle([firstMessage, secondMessage]);
      await flush();
      const deletion = deleteMessage("assistant-a");
      await flush();
      expect(deleteItems).not.toHaveBeenCalled();

      releaseFirstAppend();
      await deletion;

      expect(events).toEqual([
        "append:inner-a:start",
        "append:inner-a:end",
        "append:inner-b",
        "delete:inner-a",
      ]);
    } finally {
      releaseFirstAppend();
    }
  });

  it("uses the requested deletion snapshot after runtime state changes", async () => {
    const { append, deleteItems, deleteMessage, runCycle, flush, step } =
      createPersistenceHarness(false);
    let releaseAppend!: () => void;
    const pendingAppend = new Promise<void>((resolve) => {
      releaseAppend = resolve;
    });
    append.mockImplementationOnce(() => pendingAppend);

    const message = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "inner-a", parts: ["first"] }],
      "assistant-a",
    );

    try {
      await runCycle([message]);
      await waitFor(() => expect(append).toHaveBeenCalledTimes(1));

      const deletion = deleteMessage("assistant-a");
      await step({ messages: [] });
      await flush();
      expect(deleteItems).not.toHaveBeenCalled();

      releaseAppend();
      await deletion;

      expect(deleteItems).toHaveBeenCalledWith([
        {
          parentId: null,
          message: { id: "inner-a", parts: ["first"] },
        },
      ]);
    } finally {
      releaseAppend();
    }
  });

  it("preserves the history adapter receiver during deletion", async () => {
    const { deleteItems, formattedAdapter, deleteMessage, step } =
      createPersistenceHarness(false);
    const message = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "inner-a", parts: ["first"] }],
      "assistant-a",
    );

    await step({ messages: [message] });
    await deleteMessage("assistant-a");

    expect(deleteItems).toHaveBeenCalledOnce();
    expect(deleteItems.mock.contexts[0]).toBe(formattedAdapter);
  });

  it("reports telemetry after retrying a failed append", async () => {
    const { append, reportTelemetry, runCycle, flush } =
      createPersistenceHarness(false);
    append.mockRejectedValueOnce(new Error("temporary storage failure"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const message = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "inner-a", parts: ["answer"] }],
    );

    try {
      await runCycle([message]);
      await waitFor(() => expect(append).toHaveBeenCalledTimes(1));
      await flush();
      expect(reportTelemetry).not.toHaveBeenCalled();

      await runCycle([message]);
      await waitFor(() => expect(append).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(reportTelemetry).toHaveBeenCalledTimes(1));

      expect(reportTelemetry).toHaveBeenCalledWith(
        [{ parentId: null, message: { id: "inner-a", parts: ["answer"] } }],
        expect.any(Object),
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("does not reappend a stored inner message whose outer message was filtered", async () => {
    const innerMessage = { id: "inner-a", parts: ["stored"] };
    const { append, load, runCycle, flush } = createPersistenceHarness(false, {
      loadMessages: {
        messages: [{ parentId: null, message: innerMessage }],
      },
      toThreadMessages: () => [],
    });

    await waitFor(() => expect(load).toHaveBeenCalled());
    await flush();

    await runCycle([
      createAssistantMessage({ type: "complete", reason: "stop" }, [
        innerMessage,
      ]),
    ]);
    await flush();

    expect(append).not.toHaveBeenCalled();
  });

  it("skips unchanged persisted messages on later runs", async () => {
    const { append, update, reportTelemetry, runCycle, flush } =
      createPersistenceHarness(true);
    const completeStatus: ThreadAssistantMessage["status"] = {
      type: "complete",
      reason: "stop",
    };
    const old = createAssistantMessage(
      completeStatus,
      [{ id: "inner-old", parts: ["old"] }],
      "old",
    );
    const active = createAssistantMessage(
      completeStatus,
      [{ id: "inner-active", parts: ["initial"] }],
      "active",
    );
    const tail = createAssistantMessage(
      completeStatus,
      [{ id: "inner-tail", parts: ["tail"] }],
      "tail",
    );

    await runCycle([old, active, tail]);
    await waitFor(() => expect(append).toHaveBeenCalledTimes(3));

    append.mockClear();
    update.mockClear();
    reportTelemetry.mockClear();

    const changedActive = createAssistantMessage(
      completeStatus,
      [{ id: "inner-active", parts: ["completed"] }],
      "active",
    );
    await runCycle([old, changedActive, tail]);
    await flush();

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      {
        parentId: "inner-old",
        message: { id: "inner-active", parts: ["completed"] },
      },
      "inner-active",
    );
    expect(append).not.toHaveBeenCalled();
    expect(reportTelemetry).not.toHaveBeenCalled();
  });

  it("skips updates for a persisted message restored by a branch switch", async () => {
    const { append, update, runCycle, flush } = createPersistenceHarness(true);
    const completeStatus: ThreadAssistantMessage["status"] = {
      type: "complete",
      reason: "stop",
    };
    const createUserMessage = (
      id: string,
      inner: InnerMessage,
    ): ThreadMessage => {
      const message: ThreadMessage = {
        id,
        role: "user",
        content: [{ type: "text", text: "hi" }],
        attachments: [],
        createdAt: new Date(),
        metadata: { custom: {} },
      };
      bindExternalStoreMessage(message, [inner]);
      return message;
    };
    const branchA = () => [
      createUserMessage("user-a", { id: "inner-user-a", parts: ["question"] }),
      createAssistantMessage(
        completeStatus,
        [{ id: "inner-assistant-a", parts: ["answer"] }],
        "assistant-a",
      ),
    ];

    await runCycle(branchA());
    await waitFor(() => expect(append).toHaveBeenCalledTimes(2));

    await runCycle([
      createUserMessage("user-b", { id: "inner-user-b", parts: ["edited"] }),
      createAssistantMessage(
        completeStatus,
        [{ id: "inner-assistant-b", parts: ["answer"] }],
        "assistant-b",
      ),
    ]);
    await waitFor(() => expect(append).toHaveBeenCalledTimes(4));

    append.mockClear();
    update.mockClear();

    await runCycle([
      ...branchA(),
      createUserMessage("user-c", { id: "inner-user-c", parts: ["follow-up"] }),
      createAssistantMessage(
        completeStatus,
        [{ id: "inner-assistant-c", parts: ["answer"] }],
        "assistant-c",
      ),
    ]);
    await flush();

    expect(update).not.toHaveBeenCalled();
    expect(append.mock.calls.map(([item]) => item.message.id)).toEqual([
      "inner-user-c",
      "inner-assistant-c",
    ]);
  });

  it("absorbs agentic flickers without losing change detection", async () => {
    const { append, update, reportTelemetry, runCycle, flush, step } =
      createPersistenceHarness(true);
    const completeStatus: ThreadAssistantMessage["status"] = {
      type: "complete",
      reason: "stop",
    };
    const old = createAssistantMessage(
      completeStatus,
      [{ id: "inner-old", parts: ["old"] }],
      "old",
    );
    const active = createAssistantMessage(
      completeStatus,
      [{ id: "inner-active", parts: ["initial"] }],
      "active",
    );
    const tail = createAssistantMessage(
      completeStatus,
      [{ id: "inner-tail", parts: ["tail"] }],
      "tail",
    );

    await runCycle([old, active, tail]);
    await waitFor(() => expect(append).toHaveBeenCalledTimes(3));

    append.mockClear();
    update.mockClear();
    reportTelemetry.mockClear();

    const changedActive = createAssistantMessage(
      completeStatus,
      [{ id: "inner-active", parts: ["completed"] }],
      "active",
    );
    await step({ isRunning: true });
    await step({ messages: [old, changedActive, tail] });
    await step({ isRunning: false });
    await step({ isRunning: true });
    await step({ isRunning: false });
    await flush();

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith(
      {
        parentId: "inner-old",
        message: { id: "inner-active", parts: ["completed"] },
      },
      "inner-active",
    );
    expect(append).not.toHaveBeenCalled();
    expect(reportTelemetry).not.toHaveBeenCalled();
  });

  it("persists idle-time changes on the next run stop", async () => {
    const { append, update, reportTelemetry, runCycle, flush, step } =
      createPersistenceHarness(true);
    const initialActive = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "inner-a", parts: ["initial"] }],
      "active",
    );

    await runCycle([initialActive]);
    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));

    append.mockClear();
    update.mockClear();
    reportTelemetry.mockClear();

    const changedActive = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "inner-a", parts: ["initial", "tool-result"] }],
      "active",
    );
    await step({ messages: [changedActive] });

    await runCycle([changedActive]);
    await flush();

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      {
        parentId: null,
        message: { id: "inner-a", parts: ["initial", "tool-result"] },
      },
      "inner-a",
    );
    expect(append).not.toHaveBeenCalled();
  });

  it("retries a failed update on the next run", async () => {
    const { append, update, reportTelemetry, runCycle, flush } =
      createPersistenceHarness(true);
    const initialActive = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "inner-a", parts: ["initial"] }],
      "active",
    );

    await runCycle([initialActive]);
    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));

    append.mockClear();
    update.mockClear();
    reportTelemetry.mockClear();
    update.mockRejectedValueOnce(new Error("boom"));

    const changedActive = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "inner-a", parts: ["changed"] }],
      "active",
    );
    const changedMessages = [changedActive];

    await runCycle(changedMessages);
    await flush();
    await runCycle(changedMessages);
    await flush();

    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenNthCalledWith(
      1,
      {
        parentId: null,
        message: { id: "inner-a", parts: ["changed"] },
      },
      "inner-a",
    );
    expect(update).toHaveBeenNthCalledWith(
      2,
      {
        parentId: null,
        message: { id: "inner-a", parts: ["changed"] },
      },
      "inner-a",
    );
    expect(append).not.toHaveBeenCalled();
  });

  it("detects changes on non-assistant messages", async () => {
    const { append, update, runCycle, flush } = createPersistenceHarness(true);
    const makeUserMessage = (inner: InnerMessage): ThreadMessage => {
      const message: ThreadMessage = {
        id: "user-1",
        role: "user",
        content: [{ type: "text", text: "hi" }],
        attachments: [],
        createdAt: new Date(),
        metadata: { custom: {} },
      };
      bindExternalStoreMessage(message, [inner]);
      return message;
    };
    const assistant = createAssistantMessage(
      { type: "complete", reason: "stop" },
      [{ id: "inner-a", parts: ["answer"] }],
    );

    await runCycle([
      makeUserMessage({ id: "inner-user", parts: ["hi"] }),
      assistant,
    ]);
    await waitFor(() => expect(append).toHaveBeenCalledTimes(2));

    append.mockClear();
    update.mockClear();

    await runCycle([
      makeUserMessage({ id: "inner-user", parts: ["hi", "attachment"] }),
      assistant,
    ]);
    await flush();

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      {
        parentId: null,
        message: { id: "inner-user", parts: ["hi", "attachment"] },
      },
      "inner-user",
    );
    expect(append).not.toHaveBeenCalled();
  });
});
