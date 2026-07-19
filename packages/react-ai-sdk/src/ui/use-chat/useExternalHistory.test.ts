// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { bindExternalStoreMessage } from "@assistant-ui/core";
import type {
  AssistantRuntime,
  MessageFormatAdapter,
  MessageFormatRepository,
  ThreadAssistantMessage,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";

vi.mock("@assistant-ui/store", () => ({
  useAui: () => ({
    threadListItem: Object.assign(() => null, { source: undefined }),
  }),
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
  type InnerMessage = { id: string; parts: string[] };

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
  ): ThreadMessage => {
    const message: ThreadAssistantMessage = {
      id: "assistant-a",
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

  const createPersistenceHarness = (supportsUpdate: boolean) => {
    const append = vi.fn(
      async (_item: { parentId: string | null; message: InnerMessage }) => {},
    );
    const update = vi.fn(
      async (
        _item: { parentId: string | null; message: InnerMessage },
        _localMessageId: string,
      ) => {},
    );
    const reportTelemetry = vi.fn();
    const formattedAdapter = {
      load: vi.fn().mockResolvedValue({ messages: [] }),
      append,
      reportTelemetry,
      ...(supportsUpdate ? { update } : {}),
    };
    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn(),
      append: vi.fn(),
      withFormat: vi.fn().mockReturnValue(formattedAdapter),
    };

    let listener: (() => void) | undefined;
    let isRunning = false;
    let messages: ThreadMessage[] = [];
    const getState = vi.fn(() => ({ isRunning, messages }));
    const thread = {
      subscribe: (nextListener: () => void) => {
        listener = nextListener;
        return () => {};
      },
      getState,
      import: vi.fn(),
      export: vi.fn(() => ({ headId: null, messages: [] })),
    } as unknown as AssistantRuntime["thread"];
    const persistenceRuntimeRef = {
      current: { thread } as AssistantRuntime,
    };

    renderHook(() =>
      useExternalHistory(
        persistenceRuntimeRef,
        historyAdapter,
        () => [],
        persistenceStorageFormat,
        () => {},
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

    return { append, update, reportTelemetry, runCycle, flush };
  };

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
  });
});
