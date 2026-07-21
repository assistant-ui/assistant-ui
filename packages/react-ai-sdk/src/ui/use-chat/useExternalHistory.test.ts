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
    threadListItem: Object.assign(
      () => ({ getState: () => ({ remoteId: "remote-1" }) }),
      { source: {} },
    ),
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
    const reportTelemetry = vi.fn();
    const load = vi
      .fn()
      .mockResolvedValue(options?.loadMessages ?? { messages: [] });
    const formattedAdapter = {
      load,
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
        options?.toThreadMessages ?? (() => []),
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

    const step = (partial: {
      isRunning?: boolean;
      messages?: ThreadMessage[];
    }) =>
      act(async () => {
        if (partial.messages !== undefined) messages = partial.messages;
        if (partial.isRunning !== undefined) isRunning = partial.isRunning;
        listener?.();
      });

    return { append, update, reportTelemetry, load, runCycle, flush, step };
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
